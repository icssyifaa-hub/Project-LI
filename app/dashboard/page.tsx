'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/calendar')
  }, [router])
  
  return (
    <div>
      <p>Redirecting to calendar...</p>
    </div>
  )
}