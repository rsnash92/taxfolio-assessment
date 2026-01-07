import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSubmissionPreview } from '@/lib/hmrc/preview';

/**
 * POST /api/hmrc/preview
 *
 * Generates a preview of what would be submitted to HMRC
 * Does NOT actually call HMRC APIs - validates and transforms data only
 */
export async function POST() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get wizard progress
    const { data: progress, error: progressError } = await supabase
      .from('wizard_progress')
      .select('wizard_data')
      .eq('user_id', user.id)
      .single();

    if (progressError || !progress?.wizard_data) {
      return NextResponse.json(
        { error: 'No wizard data found. Please complete the assessment first.' },
        { status: 400 }
      );
    }

    // Generate preview
    const preview = generateSubmissionPreview(progress.wizard_data);

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
