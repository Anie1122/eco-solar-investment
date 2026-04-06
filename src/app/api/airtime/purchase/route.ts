import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { ok: false, message: 'Airtime purchase has been removed from the app.' },
    { status: 410 }
  );
}
