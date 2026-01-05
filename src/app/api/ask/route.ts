import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { TAXFOLIO_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import {
  buildUserContext,
  formatContextForPrompt,
  getTransactionContext,
} from '@/lib/ai/context-builder'

const anthropic = new Anthropic()

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 50 // 50 questions per hour

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const userLimit = rateLimits.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    // Reset or initialize
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: userLimit.resetAt }
  }

  userLimit.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count, resetAt: userLimit.resetAt }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 60000)
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can ask ${RATE_LIMIT_MAX} questions per hour. Try again in ${resetIn} minutes.`,
          rate_limit: {
            remaining: 0,
            reset_at: rateLimit.resetAt,
          },
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { message, tax_year, transaction_id, history = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 })
    }

    const taxYear = tax_year || getCurrentTaxYear()

    // Build user context
    const userContext = await buildUserContext(supabase, user.id, taxYear)
    const contextString = formatContextForPrompt(userContext)

    // If asking about a specific transaction, add that context
    let transactionContext = ''
    if (transaction_id) {
      const txContext = await getTransactionContext(supabase, user.id, transaction_id)
      if (txContext) {
        transactionContext = `\n\n## Question relates to this specific transaction:\n${txContext}`
      }
    }

    // Build the full system prompt with context
    const fullSystemPrompt = `${TAXFOLIO_SYSTEM_PROMPT}

${contextString}${transactionContext}`

    // Build message history
    const messages: { role: 'user' | 'assistant'; content: string }[] = []

    // Add conversation history (limit to last 10 exchanges)
    const recentHistory = (history as ChatMessage[]).slice(-20)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    })

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: fullSystemPrompt,
      messages,
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      message: assistantMessage,
      rate_limit: {
        remaining: rateLimit.remaining,
        reset_at: rateLimit.resetAt,
      },
    })
  } catch (error) {
    console.error('[ask] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    )
  }
}

// Get suggested questions based on user's data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const taxYear = searchParams.get('tax_year') || getCurrentTaxYear()

    // Get user context to generate relevant suggestions
    const userContext = await buildUserContext(supabase, user.id, taxYear)

    const suggestions: string[] = []

    // Always include general questions
    suggestions.push('What tax do I owe this year?')
    suggestions.push('When is my tax return deadline?')

    // Add context-specific suggestions
    if (userContext.summary) {
      if (userContext.summary.uncategorisedCount > 0) {
        suggestions.push(`Why do I have ${userContext.summary.uncategorisedCount} uncategorised transactions?`)
      }

      if (userContext.summary.pendingReviewCount > 0) {
        suggestions.push('How do I review pending transactions?')
      }

      if (userContext.summary.netProfit > 12570) {
        suggestions.push('How much tax will I pay on my profits?')
      }

      if (userContext.summary.totalExpenses > 0) {
        suggestions.push('Am I claiming all my allowable expenses?')
      }
    }

    // Property-related suggestions
    if (userContext.properties.length > 0) {
      suggestions.push('Can I claim mortgage interest on my rental property?')
      suggestions.push('What property expenses can I deduct?')
    }

    // Self-employment suggestions
    if (userContext.summary && userContext.summary.totalIncome > 0) {
      suggestions.push('Do I need to pay National Insurance?')
      suggestions.push('Can I claim for working from home?')
    }

    // Limit to 6 suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 6)

    return NextResponse.json({
      suggestions: uniqueSuggestions,
      tax_year: taxYear,
    })
  } catch (error) {
    console.error('[ask/suggestions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}

function getCurrentTaxYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  if (month > 4 || (month === 4 && day >= 6)) {
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}
