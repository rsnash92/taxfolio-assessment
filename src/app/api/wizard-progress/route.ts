import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Load wizard progress for current user and tax year
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tax year from query params (default to 2024-25)
    const { searchParams } = new URL(request.url);
    const taxYear = searchParams.get('taxYear') || '2024-25';

    console.log('[Wizard Progress API] Loading progress for user:', user.id, 'tax year:', taxYear);

    // Fetch wizard progress for specific tax year
    const { data, error } = await supabase
      .from('wizard_progress')
      .select('wizard_data, current_step, current_business_id, current_property_id, tax_year, updated_at')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear)
      .single();

    if (error) {
      // No progress found is not an error - return null
      if (error.code === 'PGRST116') {
        console.log('[Wizard Progress API] No saved progress found for user/tax year');
        return NextResponse.json({ success: true, data: null });
      }
      console.error('[Wizard Progress API] Failed to load progress:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    console.log('[Wizard Progress API] Found saved progress, step:', data.current_step);

    return NextResponse.json({
      success: true,
      data: {
        wizardData: data.wizard_data,
        currentStep: data.current_step,
        currentBusinessId: data.current_business_id,
        currentPropertyId: data.current_property_id,
        taxYear: data.tax_year,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('[Wizard Progress API] Load error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save wizard progress for current user and tax year
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { wizardData, currentStep, currentBusinessId, currentPropertyId, taxYear } = body;

    if (!wizardData) {
      return NextResponse.json(
        { success: false, error: 'Missing wizard data' },
        { status: 400 }
      );
    }

    // Default to the tax year in the wizard data, or 2024-25
    const effectiveTaxYear = taxYear || wizardData.taxYear || '2024-25';

    console.log('[Wizard Progress API] Saving progress for user:', user.id, 'tax year:', effectiveTaxYear, 'step:', currentStep);

    // Upsert wizard progress (insert or update) - now keyed by user_id AND tax_year
    const { error } = await supabase
      .from('wizard_progress')
      .upsert(
        {
          user_id: user.id,
          tax_year: effectiveTaxYear,
          wizard_data: wizardData,
          current_step: currentStep,
          current_business_id: currentBusinessId,
          current_property_id: currentPropertyId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,tax_year',
        }
      );

    if (error) {
      console.error('[Wizard Progress API] Failed to save progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save progress' },
        { status: 500 }
      );
    }

    console.log('[Wizard Progress API] Progress saved successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Wizard Progress API] Save error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
