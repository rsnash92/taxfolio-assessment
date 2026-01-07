import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/hmrc/auth';
import { storeHMRCTokens } from '@/lib/hmrc/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors from HMRC
  if (error) {
    console.error('HMRC OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${APP_URL}?hmrc_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Verify state
  const storedState = request.cookies.get('hmrc_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${APP_URL}?hmrc_error=${encodeURIComponent('Invalid state parameter')}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${APP_URL}?hmrc_error=${encodeURIComponent('No authorization code received')}`
    );
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens
    await storeHMRCTokens(user.id, tokens);

    // Clear state cookie and redirect back to assessment with success
    const response = NextResponse.redirect(`${APP_URL}?hmrc_connected=true`);
    response.cookies.delete('hmrc_oauth_state');

    return response;
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.redirect(
      `${APP_URL}?hmrc_error=${encodeURIComponent('Failed to connect HMRC account')}`
    );
  }
}
