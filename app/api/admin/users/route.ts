import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAdminProfile } from '@/lib/auth/server'
import { generateTemporaryPassword } from '@/lib/auth/password'

const USER_SELECT = 'id, auth_user_id, name, email, role, is_active, must_change_password, created_at, updated_at, phone, color'

const getAuthStatus = (profile: { auth_user_id: string | null; must_change_password: boolean }) => (
  !profile.auth_user_id
    ? 'legacy'
    : profile.must_change_password
      ? 'password_change_required'
      : 'active'
)

export async function GET() {
  const adminProfile = await requireAdminProfile()
  if (!adminProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: profiles, error: profilesError } = await admin
      .from('users')
      .select(USER_SELECT)
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    const users = (profiles ?? []).map((profile) => ({
      ...profile,
      auth_status: getAuthStatus(profile),
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
      })
      .select(USER_SELECT)
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

export async function PATCH(request: Request) {
  const adminProfile = await requireAdminProfile()
  if (!adminProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
  const role = body.role === 'admin' || body.role === 'staff' ? body.role : undefined
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : undefined
  const action = body.action === 'reset_password' ? 'reset_password' : undefined

  if (!id) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  if (id === adminProfile.id && isActive === false) {
    return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
  }

  if (id === adminProfile.id && action === 'reset_password') {
    return NextResponse.json(
      { error: 'Change your own password from My Profile instead' },
      { status: 400 }
    )
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data: existing, error: existingError } = await admin
      .from('users')
      .select('id, auth_user_id, name, email, role, is_active, must_change_password')
      .eq('id', id)
      .single()

    if (existingError) throw existingError

    if (action === 'reset_password') {
      if (!existing.auth_user_id) {
        return NextResponse.json(
          { error: 'This legacy account must be migrated to Supabase Auth first' },
          { status: 409 }
        )
      }

      const temporaryPassword = generateTemporaryPassword()
      const { error: passwordError } = await admin.auth.admin.updateUserById(
        existing.auth_user_id,
        { password: temporaryPassword }
      )

      if (passwordError) throw passwordError

      const { error: revokeError } = await admin.rpc('revoke_auth_sessions', {
        target_user_id: existing.auth_user_id,
      })

      if (revokeError) throw revokeError

      const { data: resetProfile, error: resetProfileError } = await admin
        .from('users')
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(USER_SELECT)
        .single()

      if (resetProfileError) throw resetProfileError

      return NextResponse.json({
        user: { ...resetProfile, auth_status: 'password_change_required' },
        temporary_password: temporaryPassword,
      })
    }

    if (email) {
      const { data: duplicateProfile, error: duplicateError } = await admin
        .from('users')
        .select('id')
        .ilike('email', email)
        .neq('id', id)
        .maybeSingle()

      if (duplicateError) throw duplicateError
      if (duplicateProfile) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
      }
    }

    if (existing.auth_user_id && email && email !== existing.email.toLowerCase()) {
      const { error: authEmailError } = await admin.auth.admin.updateUserById(
        existing.auth_user_id,
        { email, email_confirm: true }
      )

      if (authEmailError) throw authEmailError
    }

    const updateData = {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(role ? { role } : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: updateError } = await admin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(USER_SELECT)
      .single()

    if (updateError) throw updateError

    if (existing.auth_user_id) {
      await admin.auth.admin.updateUserById(existing.auth_user_id, {
        ...(name || role
          ? {
              user_metadata: { name: name || existing.name },
              app_metadata: { role: role || existing.role },
            }
          : {}),
        ...(typeof isActive === 'boolean'
          ? { ban_duration: isActive ? 'none' : '876000h' }
          : {}),
      })
    }

    return NextResponse.json({ user: { ...profile, auth_status: getAuthStatus(profile) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update user'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
