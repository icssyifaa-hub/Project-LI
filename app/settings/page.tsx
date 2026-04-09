'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Calendar, FileText, Briefcase, UserCog, Settings as SettingsIcon } from 'lucide-react'
import { UsersTab } from './components/UsersTab'
import { HolidaysTab } from './components/HolidaysTab'
import { PDFTab } from './components/PDFTab'
import { JobTasksTab } from './components/JobTasksTab'
import { StaffTab } from './components/StaffTab'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
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
    if (hash && ['users', 'holidays', 'pdf', 'job-tasks', 'staff'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    window.location.hash = value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="h-12 w-12 text-gray-300 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-6 w-6 text-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-gray-500">Logged in as:</span>
              <span className="font-medium text-gray-900">{user.name}</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tabs Navigation */}
          <TabsList className="bg-white border border-gray-200 p-1 flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger 
              value="users" 
              className="flex items-center data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="holidays" 
              className="flex items-center data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Holidays
            </TabsTrigger>
            <TabsTrigger 
              value="pdf" 
              className="flex items-center data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF Files
            </TabsTrigger>
            <TabsTrigger 
              value="job-tasks" 
              className="flex items-center data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Job Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="staff" 
              className="flex items-center data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              <UserCog className="h-4 w-4 mr-2" />
              ICS Staff
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="holidays" className="mt-6">
            <HolidaysTab />
          </TabsContent>

          <TabsContent value="pdf" className="mt-6">
            <PDFTab />
          </TabsContent>

          <TabsContent value="job-tasks" className="mt-6">
            <JobTasksTab />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}