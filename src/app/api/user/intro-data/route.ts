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

    console.log('[Intro Data API] Fetching intro data for user:', user.id)

    // Fetch intro data linked to this user
    // First try with converted_to_user flag
    let { data, error } = await supabase
      .from('intro_leads')
      .select('intent, income_source, income_sources, filing_experience, situation')
      .eq('user_id', user.id)
      .eq('converted_to_user', true)
      .single()

    // If no data found with flag, try without it (in case link didn't set flag)
    if (error?.code === 'PGRST116') {
      console.log('[Intro Data API] No data with converted_to_user=true, trying without flag')
      const result = await supabase
        .from('intro_leads')
        .select('intent, income_source, income_sources, filing_experience, situation')
        .eq('user_id', user.id)
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      // No intro data found is not an error
      if (error.code === 'PGRST116') {
        console.log('[Intro Data API] No intro data found for user')
        return NextResponse.json({ success: true, data: null })
      }
      console.error('[Intro Data API] Failed to fetch intro data:', error)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    console.log('[Intro Data API] Found intro data:', data)

    // Parse income_sources JSON if it exists
    let incomeSources: string[] = []
    if (data?.income_sources) {
      try {
        incomeSources = JSON.parse(data.income_sources)
      } catch {
        // Fallback to single income_source
        if (data.income_source) {
          incomeSources = [data.income_source]
        }
      }
    } else if (data?.income_source) {
      incomeSources = [data.income_source]
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        incomeSources, // Parsed array
      }
    })
  } catch (error) {
    console.error('Intro data fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
