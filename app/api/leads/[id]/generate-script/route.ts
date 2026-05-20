import { NextResponse } from 'next/server';

// Legacy route — not used in BeautyGrowth OS
export async function POST() {
  return NextResponse.json({ error: 'Feature not available.' }, { status: 404 });
}
