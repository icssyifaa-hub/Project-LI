'use client'

import { useUsers } from '../hooks/useUsers'
import { Loader2, Mail, UserCog } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  settingsCardClass,
  settingsContentClass,
  settingsDescriptionClass,
  settingsEmptyCellClass,
  settingsHeaderCellClass,
  settingsHeaderClass,
  settingsMutedCellClass,
  settingsTableBodyClass,
  settingsTableClass,
  settingsTableHeaderClass,
  settingsTableRowClass,
  settingsTableWrapperClass,
  settingsTitleClass,
} from './settings-styles'

export function StaffTab() {
  const { users, loading } = useUsers()
  const staff = users.filter(user => user.role === 'staff' && user.is_active)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsHeaderClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={settingsTitleClass}>
              <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ICS Consulting Staff
            </CardTitle>
            <CardDescription className={settingsDescriptionClass}>
              Active staff members who can login to the system
            </CardDescription>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
            {staff.length} active
          </span>
        </div>
      </CardHeader>
      <CardContent className={settingsContentClass}>
        <div className={settingsTableWrapperClass}>
          <table className={settingsTableClass}>
            <thead className={settingsTableHeaderClass}>
              <tr>
                <th className={`${settingsHeaderCellClass} w-16`}>No</th>
                <th className={settingsHeaderCellClass}>Name</th>
                <th className={settingsHeaderCellClass}>Email</th>
              </tr>
            </thead>
            <tbody className={settingsTableBodyClass}>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={3} className={settingsEmptyCellClass}>
                    No active staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((member, index) => (
                  <tr key={member.id} className={settingsTableRowClass}>
                    <td className={settingsMutedCellClass}>{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{member.name}</td>
                    <td className={settingsMutedCellClass}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {member.email || '-'}
                      </div>
                    </td>
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
