import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAdminProfile } from '@/lib/auth/server'
import { generateTemporaryPassword } from '@/lib/auth/password'

export async function GET() {
  const adminProfile = await requireAdminProfile()
  if (!adminProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: profiles, error: profilesError } = await admin
      .from('users')
      .select('id, auth_user_id, name, email, role, is_active, must_change_password, created_at, updated_at, phone, color')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    const users = (profiles ?? []).map((profile) => ({
      ...profile,
      auth_status: !profile.auth_user_id
        ? 'legacy'
        : profile.must_change_password
          ? 'password_change_required'
          : 'active',
    }))

    return NextResponse.json({ users })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load users'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const adminProfile = await requireAdminProfile()
  if (!adminProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const role = body.role === 'admin' ? 'admin' : 'staff'

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: existingProfile } = await admin
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { role },
    })

    if (authError) throw authError
    const authUser = authData.user

    const { data: profile, error: profileError } = await admin
      .from('users')
      .insert({
        auth_user_id: authUser.id,
        name,
        email,
        role,
        is_active: true,
        must_change_password: true,
        color: 'blue',
        password: null,
      })
      .select('id, auth_user_id, name, email, role, is_active, must_change_password, created_at, phone, color')
      .single()

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.id)
      throw profileError
    }

    return NextResponse.json({
      user: { ...profile, auth_status: 'password_change_required' },
      temporary_password: temporaryPassword,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create user'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
