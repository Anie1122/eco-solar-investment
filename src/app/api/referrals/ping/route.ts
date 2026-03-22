import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
