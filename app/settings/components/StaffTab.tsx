'use client'

import { useUsers } from '../hooks/useUsers'
import { Loader2, UserCog } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function StaffTab() {
  const { users, loading } = useUsers()
  
  const staff = users.filter(user => user.role === 'staff')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-gray-50/50">
        <div>
          <CardTitle className="text-gray-900">ICS Consulting Staff</CardTitle>
          <CardDescription className="text-gray-500">
            List of staff members who can login to the system
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}