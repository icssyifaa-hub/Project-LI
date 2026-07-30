import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const isStaleRefreshTokenError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const authError = error as { code?: string; message?: string }
  const message = authError.message?.toLowerCase() || ''

  return (
    authError.code === 'refresh_token_not_found' ||
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token')
  )
}

const clearSupabaseAuthCookies = (request: NextRequest, response: NextResponse) => {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .forEach((cookie) => {
      request.cookies.delete(cookie.name)
      response.cookies.delete(cookie.name)
    })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse = NextResponse.next({
              request,
            })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    await supabase.auth.getUser()
  } catch (error) {
    if (!isStaleRefreshTokenError(error)) throw error

    clearSupabaseAuthCookies(request, supabaseResponse)
  }

  return supabaseResponse
}
