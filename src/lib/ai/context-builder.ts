// Context Builder for TaxFolio AI Assistant
// Gathers user's financial data to provide relevant context

import { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_EXPLANATIONS } from './system-prompt'

interface UserContext {
  taxYear: string
  summary: TaxSummary | null
  recentTransactions: TransactionContext[]
  categories: CategorySummary[]
  properties: PropertyContext[]
  accounts: AccountContext[]
}

interface TaxSummary {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  propertyIncome: number
  propertyExpenses: number
  propertyProfit: number
  transactionCount: number
  pendingReviewCount: number
  uncategorisedCount: number
}

interface TransactionContext {
  id: string
  date: string
  description: string
  amount: number
  category: string | null
  categoryCode: string | null
  aiSuggestedCategory: string | null
  reviewStatus: string
}

interface CategorySummary {
  code: string
  name: string
  total: number
  count: number
  explanation: string
}

interface PropertyContext {
  id: string
  name: string
  address: string
  type: string
  ownership: string
}

interface AccountContext {
  id: string
  name: string
  type: string
  lastSynced: string | null
}

export async function buildUserContext(
  supabase: SupabaseClient,
  userId: string,
  taxYear: string
): Promise<UserContext> {
  // Fetch all context data in parallel
  const [
    summaryData,
    recentTxData,
    categorySummary,
    propertiesData,
    accountsData,
  ] = await Promise.all([
    fetchTaxSummary(supabase, userId, taxYear),
    fetchRecentTransactions(supabase, userId, taxYear),
    fetchCategorySummary(supabase, userId, taxYear),
    fetchProperties(supabase, userId),
    fetchAccounts(supabase, userId),
  ])

  return {
    taxYear,
    summary: summaryData,
    recentTransactions: recentTxData,
    categories: categorySummary,
    properties: propertiesData,
    accounts: accountsData,
  }
}

async function fetchTaxSummary(
  supabase: SupabaseClient,
  userId: string,
  taxYear: string
): Promise<TaxSummary | null> {
  try {
    // Get category IDs for filtering
    const { data: categories } = await supabase
      .from('categories')
      .select('id, code')

    const categoryMap = new Map(categories?.map(c => [c.code, c.id]) || [])
    const personalCategoryId = categoryMap.get('personal')
    const transferCategoryId = categoryMap.get('transfer')

    // Income categories (self-employment)
    const incomeCategories = ['income_sales', 'income_other']
      .map(c => categoryMap.get(c))
      .filter(Boolean)

    // Expense categories (self-employment)
    const expenseCategories = [
      'expense_cogs', 'expense_wages', 'expense_subcontractor', 'expense_premises',
      'expense_repairs', 'expense_motor', 'expense_travel', 'expense_advertising',
      'expense_professional', 'expense_finance', 'expense_phone', 'expense_office',
      'expense_other'
    ].map(c => categoryMap.get(c)).filter(Boolean)

    // Property income categories
    const propertyIncomeCategories = ['property_income_rent', 'property_income_other']
      .map(c => categoryMap.get(c))
      .filter(Boolean)

    // Property expense categories
    const propertyExpenseCategories = [
      'property_expense_agent', 'property_expense_insurance', 'property_expense_repairs',
      'property_expense_ground_rent', 'property_expense_council_tax', 'property_expense_utilities',
      'property_expense_legal', 'property_expense_advertising', 'property_expense_travel',
      'property_expense_certificates', 'property_expense_other'
    ].map(c => categoryMap.get(c)).filter(Boolean)

    // Fetch confirmed transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, category_id, review_status, ai_suggested_category_id')
      .eq('user_id', userId)
      .eq('tax_year', taxYear)

    if (!transactions) return null

    // Calculate totals
    let totalIncome = 0
    let totalExpenses = 0
    let propertyIncome = 0
    let propertyExpenses = 0
    let pendingReviewCount = 0
    let uncategorisedCount = 0

    for (const tx of transactions) {
      const categoryId = tx.category_id

      if (tx.review_status === 'pending') {
        pendingReviewCount++
        if (!tx.ai_suggested_category_id) {
          uncategorisedCount++
        }
        continue // Don't include pending in totals
      }

      // Skip personal and transfers
      if (categoryId === personalCategoryId || categoryId === transferCategoryId) {
        continue
      }

      // Self-employment income (negative amounts = money in)
      if (incomeCategories.includes(categoryId)) {
        totalIncome += Math.abs(tx.amount)
      }

      // Self-employment expenses (positive amounts = money out)
      if (expenseCategories.includes(categoryId)) {
        totalExpenses += Math.abs(tx.amount)
      }

      // Property income
      if (propertyIncomeCategories.includes(categoryId)) {
        propertyIncome += Math.abs(tx.amount)
      }

      // Property expenses
      if (propertyExpenseCategories.includes(categoryId)) {
        propertyExpenses += Math.abs(tx.amount)
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      propertyIncome,
      propertyExpenses,
      propertyProfit: propertyIncome - propertyExpenses,
      transactionCount: transactions.length,
      pendingReviewCount,
      uncategorisedCount,
    }
  } catch (error) {
    console.error('[context-builder] Error fetching tax summary:', error)
    return null
  }
}

async function fetchRecentTransactions(
  supabase: SupabaseClient,
  userId: string,
  taxYear: string
): Promise<TransactionContext[]> {
  try {
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id, date, description, amount, review_status,
        category:categories!category_id(name, code),
        ai_suggested_category:categories!ai_suggested_category_id(name, code)
      `)
      .eq('user_id', userId)
      .eq('tax_year', taxYear)
      .order('date', { ascending: false })
      .limit(20)

    return (transactions || []).map(tx => {
      // Supabase returns single relations as objects, arrays for many relations
      const categoryData = tx.category as unknown
      const aiCategoryData = tx.ai_suggested_category as unknown

      // Handle both array and object cases
      const category = Array.isArray(categoryData)
        ? categoryData[0] as { name: string; code: string } | undefined
        : categoryData as { name: string; code: string } | null
      const aiCategory = Array.isArray(aiCategoryData)
        ? aiCategoryData[0] as { name: string; code: string } | undefined
        : aiCategoryData as { name: string; code: string } | null

      return {
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: category?.name || null,
        categoryCode: category?.code || null,
        aiSuggestedCategory: aiCategory?.name || null,
        reviewStatus: tx.review_status,
      }
    })
  } catch (error) {
    console.error('[context-builder] Error fetching recent transactions:', error)
    return []
  }
}

async function fetchCategorySummary(
  supabase: SupabaseClient,
  userId: string,
  taxYear: string
): Promise<CategorySummary[]> {
  try {
    // Get transactions with categories (confirmed only)
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount,
        category:categories!category_id(id, name, code)
      `)
      .eq('user_id', userId)
      .eq('tax_year', taxYear)
      .eq('review_status', 'confirmed')
      .not('category_id', 'is', null)

    if (!transactions) return []

    // Group by category
    const categoryTotals = new Map<string, { name: string; code: string; total: number; count: number }>()

    for (const tx of transactions) {
      // Handle Supabase returning array or object
      const categoryData = tx.category as unknown
      const category = Array.isArray(categoryData)
        ? categoryData[0] as { id: string; name: string; code: string } | undefined
        : categoryData as { id: string; name: string; code: string } | null
      if (!category) continue

      const existing = categoryTotals.get(category.code)
      if (existing) {
        existing.total += Math.abs(tx.amount)
        existing.count++
      } else {
        categoryTotals.set(category.code, {
          name: category.name,
          code: category.code,
          total: Math.abs(tx.amount),
          count: 1,
        })
      }
    }

    // Convert to array and add explanations
    return Array.from(categoryTotals.values()).map(cat => ({
      ...cat,
      explanation: CATEGORY_EXPLANATIONS[cat.code as keyof typeof CATEGORY_EXPLANATIONS] || '',
    }))
  } catch (error) {
    console.error('[context-builder] Error fetching category summary:', error)
    return []
  }
}

async function fetchProperties(
  supabase: SupabaseClient,
  userId: string
): Promise<PropertyContext[]> {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, address_line_1, address_city, property_type, ownership_type')
      .eq('user_id', userId)

    return (properties || []).map(p => ({
      id: p.id,
      name: p.name,
      address: `${p.address_line_1}, ${p.address_city}`,
      type: p.property_type,
      ownership: p.ownership_type,
    }))
  } catch (error) {
    console.error('[context-builder] Error fetching properties:', error)
    return []
  }
}

async function fetchAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountContext[]> {
  try {
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id, account_name, account_type, last_synced')
      .eq('user_id', userId)

    return (accounts || []).map(a => ({
      id: a.id,
      name: a.account_name,
      type: a.account_type,
      lastSynced: a.last_synced,
    }))
  } catch (error) {
    console.error('[context-builder] Error fetching accounts:', error)
    return []
  }
}

// Format context as a string for the AI prompt
export function formatContextForPrompt(context: UserContext): string {
  const lines: string[] = []

  lines.push(`## User's Financial Context for Tax Year ${context.taxYear}`)
  lines.push('')

  // Summary
  if (context.summary) {
    const s = context.summary
    lines.push('### Tax Summary')
    lines.push(`- Total Transactions: ${s.transactionCount}`)
    lines.push(`- Pending Review: ${s.pendingReviewCount}`)
    lines.push(`- Uncategorised: ${s.uncategorisedCount}`)
    lines.push('')
    lines.push('**Self-Employment (SA103):**')
    lines.push(`- Income: £${s.totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
    lines.push(`- Expenses: £${s.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
    lines.push(`- Net Profit: £${s.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
    lines.push('')
    if (s.propertyIncome > 0 || s.propertyExpenses > 0) {
      lines.push('**Property Income (SA105):**')
      lines.push(`- Rental Income: £${s.propertyIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      lines.push(`- Expenses: £${s.propertyExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      lines.push(`- Net Profit: £${s.propertyProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      lines.push('')
    }
  }

  // Category breakdown (top 10 by amount)
  if (context.categories.length > 0) {
    lines.push('### Category Breakdown (Confirmed)')
    const sorted = [...context.categories]
      .filter(c => c.code !== 'personal' && c.code !== 'transfer')
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    for (const cat of sorted) {
      lines.push(`- ${cat.name}: £${cat.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${cat.count} transactions)`)
    }
    lines.push('')
  }

  // Properties
  if (context.properties.length > 0) {
    lines.push('### Rental Properties')
    for (const prop of context.properties) {
      lines.push(`- ${prop.name}: ${prop.address} (${prop.type}, ${prop.ownership})`)
    }
    lines.push('')
  }

  // Accounts
  if (context.accounts.length > 0) {
    lines.push('### Connected Bank Accounts')
    for (const acc of context.accounts) {
      lines.push(`- ${acc.name} (${acc.type})`)
    }
    lines.push('')
  }

  // Recent transactions
  if (context.recentTransactions.length > 0) {
    lines.push('### Recent Transactions (Last 20)')
    for (const tx of context.recentTransactions) {
      const status = tx.reviewStatus === 'confirmed' ? '✓' : '?'
      const cat = tx.category || tx.aiSuggestedCategory || 'Uncategorised'
      const amount = tx.amount >= 0
        ? `-£${tx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
        : `+£${Math.abs(tx.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
      lines.push(`- [${status}] ${tx.date}: ${tx.description} (${amount}) - ${cat}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// Get context for a specific transaction (for "Why was this categorised?" questions)
export async function getTransactionContext(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string
): Promise<string | null> {
  try {
    const { data: tx } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories!category_id(name, code),
        ai_suggested_category:categories!ai_suggested_category_id(name, code)
      `)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (!tx) return null

    const category = tx.category as { name: string; code: string } | null
    const aiCategory = tx.ai_suggested_category as { name: string; code: string } | null

    const categoryCode = category?.code || aiCategory?.code
    const explanation = categoryCode
      ? CATEGORY_EXPLANATIONS[categoryCode as keyof typeof CATEGORY_EXPLANATIONS]
      : null

    const lines = [
      `## Transaction Details`,
      `- Date: ${tx.date}`,
      `- Description: ${tx.description}`,
      `- Merchant: ${tx.merchant_name || 'Unknown'}`,
      `- Amount: £${Math.abs(tx.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${tx.amount >= 0 ? 'expense' : 'income'})`,
      `- Status: ${tx.review_status}`,
      `- Category: ${category?.name || 'Not set'}`,
      `- AI Suggestion: ${aiCategory?.name || 'None'}`,
      `- AI Confidence: ${tx.ai_confidence ? `${(tx.ai_confidence * 100).toFixed(0)}%` : 'N/A'}`,
    ]

    if (explanation) {
      lines.push('')
      lines.push(`## Category Explanation`)
      lines.push(explanation)
    }

    return lines.join('\n')
  } catch (error) {
    console.error('[context-builder] Error fetching transaction context:', error)
    return null
  }
}
