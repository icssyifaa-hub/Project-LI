// app/dashboard/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  
  useEffect(() => {
    const userRole = 'admin'
    
    if (userRole === 'admin') {
      router.push('/calendar')
    } else {
      router.push('/calendar')
    }
  }, [router])
  
  return (
    <div>
      <p>Redirecting to calendar...</p>
    </div>
  )
}