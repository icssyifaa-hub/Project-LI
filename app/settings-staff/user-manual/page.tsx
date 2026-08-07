'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { UserManualPanel } from '@/app/settings-admin/components/UserManualPanel'

export default function StaffUserManualPage() {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="w-full max-w-none space-y-6">
        <div className="-mx-2 -mt-2 flex flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Manual</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View the latest manual uploaded by admin
            </p>
          </div>
        </div>

        <UserManualPanel />
      </div>
    </div>
  )
}
