'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Calendar,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarCheck,
  CalendarDays,
  User,
  ListChecks,
  Building2,
  ChevronDown,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentAppUser, storeAppUser, type AppUser } from '@/lib/auth/client'
import { getColorClass, getSolidClass, getItemBgClass } from '@/lib/colors'

const SIDEBAR_STORAGE_KEY = 'ics_sidebar_open'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [userColor, setUserColor] = useState('blue')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [settingsSectionOpen, setSettingsSectionOpen] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const isStandaloneAuthPage = ['/', '/login', '/change-password'].includes(pathname)

  useEffect(() => {
    try {
      setDrawerOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
    } catch (error) {
      console.error('Error loading sidebar state:', error)
    }
  }, [])

  const fetchUserColor = useCallback(async (userId: string) => {
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
  }, [supabase])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const authProfile = await getCurrentAppUser(supabase)

        if (authProfile) {
          storeAppUser(authProfile)
          setUser(authProfile)
          setUserColor(authProfile.color || 'blue')
          if (authProfile.must_change_password && pathname !== '/change-password') {
            router.replace('/change-password')
          }
          await fetchUserColor(authProfile.id)
          return
        }

        storeAppUser(null)
        setUser(null)
        if (!isStandaloneAuthPage) router.replace('/login')
      } catch (error) {
        console.error('Error loading user:', error)
        if (!isStandaloneAuthPage) router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [pathname, router, isStandaloneAuthPage, supabase, fetchUserColor])

  useEffect(() => {
    const syncUserFromStorage = () => {
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setUserColor(parsedUser.color || 'blue')
        if (parsedUser?.id) fetchUserColor(parsedUser.id)
      } else {
        setUser(null)
      }
    }

    const handleProfileUpdated = (event: Event) => {
      const updatedUser = (event as CustomEvent<AppUser>).detail
      setUser(updatedUser)
      setUserColor(updatedUser?.color || 'blue')
    }

    window.addEventListener('storage', syncUserFromStorage)
    window.addEventListener('user-profile-updated', handleProfileUpdated)
    return () => {
      window.removeEventListener('storage', syncUserFromStorage)
      window.removeEventListener('user-profile-updated', handleProfileUpdated)
    }
  }, [fetchUserColor])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    storeAppUser(null)
    setUser(null)
    router.replace('/login')
    router.refresh()
  }

  const toggleDrawer = () => {
    setDrawerOpen((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setMobileMenuOpen(false)
    setProfileMenuOpen(false)
  }

  useEffect(() => {
    if (pathname === '/settings-staff/job-tasks' || pathname === '/settings-staff/client' || pathname === '/settings-staff/holidays' || pathname === '/settings-staff/user-manual' || pathname === '/settings-admin') {
      setSettingsSectionOpen(true)
    }
  }, [pathname])

  const handleToggleSettingsSection = () => {
    if (!drawerOpen) {
      setDrawerOpen(true)
      localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true')
      setSettingsSectionOpen(true)
      return
    }

    setSettingsSectionOpen((current) => !current)
  }

  // Get current color styles from color.ts
  const currentSolidClass = getSolidClass(userColor)
  const currentTextClass = getColorClass(userColor, 'text')
  const currentLightBgClass = getItemBgClass(userColor)
  const profileAvatarClass = `profile-avatar flex shrink-0 items-center justify-center rounded-full font-semibold shadow-sm ${currentSolidClass}`

  if (isStandaloneAuthPage) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user?.role === 'admin'
  const isCalendarPage = pathname === '/calendar'
  const isSettingsPage = pathname === '/settings-admin'
  const isListPage = pathname === '/job-orders' || pathname === '/event-lists' || pathname === '/settings-staff/job-tasks' || pathname === '/settings-staff/client' || pathname === '/settings-staff/holidays' || pathname === '/settings-staff/user-manual' || pathname === '/profile'
  const getNavClass = (path: string) => {
    const isActive = pathname === path
    return [
      'app-nav-link h-9 w-full rounded-md text-sm font-semibold transition-colors',
      drawerOpen ? 'justify-start px-3' : 'justify-center px-0',
      isActive
        ? 'app-nav-link-active bg-blue-600 text-white shadow-sm hover:bg-blue-600'
        : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    ].join(' ')
  }
  const getMobileNavClass = (path: string) => {
    const isActive = pathname === path
    return [
      'app-nav-link h-10 w-full justify-start rounded-md px-3 text-sm font-semibold transition-colors',
      isActive
        ? 'app-nav-link-active bg-blue-600 text-white shadow-sm hover:bg-blue-600'
        : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    ].join(' ')
  }
  const getSubNavClass = (path: string) => {
    const isActive = pathname === path
    return [
      'flex h-8 w-full items-center rounded-md px-3 text-left text-sm font-medium transition-colors',
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    ].join(' ')
  }
  const getMobileSubNavClass = (path: string) => {
    const isActive = pathname === path
    return [
      'flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-medium transition-colors',
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    ].join(' ')
  }
  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          {/* Header */}
          <header className={`
            fixed right-0 top-0 flex h-16 items-center border-b border-gray-200 bg-white px-3 shadow-sm transition-all duration-300
            dark:border-slate-800 dark:bg-slate-950 sm:px-4
            ${profileMenuOpen ? 'z-[80]' : 'z-30'}
            ${drawerOpen ? 'left-64' : 'left-12'}
            max-lg:left-0
          `}>
            {/* Left side - Menu toggle & Logo */}
            <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleDrawer}
                className="hidden text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Right side - Profile */}
            <div className="relative flex min-w-0 flex-1 items-center justify-end space-x-2 sm:space-x-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                className="flex min-w-0 items-center space-x-2 rounded-full px-2 py-1.5 transition-all hover:bg-gray-100 dark:hover:bg-slate-800 sm:space-x-3 sm:px-3"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                <div className="text-right hidden sm:block">
                  <p className="max-w-36 truncate text-sm font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize dark:text-slate-400">{user.role}</p>
                </div>
                <div className={`${profileAvatarClass} h-9 w-9 text-sm`}>
                  <span>
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
                  
                  <div className="absolute right-0 top-14 z-50 w-[calc(100vw-1.5rem)] max-w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`${profileAvatarClass} h-10 w-10 text-sm`}>
                          <span>{getUserInitials()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700' 
                            : `${currentLightBgClass} ${currentTextClass}`
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <User className="h-4 w-4 mr-3" />
                        My Profile
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleNavigation('/settings-admin')}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </button>
                      )}

                      <div className="my-2 border-t border-gray-200 dark:border-slate-800"></div>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>

                    <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 border-l border-t border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900"></div>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Desktop Drawer */}
          <aside className={`
            hidden lg:block fixed left-0 top-0 bottom-0 z-40
            border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950
            ${drawerOpen ? 'w-64' : 'w-12'}
          `}>
            <div className="h-full flex flex-col">
              <div className="flex h-16 items-center border-b border-gray-200 px-3 dark:border-slate-800">
                <div className={`flex min-w-0 items-center ${drawerOpen ? 'gap-3' : 'justify-center w-full'}`}>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:!bg-white dark:border-slate-700"
                    style={{ backgroundColor: '#fff' }}
                  >
                    <Image
                    src="/logoics.png"
                    alt="ICS Logo"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain p-1"
                    priority
                    />
                  </div>
                  {drawerOpen && (
                    <h1 className="truncate text-lg font-bold text-blue-600 dark:text-blue-200">CMS</h1>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto py-6">
                <div className={`${drawerOpen ? 'px-3' : 'px-2'} space-y-2`}>
                  {/* Calendar */}
                  <Button 
                    variant="ghost"
                    className={getNavClass('/calendar')}
                    onClick={() => handleNavigation('/calendar')}
                    title={!drawerOpen ? "Calendar" : ""}
                  >
                    <Calendar className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                    {drawerOpen && <span>Calendar</span>}
                  </Button>

                  {/* Job Orders */}
                  <Button 
                    variant="ghost"
                    className={getNavClass('/job-orders')}
                    onClick={() => handleNavigation('/job-orders')}
                    title={!drawerOpen ? "Job Task Order List" : ""}
                  >
                    <ClipboardList className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                    {drawerOpen && <span>Job Task Order List</span>}
                  </Button>

                  {/* Events */}
                  <Button 
                    variant="ghost"
                    className={getNavClass('/event-lists')}
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
                      className={getNavClass('/settings-admin')}
                      onClick={() => handleNavigation('/settings-admin')}
                      title={!drawerOpen ? "Settings" : ""}
                    >
                      <Settings className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                      {drawerOpen && <span>Settings</span>}
                    </Button>
                  )}

                  {!isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        className={[
                          'app-nav-link h-9 w-full rounded-md text-sm font-semibold transition-colors',
                          drawerOpen ? 'justify-start px-3' : 'justify-center px-0',
                          settingsSectionOpen
                            ? 'text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950/50'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                        ].join(' ')}
                        onClick={handleToggleSettingsSection}
                        title={!drawerOpen ? "Settings" : ""}
                      >
                        <Settings className={`h-5 w-5 ${drawerOpen ? 'mr-3' : ''}`} />
                        {drawerOpen && (
                          <>
                            <span className="flex-1 text-left">Settings</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${settingsSectionOpen ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </Button>

                      {drawerOpen && settingsSectionOpen && (
                        <div className="ml-5 space-y-1 border-l border-gray-200 pl-3 dark:border-slate-800">
                          <button
                            type="button"
                            className={getSubNavClass('/settings-staff/job-tasks')}
                            onClick={() => handleNavigation('/settings-staff/job-tasks')}
                          >
                            <ListChecks className="mr-2 h-3.5 w-3.5" />
                            Job Tasks
                          </button>
                          <button
                            type="button"
                            className={getSubNavClass('/settings-staff/client')}
                            onClick={() => handleNavigation('/settings-staff/client')}
                          >
                            <Building2 className="mr-2 h-3.5 w-3.5" />
                            Client
                          </button>
                          <button
                            type="button"
                            className={getSubNavClass('/settings-staff/holidays')}
                            onClick={() => handleNavigation('/settings-staff/holidays')}
                          >
                            <CalendarDays className="mr-2 h-3.5 w-3.5" />
                            Holidays
                          </button>
                          <button
                            type="button"
                            className={getSubNavClass('/settings-staff/user-manual')}
                            onClick={() => handleNavigation('/settings-staff/user-manual')}
                          >
                            <FileText className="mr-2 h-3.5 w-3.5" />
                            User Manual
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
              <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-slate-800">
                  <h1 className="text-xl font-bold text-blue-600 dark:text-blue-200">ICS CMS</h1>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className={`${profileAvatarClass} h-10 w-10 text-sm`}>
                      <span>{getUserInitials()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user.name || 'User'}</p>
                      <p className="text-xs text-gray-500 capitalize dark:text-slate-400">{user.role || 'staff'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col overflow-y-auto py-6">
                  <div className="px-3 space-y-1">
                    <Button 
                      variant="ghost"
                      className={getMobileNavClass('/calendar')}
                      onClick={() => handleNavigation('/calendar')}
                    >
                      <Calendar className="mr-3 h-5 w-5" />
                      Calendar
                    </Button>

                    <Button 
                      variant="ghost"
                      className={getMobileNavClass('/job-orders')}
                      onClick={() => handleNavigation('/job-orders')}
                    >
                      <ClipboardList className="mr-3 h-5 w-5" />
                      Job Task Order List
                    </Button>

                    <Button 
                      variant="ghost"
                      className={getMobileNavClass('/event-lists')}
                      onClick={() => handleNavigation('/event-lists')}
                    >
                      <CalendarCheck className="mr-3 h-5 w-5" />
                      Event List
                    </Button>

                    {isAdmin && (
                      <Button 
                        variant="ghost"
                        className={getMobileNavClass('/settings-admin')}
                        onClick={() => handleNavigation('/settings-admin')}
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                      </Button>
                    )}

                    {!isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          className={[
                            'app-nav-link h-10 w-full justify-start rounded-md px-3 text-sm font-semibold transition-colors',
                            settingsSectionOpen
                              ? 'text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950/50'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                          ].join(' ')}
                          onClick={() => setSettingsSectionOpen((current) => !current)}
                        >
                          <Settings className="mr-3 h-5 w-5" />
                          <span className="flex-1 text-left">Settings</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${settingsSectionOpen ? 'rotate-180' : ''}`} />
                        </Button>

                        {settingsSectionOpen && (
                          <div className="ml-5 space-y-1 border-l border-gray-200 pl-3 dark:border-slate-800">
                            <button
                              type="button"
                              className={getMobileSubNavClass('/settings-staff/job-tasks')}
                              onClick={() => handleNavigation('/settings-staff/job-tasks')}
                            >
                              <ListChecks className="mr-2 h-3.5 w-3.5" />
                              Job Tasks
                            </button>
                            <button
                              type="button"
                              className={getMobileSubNavClass('/settings-staff/client')}
                              onClick={() => handleNavigation('/settings-staff/client')}
                            >
                              <Building2 className="mr-2 h-3.5 w-3.5" />
                              Client
                            </button>
                            <button
                              type="button"
                              className={getMobileSubNavClass('/settings-staff/holidays')}
                              onClick={() => handleNavigation('/settings-staff/holidays')}
                            >
                              <CalendarDays className="mr-2 h-3.5 w-3.5" />
                              Holidays
                            </button>
                            <button
                              type="button"
                              className={getMobileSubNavClass('/settings-staff/user-manual')}
                              onClick={() => handleNavigation('/settings-staff/user-manual')}
                            >
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              User Manual
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 p-4 dark:border-slate-800">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
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
            mt-16 min-w-0 ${isCalendarPage || isSettingsPage || isListPage ? 'p-0' : 'p-3 sm:p-4 lg:p-6'}
            ${drawerOpen ? 'lg:ml-64' : 'lg:ml-12'}
          `}>
            {children}
          </main>

          {/* Footer */}
          {!isCalendarPage && (
          <footer className={`
            bg-white border-t border-gray-200 py-3 px-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400
            transition-all duration-300
            ${drawerOpen ? 'lg:ml-64' : 'lg:ml-12'}
          `}>
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p>© 2026 ICS Consulting Sdn. Bhd. All rights reserved.</p>
              <p className="text-xs mt-1 sm:mt-0">Version 1.0.0</p>
            </div>
          </footer>
          )}
    </div>
  )
}
