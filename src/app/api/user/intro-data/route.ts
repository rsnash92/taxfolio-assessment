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
      .select('intent, income_source, income_sources, filing_experience, situation')
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
