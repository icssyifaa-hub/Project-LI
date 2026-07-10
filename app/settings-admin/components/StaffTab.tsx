'use client'

import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { Mail, Search, UserCog } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  settingsInputClass,
  settingsMutedCellClass,
  settingsTableBodyClass,
  settingsTableClass,
  settingsTableHeaderClass,
  settingsTableRowClass,
  settingsTableWrapperClass,
  settingsTitleClass,
} from './settings-styles'
import { SettingsPagination, useSettingsPagination } from './SettingsPagination'

export function StaffTab() {
  const { users } = useUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const staff = users.filter(user => user.role === 'staff' && user.is_active)
  const filteredStaff = staff.filter((member) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return (
      member.name.toLowerCase().includes(keyword) ||
      member.email.toLowerCase().includes(keyword)
    )
  })
  const staffPagination = useSettingsPagination(filteredStaff)

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
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search staff..."
              className={`pl-9 ${settingsInputClass}`}
            />
          </div>
        </div>

        <div className={settingsTableWrapperClass}>
          <div className="overflow-x-auto">
          <table className={settingsTableClass}>
            <thead className={settingsTableHeaderClass}>
              <tr>
                <th className={`${settingsHeaderCellClass} w-16`}>No</th>
                <th className={settingsHeaderCellClass}>Name</th>
                <th className={settingsHeaderCellClass}>Email</th>
              </tr>
            </thead>
            <tbody className={settingsTableBodyClass}>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={3} className={settingsEmptyCellClass}>
                    {searchTerm ? 'No staff match your search.' : 'No active staff members found.'}
                  </td>
                </tr>
              ) : (
                staffPagination.paginatedRows.map((member, index) => (
                  <tr key={member.id} className={settingsTableRowClass}>
                    <td className={settingsMutedCellClass}>{staffPagination.pageStart + index + 1}</td>
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
          <SettingsPagination
            currentPage={staffPagination.currentPage}
            rowsPerPage={staffPagination.rowsPerPage}
            totalItems={filteredStaff.length}
            totalPages={staffPagination.totalPages}
            showingStart={staffPagination.showingStart}
            showingEnd={staffPagination.showingEnd}
            onPageChange={staffPagination.setCurrentPage}
            onRowsPerPageChange={staffPagination.setRowsPerPage}
          />
        </div>
      </CardContent>
    </Card>
  )
}
