// app/settings-admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Calendar, Hash, Briefcase, UserCog, Settings as SettingsIcon, Building2, FileText } from 'lucide-react'
import { UsersTab } from './components/UsersTab'
import { HolidaysTab } from './components/HolidaysTab'
import { NumberFileTab } from './components/NumberFileTab'
import { JobTasksTab } from './components/JobTasksTab'
import { StaffTab } from './components/StaffTab'
import { ClientsTab } from './components/ClientsTab'
import { UserManualPanel } from './components/UserManualPanel'
import type { AppUser } from '@/lib/auth/client'

const tabTriggerClass =
  'settings-tab-trigger flex items-center rounded-md px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white'

export default function SettingsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user')
        if (!userData) {
          router.push('/login')
          return
        }

        const parsedUser = JSON.parse(userData)
        
        if (parsedUser.role !== 'admin') {
          router.push('/calendar')
          return
        }

        setUser(parsedUser)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Get tab from URL hash or default to users
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && ['users', 'client-lists', 'holidays', 'number-file', 'number-fields', 'job-tasks', 'staff', 'user-manual'].includes(hash)) {
      setActiveTab(hash === 'number-fields' ? 'number-file' : hash)
    }
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    window.location.hash = value
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <SettingsIcon className="mx-auto mb-4 h-12 w-12 animate-spin text-gray-300 dark:text-gray-700" />
          <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="w-full max-w-none px-3 py-4 lg:px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage system data and admin controls</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center space-x-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:gap-3">
                <span className="hidden text-gray-500 dark:text-gray-400 sm:inline">Logged in as:</span>
                <span className="max-w-48 truncate font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium capitalize text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-none px-3 py-4 lg:px-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tabs Navigation */}
          <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:flex-wrap dark:border-gray-800 dark:bg-gray-900">
            <TabsTrigger 
              value="users" 
              className={tabTriggerClass}
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="client-lists"
              className={tabTriggerClass}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Client 
            </TabsTrigger>
            <TabsTrigger 
              value="holidays" 
              className={tabTriggerClass}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Holidays
            </TabsTrigger>
            <TabsTrigger 
              value="number-file" 
              className={tabTriggerClass}
            >
              <Hash className="h-4 w-4 mr-2" />
              Number File
            </TabsTrigger>
            <TabsTrigger 
              value="job-tasks" 
              className={tabTriggerClass}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Job Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="staff" 
              className={tabTriggerClass}
            >
              <UserCog className="h-4 w-4 mr-2" />
              ICS Staff
            </TabsTrigger>
            <TabsTrigger
              value="user-manual"
              className={tabTriggerClass}
            >
              <FileText className="h-4 w-4 mr-2" />
              User Manual
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="client-lists" className="mt-6">
            <ClientsTab />
          </TabsContent>

          <TabsContent value="holidays" className="mt-6">
            <HolidaysTab />
          </TabsContent>

          <TabsContent value="number-file" className="mt-6">
            <NumberFileTab />
          </TabsContent>

          <TabsContent value="job-tasks" className="mt-6">
            <JobTasksTab />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffTab />
          </TabsContent>

          <TabsContent value="user-manual" className="mt-6">
            <UserManualPanel canManage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
