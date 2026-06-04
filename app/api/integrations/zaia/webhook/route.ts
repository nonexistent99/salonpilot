import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Zaia webhook removido. Use /api/webhooks/evolution/[accountId].' },
    { status: 410 }
  );
}
