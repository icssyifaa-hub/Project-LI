// app/layout.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Inter } from 'next/font/google'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarCheck,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { staffColorMap } from '@/lib/colors'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [userColor, setUserColor] = useState('blue')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      
      if (!userData && pathname !== '/login') {
        router.push('/login')
      } else {
        const parsedUser = userData ? JSON.parse(userData) : null
        setUser(parsedUser)
        if (parsedUser?.id) {
          fetchUserColor(parsedUser.id)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }, [pathname, router])

  const fetchUserColor = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('color')
        .eq('id', userId)
        .single()

      if (!error && data?.color) {
        setUserColor(data.color)
      }
    } catch (error) {
      console.error('Error fetching user color:', error)
    }
  }

  // Listen for storage changes (when profile updates)
  useEffect(() => {
    const handleStorageChange = () => {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        if (parsedUser?.id) {
          fetchUserColor(parsedUser.id)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
    setProfileMenuOpen(false)
  }

  // Get current color style from staffColorMap
  const currentColor = staffColorMap[userColor] || staffColorMap['blue']

  // Don't show drawer on login page
  if (pathname === '/login') {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </body>
      </html>
    )
  }

  if (loading) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        </body>
      </html>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-30 flex items-center px-4 shadow-sm">
            {/* Left side - Menu toggle & Logo */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <h1 className="text-xl font-bold text-blue-600">ICS CMS</h1>
            </div>

            {/* Right side - Profile */}
            <div className="flex-1 flex items-center justify-end space-x-4 relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-3 hover:bg-gray-100 rounded-full px-3 py-1.5 transition-all"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${currentColor.bg}`}>
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
              </Button>

              {/* Profile Popup Menu */}
              {profileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  
                  <div className="absolute right-0 top-14 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${currentColor.bg}`}>
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'admin' || user.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-700' 
                            : `${currentColor.light} ${currentColor.text}`
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <User className="h-4 w-4 mr-3" />
                        My Profile
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleNavigation('/settings')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </button>
                      )}

                      <div className="border-t border-gray-200 my-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>

                    <div className="absolute -top-2 right-6 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Desktop Drawer */}
          <aside className={`
            hidden lg:block fixed left-0 top-16 bottom-0 z-20
            bg-white border-r border-gray-200 transition-all duration-300
            ${drawerOpen ? 'w-64' : 'w-20'}
          `}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto py-6">
                <div className="px-3 space-y-2">
                  {/* Calendar */}
                  <Button 
                    variant="ghost"
                    className={`w-full ${drawerOpen ? 'justify-start' : 'justify-center'} ${
                      pathname === '/calendar' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation('/calendar')}
                    title={!drawerOpen ? "Calendar" : ""}
                  >
                    <Calendar className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                    {drawerOpen && <span>Calendar</span>}
                  </Button>

                  {/* Job Orders */}
                  <Button 
                    variant="ghost"
                    className={`w-full ${drawerOpen ? 'justify-start' : 'justify-center'} ${
                      pathname === '/job-orders' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation('/job-orders')}
                    title={!drawerOpen ? "Job Order List" : ""}
                  >
                    <ClipboardList className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                    {drawerOpen && <span>Job Order List</span>}
                  </Button>

                  {/* Events */}
                  <Button 
                    variant="ghost"
                    className={`w-full ${drawerOpen ? 'justify-start' : 'justify-center'} ${
                      pathname === '/event-lists' 
                        ? 'bg-purple-50 text-purple-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation('/event-lists')}
                    title={!drawerOpen ? "Event List" : ""}
                  >
                    <CalendarCheck className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                    {drawerOpen && <span>Event List</span>}
                  </Button>

                  {/* Settings (Admin only) */}
                  {isAdmin && (
                    <Button 
                      variant="ghost"
                      className={`w-full ${drawerOpen ? 'justify-start' : 'justify-center'} ${
                        pathname === '/settings' 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleNavigation('/settings')}
                      title={!drawerOpen ? "Settings" : ""}
                    >
                      <Settings className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                      {drawerOpen && <span>Settings</span>}
                    </Button>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <div className="p-3 border-t border-gray-200">
                <Button 
                  variant="ghost" 
                  className={`w-full ${drawerOpen ? 'justify-start' : 'justify-center'} text-red-600 hover:text-red-700 hover:bg-red-50`}
                  onClick={handleLogout}
                  title={!drawerOpen ? "Logout" : ""}
                >
                  <LogOut className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                  {drawerOpen && <span>Logout</span>}
                </Button>
              </div>
            </div>
          </aside>

          {/* Mobile Sidebar */}
          {mobileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col lg:hidden">
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                  <h1 className="text-xl font-bold text-blue-600">ICS CMS</h1>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${currentColor.bg}`}>
                      {getUserInitials()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role || 'staff'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                  <div className="px-3 space-y-1">
                    <Button 
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => handleNavigation('/calendar')}
                    >
                      <Calendar className="mr-3 h-5 w-5" />
                      Calendar
                    </Button>

                    <Button 
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => handleNavigation('/job-orders')}
                    >
                      <ClipboardList className="mr-3 h-5 w-5" />
                      Job Order List
                    </Button>

                    <Button 
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100"
                      onClick={() => handleNavigation('/events')}
                    >
                      <CalendarCheck className="mr-3 h-5 w-5" />
                      Event List
                    </Button>

                    {isAdmin && (
                      <Button 
                        variant="ghost"
                        className="w-full justify-start text-gray-700 hover:bg-gray-100"
                        onClick={() => handleNavigation('/settings')}
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </aside>
            </>
          )}

          {/* Main Content */}
          <main className={`
            flex-1 transition-all duration-300
            mt-16 p-4 lg:p-6
            ${drawerOpen ? 'lg:ml-64' : 'lg:ml-20'}
          `}>
            {children}
          </main>

          {/* Footer */}
          <footer className={`
            bg-white border-t border-gray-200 py-3 px-4 text-center text-sm text-gray-500
            transition-all duration-300
            ${drawerOpen ? 'lg:ml-64' : 'lg:ml-20'}
          `}>
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p>© 2026 ICS Consulting Sdn. Bhd. All rights reserved.</p>
              <p className="text-xs mt-1 sm:mt-0">Version 1.0.0</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}