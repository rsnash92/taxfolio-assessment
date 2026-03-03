import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

const JWT_SECRET = process.env.PRACTICE_JWT_SECRET || process.env.PRACTICE_ENCRYPTION_KEY || ''

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64urlDecode(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

function verifyJWT(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const [header, claims, signature] = parts

  const expectedSig = base64url(
    createHmac('sha256', JWT_SECRET).update(`${header}.${claims}`).digest()
  )

  if (signature !== expectedSig) throw new Error('Invalid token signature')

  const payload = JSON.parse(base64urlDecode(claims))

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) throw new Error('Token has expired')

  return payload
}

/**
 * POST /api/agent/validate-token
 * Validates a JWT handoff token from the taxfolio practice dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, clientId, taxYear } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const payload = verifyJWT(token)

    if (payload.type !== 'agent_handoff') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    if (payload.clientId !== clientId || payload.taxYear !== taxYear) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, reference, practice_id')
      .eq('id', clientId)
      .eq('practice_id', payload.practiceId as string)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: payload.userId,
      clientName: client.name,
      clientReference: client.reference,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      return NextResponse.json({ error: 'Token has expired. Please try again from your practice dashboard.' }, { status: 401 })
    }
    console.error('[Agent Token Validation] Error:', error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
}
