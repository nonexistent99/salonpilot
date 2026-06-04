import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Zaia foi removida. Configure WhatsApp em /api/whatsapp/accounts com Evolution API.' },
    { status: 410 }
  );
}
