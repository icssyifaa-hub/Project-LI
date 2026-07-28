import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const MAINTENANCE_MODE = true

export async function proxy(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'System maintenance is active. Please try again later.' },
        {
          status: 503,
          headers: {
            'Retry-After': '3600',
          },
        }
      )
    }

    if (pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.search = ''
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
