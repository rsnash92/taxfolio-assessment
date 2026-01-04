import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch intro data linked to this user
    const { data, error } = await supabase
      .from('intro_leads')
      .select('intent, income_source, filing_experience, situation')
      .eq('user_id', user.id)
      .eq('converted_to_user', true)
      .single()

    if (error) {
      // No intro data found is not an error
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: true, data: null })
      }
      console.error('Failed to fetch intro data:', error)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Intro data fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
