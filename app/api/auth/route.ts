import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ inactive: false }, { status: 400 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: profile, error } = await admin
      .from('users')
      .select('name, email, is_active')
      .ilike('email', email)
      .maybeSingle()

    if (error) throw error

    if (!profile || profile.is_active) {
      return NextResponse.json({ inactive: false })
    }

    return NextResponse.json({
      inactive: true,
      user: {
        name: profile.name,
        email: profile.email,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check account status'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
