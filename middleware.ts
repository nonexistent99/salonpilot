import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/' &&
      !request.cookies.get('salonpilot_session') &&
      !request.cookies.get('growthOS_session')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
