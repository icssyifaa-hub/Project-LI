'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { getCurrentAppUser, storeAppUser } from '@/lib/auth/client'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAccount = async () => {
      const supabase = createClient()
      const profile = await getCurrentAppUser(supabase)

      if (!profile) {
        router.replace('/login')
        return
      }

      if (!profile.must_change_password) {
        router.replace(profile.role === 'admin' ? '/settings-admin' : '/calendar')
        return
      }

      setChecking(false)
    }

    checkAccount()
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least 8 characters, including a letter and a number.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const currentProfile = await getCurrentAppUser(supabase)

    if (!currentProfile) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password })

    if (passwordError) {
      setError(passwordError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('users')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentProfile.id)

    if (profileError) {
      setError('Password changed, but the account status could not be updated. Contact an administrator.')
      setLoading(false)
      return
    }

    const updatedProfile = {
      ...currentProfile,
      must_change_password: false,
    }
    storeAppUser(updatedProfile)
    setSuccess(true)
    setLoading(false)

    window.setTimeout(() => {
      router.replace(updatedProfile.role === 'admin' ? '/settings-admin' : '/calendar')
      router.refresh()
    }, 1200)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            {success ? <CheckCircle2 className="h-7 w-7" /> : <LockKeyhole className="h-7 w-7" />}
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
            {success ? 'Password saved' : 'Create a new password'}
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            {success
              ? 'Your temporary password has been replaced.'
              : 'You must replace the temporary password before using the system.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!success && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-2.5 text-gray-400"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              )}

              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save new password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
