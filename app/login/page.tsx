'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  LogIn,
  Ban,
  AlertCircle
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDeactivatedDialog, setShowDeactivatedDialog] = useState(false)
  const [deactivatedUser, setDeactivatedUser] = useState<{name: string, email: string} | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role === 'admin') {
        router.push('/settings')
      } else {
        router.push('/calendar')
      }
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()

      if (error || !user) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        })
        return
      }

      // Check if user is active
      if (!user.is_active) {
        setDeactivatedUser({ name: user.name, email: user.email })
        setShowDeactivatedDialog(true)
        return // Stop login process
      }

      // Save user data to localStorage
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        color: user.color || 'blue',
        is_active: user.is_active
      }
      
      localStorage.setItem('user', JSON.stringify(userData))

      toast({
        title: "Welcome!",
        description: `Logged in as ${user.name}`,
      })

      // Redirect based on role
      if (user.role === 'admin') {
        router.push('/settings')
      } else {
        router.push('/calendar')
      }
      
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-400 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">ICS</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome Back</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ics.admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 text-white hover:bg-blue-700 h-11 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-400" 
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
        <div className="px-6 pb-6 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>ICS Consulting Sdn. Bhd. © 2026</p>
        </div>
      </Card>

      {/* Deactivated Account Dialog - FIXED VERSION */}
      <Dialog open={showDeactivatedDialog} onOpenChange={setShowDeactivatedDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl text-red-600">
              Account Deactivated
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center pt-2">
                <div className="space-y-3">
                  <div className="text-gray-700 dark:text-gray-200">
                    Dear <span className="font-semibold">{deactivatedUser?.name}</span>,
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Your account <span className="font-semibold">({deactivatedUser?.email})</span> has been deactivated.
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800 text-left">
                        You cannot access the system. Please contact your system administrator to reactivate your account.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
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
