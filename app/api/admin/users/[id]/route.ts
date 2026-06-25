import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAdminProfile } from '@/lib/auth/server'
import { generateTemporaryPassword } from '@/lib/auth/password'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminProfile = await requireAdminProfile()
  if (!adminProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const role = body.role === 'admin' || body.role === 'staff' ? body.role : undefined
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : undefined
  const action = body.action === 'reset_password' ? 'reset_password' : undefined

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
      .select('id, auth_user_id, name, role, is_active, must_change_password')
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
        .select('id, auth_user_id, name, email, role, is_active, must_change_password, created_at, updated_at, phone, color')
        .single()

      if (resetProfileError) throw resetProfileError

      return NextResponse.json({
        user: { ...resetProfile, auth_status: 'password_change_required' },
        temporary_password: temporaryPassword,
      })
    }

    const updateData = {
      ...(name ? { name } : {}),
      ...(role ? { role } : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: updateError } = await admin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, auth_user_id, name, email, role, is_active, must_change_password, created_at, updated_at, phone, color')
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

    return NextResponse.json({ user: profile })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update user'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
