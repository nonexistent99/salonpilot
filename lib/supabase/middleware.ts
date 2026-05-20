import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Minimal middleware - just pass through
  // All auth checks happen client-side to avoid timeout issues
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}
