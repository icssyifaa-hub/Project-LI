import type { SupabaseClient } from '@supabase/supabase-js'

export type AppUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  color: string
  phone?: string | null
  is_active: boolean
  must_change_password: boolean
}

export async function getCurrentAppUser(supabase: SupabaseClient): Promise<AppUser | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, color, phone, is_active, must_change_password')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (error || !data || !data.is_active) return null
  return data as AppUser
}

export function storeAppUser(user: AppUser | null) {
  if (typeof window === 'undefined') return

  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  } else {
    localStorage.removeItem('user')
  }
}
