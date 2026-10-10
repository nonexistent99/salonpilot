import { sqlOne } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export async function GET() {
  try {
    await sqlOne('SELECT 1 AS ok');
    return NextResponse.json({ status: 'ok', database: 'postgresql' });
  } catch {
    return NextResponse.json({ status: 'error', database: 'unavailable' }, { status: 503 });
  }
}
