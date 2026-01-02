import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getAuthUrl } from '@/lib/truelayer/client';

export async function POST() {
  // Generate state for CSRF protection
  const state = nanoid();

  // In production, store state in session/database
  // For now, just generate the auth URL

  const authUrl = getAuthUrl(state);

  return NextResponse.json({ authUrl, state });
}
