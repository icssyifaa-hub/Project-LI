import { createServerSupabaseClient } from '@/lib/supabase/server'

type AuthenticatedProfile = {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  color: string
  phone: string | null
  is_active: boolean
  must_change_password: boolean
}

async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, color, phone, is_active, must_change_password')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile?.is_active) return null
  return profile as AuthenticatedProfile
}

export async function requireAdminProfile() {
  const profile = await getAuthenticatedProfile()
  if (!profile || profile.role !== 'admin') return null
  return profile
}
