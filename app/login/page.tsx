'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentAppUser, storeAppUser, type AppUser } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react'

type LoginFeedback = {
  type: 'info' | 'success' | 'error'
  message: string
}

const portalFeatures = [
  {
    icon: CalendarDays,
    title: 'Structured Calendar',
    text: 'View tasks and events by day, week, month, or schedule.',
  },
  {
    icon: Users,
    title: 'Clear Staff Assignment',
    text: 'Filter work by staff, PIC, and support team for easier follow-up.',
  },
  {
    icon: FileText,
    title: 'Job Order Tracking',
    text: 'Track Job Order Number and Final Report Number in one workflow.',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginFeedback, setLoginFeedback] = useState<LoginFeedback | null>(null)
  const [showDeactivatedDialog, setShowDeactivatedDialog] = useState(false)
  const [deactivatedUser, setDeactivatedUser] = useState<{ name: string; email: string } | null>(null)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      const profile = await getCurrentAppUser(supabase)
      if (!profile) return

      storeAppUser(profile)
      router.replace(
        profile.must_change_password
          ? '/change-password'
          : profile.role === 'admin'
            ? '/settings'
            : '/calendar'
      )
    }

    redirectAuthenticatedUser()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setLoginFeedback({ type: 'error', message: 'Please enter your email address.' })
      return
    }

    if (!password) {
      setLoginFeedback({ type: 'error', message: 'Please enter your password.' })
      return
    }

    setLoading(true)
    setLoginFeedback({ type: 'info', message: 'Checking your account...' })

    try {
      const completeLogin = async (user: AppUser) => {
        storeAppUser(user)
        setLoginFeedback({ type: 'success', message: 'Login successful. Redirecting...' })

        toast({
          title: 'Welcome!',
          description: `Logged in as ${user.name}`,
        })

        router.push(
          user.must_change_password
            ? '/change-password'
            : user.role === 'admin'
              ? '/settings'
              : '/calendar'
        )
        router.refresh()
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!authError) {
        const authProfile = await getCurrentAppUser(supabase)

        if (authProfile) {
          await completeLogin(authProfile)
          return
        }

        const { data: inactiveProfile } = await supabase
          .from('users')
          .select('name, email, is_active')
          .ilike('email', cleanEmail)
          .maybeSingle()

        await supabase.auth.signOut()

        if (inactiveProfile && !inactiveProfile.is_active) {
          setLoginFeedback({ type: 'error', message: 'This account has been deactivated.' })
          setDeactivatedUser({
            name: inactiveProfile.name,
            email: inactiveProfile.email,
          })
          setShowDeactivatedDialog(true)
          return
        }

        setLoginFeedback({
          type: 'error',
          message: 'Your account profile is not linked correctly. Please contact an administrator.',
        })
        return
      }

      setLoginFeedback({ type: 'error', message: 'Incorrect email or password.' })
    } catch (error) {
      console.error('Login error:', error)

      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-gray-950 dark:text-gray-100 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <div className="fixed right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <section className="relative hidden overflow-hidden border-r border-blue-100 bg-[#f5f7ff] dark:border-gray-800 dark:bg-gray-950 lg:flex">
        <div
          className="absolute inset-0 opacity-70 dark:opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(79, 102, 241, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 102, 241, 0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-8 xl:px-16">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:!bg-white dark:border-gray-700"
              style={{ backgroundColor: '#fff' }}
            >
              <Image
                src="/logoics.png"
                alt="ICS Logo"
                width={48}
                height={48}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-700 dark:text-gray-300">
                ICS Consulting Sdn Bhd
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Calendar Management System
              </p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-12 text-center">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.45em] text-blue-600 dark:text-blue-300">
              Welcome
            </p>

            <h1 className="text-6xl font-extrabold leading-[0.95] tracking-normal text-gray-950 dark:text-white xl:text-7xl">
              CALENDAR
              <span className="block">MANAGEMENT</span>
              <span className="block  text-blue-600 dark:text-blue-400">
                SYSTEM.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-gray-600 dark:text-gray-300">
              A focused workspace for managing tasks, events, staff assignments,
              job orders, and final reports with better visibility.
            </p>

            <div className="mt-10 w-full space-y-5 text-left">
              {portalFeatures.map((item, index) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="grid grid-cols-[32px_1fr] gap-4 border-t border-blue-100 pt-5 dark:border-gray-800"
                  >
                    <div className="text-xs font-semibold text-blue-500">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.title}
                        </h2>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        {item.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div />
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
          </div>

          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-3 px-0 pb-6 text-center">
              <div className="mx-auto hidden h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200 lg:flex">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-950 dark:text-gray-100">
                Sign In
              </CardTitle>

              <CardDescription className="text-gray-500 dark:text-gray-400">
                Enter your email and password to login.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 px-0">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">
                    Email
                  </Label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />

                    <Input
                      id="email"
                      type="email"
                      placeholder="ics.admin@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setLoginFeedback(null)
                      }}
                      required
                      disabled={loading}
                      className="h-11 border-blue-100 bg-blue-50/60 pl-10 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">
                    Password
                  </Label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />

                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setLoginFeedback(null)
                      }}
                      required
                      disabled={loading}
                      className="h-11 border-blue-100 bg-blue-50/60 pl-10 pr-10 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {loginFeedback && (
                  <div
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      loginFeedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : loginFeedback.type === 'error'
                          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200'
                    }`}
                  >
                    {loginFeedback.type === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    ) : loginFeedback.type === 'error' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                    )}
                    <span>{loginFeedback.message}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="px-0 pt-2">
                <Button
                  type="submit"
                  className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-400"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>

            <div className="pt-3 text-center text-xs text-gray-400 dark:text-gray-500">
              <p>ICS Consulting Sdn. Bhd. © 2026</p>
            </div>
          </Card>
        </div>
      </main>

      <Dialog open={showDeactivatedDialog} onOpenChange={setShowDeactivatedDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Ban className="h-6 w-6 text-red-600" />
            </div>

            <DialogTitle className="text-center text-xl text-red-600">
              Account Deactivated
            </DialogTitle>

            <DialogDescription asChild>
              <div className="pt-2 text-center">
                <div className="space-y-3">
                  <div className="text-gray-700 dark:text-gray-200">
                    Dear{' '}
                    <span className="font-semibold">
                      {deactivatedUser?.name}
                    </span>
                    ,
                  </div>

                  <div className="text-gray-600 dark:text-gray-300">
                    Your account{' '}
                    <span className="font-semibold">
                      ({deactivatedUser?.email})
                    </span>{' '}
                    has been deactivated.
                  </div>

                  <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                      <div className="text-left text-sm text-yellow-800">
                        You cannot access the system. Please contact your system
                        administrator to reactivate your account.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeactivatedDialog(false)
                setEmail('')
                setPassword('')
              }}
              className="w-full"
            >
              Try Again
            </Button>

            <Button
              onClick={() => {
                setShowDeactivatedDialog(false)
                router.push('/')
              }}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Go to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
