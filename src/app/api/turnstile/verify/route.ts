import { NextRequest, NextResponse } from 'next/server';

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      // In development without secret key, allow through
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ success: true, development: true });
      }
      return NextResponse.json(
        { success: false, error: 'Turnstile not configured' },
        { status: 500 }
      );
    }

    // Verify with Cloudflare
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    // Optionally add the user's IP for additional security
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip');
    if (ip) {
      formData.append('remoteip', ip);
    }

    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result: TurnstileVerifyResponse = await verifyResponse.json();

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    console.error('Turnstile verification failed:', result['error-codes']);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
