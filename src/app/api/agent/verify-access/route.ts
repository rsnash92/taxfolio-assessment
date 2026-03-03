import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agent/verify-access?clientId=xxx&taxYear=yyy
 * Verifies the current user is a practice member with access to this client.
 * Used when the agent page is accessed without a JWT token (e.g. page refresh).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    const taxYear = request.nextUrl.searchParams.get('taxYear')

    if (!clientId || !taxYear) {
      return NextResponse.json({ error: 'clientId and taxYear are required' }, { status: 400 })
    }

    // Check if user is a practice member
    const { data: membership, error: memberError } = await supabase
      .from('practice_members')
      .select('practice_id, role')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not a practice member' }, { status: 403 })
    }

    // Verify client belongs to this practice
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, reference')
      .eq('id', clientId)
      .eq('practice_id', membership.practice_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({
      clientName: client.name,
      clientReference: client.reference,
    })
  } catch (error) {
    console.error('[Agent Verify Access] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
