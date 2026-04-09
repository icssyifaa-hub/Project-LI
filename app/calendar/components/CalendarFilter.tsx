'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronDown, 
  ChevronRight, 
  Search,
  Users,
  CalendarDays,
  CheckSquare,
  UserRound
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, Holiday } from '@/types'
import { staffColorMap } from '@/lib/colors'

interface StaffFilters {
  [staffCode: string]: {
    tasks: boolean
    events: boolean
  }
}

interface CalendarFilterProps {
  users: User[]
  holidays: Holiday[]
  showHolidays: boolean
  onHolidaysToggle: () => void
  
  staffTaskEventFilters?: StaffFilters
  onStaffTaskToggle?: (staffCode: string, value: boolean) => void
  onStaffEventToggle?: (staffCode: string, value: boolean) => void
}

export default function CalendarFilter({
  users,
  holidays,
  showHolidays,
  onHolidaysToggle,
  staffTaskEventFilters: externalFilters = {},
  onStaffTaskToggle: externalTaskToggle,
  onStaffEventToggle: externalEventToggle
}: CalendarFilterProps) {
  const [myCalendarsOpen, setMyCalendarsOpen] = useState(true)
  const [staffSearch, setStaffSearch] = useState('')
  
  // Internal state for filters (used when parent doesn't provide handlers)
  const [internalFilters, setInternalFilters] = useState<StaffFilters>({})
  
  // Determine which filters to use
  const hasExternalHandlers = !!externalTaskToggle && !!externalEventToggle
  const hasExternalFilters = Object.keys(externalFilters).length > 0
  
  // Use external filters if provided, otherwise use internal
  const staffFilters = hasExternalFilters ? externalFilters : internalFilters

  const staffList = users.filter(user => user.role === 'staff')

  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    (staff.user_id && staff.user_id.toLowerCase().includes(staffSearch.toLowerCase()))
  )

  const getUserColorClasses = (user: User) => {
    const colorKey = user.color || 'blue'
    return staffColorMap[colorKey] || staffColorMap['blue']
  }

  const totalStaff = staffList.length
  const selectedStaffCount = Object.keys(staffFilters).length

  // Helper to get staff filter state
  const getStaffTasksChecked = (staffCode: string): boolean => {
    return staffFilters[staffCode]?.tasks || false
  }

  const getStaffEventsChecked = (staffCode: string): boolean => {
    return staffFilters[staffCode]?.events || false
  }

  // Handler for task toggle (works with both external and internal)
  const handleStaffTaskToggle = (staffCode: string, value: boolean) => {
    if (hasExternalHandlers && externalTaskToggle) {
      externalTaskToggle(staffCode, value)
    } else {
      setInternalFilters(prev => {
        const current = prev[staffCode] || { tasks: false, events: false }
        return {
          ...prev,
          [staffCode]: {
            tasks: value,
            events: current.events
          }
        }
      })
    }
  }

  // Handler for event toggle (works with both external and internal)
  const handleStaffEventToggle = (staffCode: string, value: boolean) => {
    if (hasExternalHandlers && externalEventToggle) {
      externalEventToggle(staffCode, value)
    } else {
      setInternalFilters(prev => {
        const current = prev[staffCode] || { tasks: false, events: false }
        return {
          ...prev,
          [staffCode]: {
            tasks: current.tasks,
            events: value
          }
        }
      })
    }
  }

  const handleToggleAllTasks = () => {
    const allTasksChecked = filteredStaff.every(staff => {
      const code = staff.user_id || staff.id
      return getStaffTasksChecked(code)
    })
    
    // Jika semua sudah tick, untick semua. Jika tidak, tick semua
    filteredStaff.forEach(staff => {
      const code = staff.user_id || staff.id
      handleStaffTaskToggle(code, !allTasksChecked)
    })
  }

  // Toggle ALL Events: jika semua sudah tick, dia akan untick semua. Jika ada yang belum tick, dia tick semua
  const handleToggleAllEvents = () => {
    const allEventsChecked = filteredStaff.every(staff => {
      const code = staff.user_id || staff.id
      return getStaffEventsChecked(code)
    })
    
    filteredStaff.forEach(staff => {
      const code = staff.user_id || staff.id
      handleStaffEventToggle(code, !allEventsChecked)
    })
  }

  const totalTasksSelected = filteredStaff.filter(staff => {
    const code = staff.user_id || staff.id
    return getStaffTasksChecked(code)
  }).length

  const totalEventsSelected = filteredStaff.filter(staff => {
    const code = staff.user_id || staff.id
    return getStaffEventsChecked(code)
  }).length

  // Check if all tasks are selected
  const allTasksSelected = filteredStaff.length > 0 && totalTasksSelected === filteredStaff.length
  const allEventsSelected = filteredStaff.length > 0 && totalEventsSelected === filteredStaff.length

  return (
    <div className="w-80 h-full bg-background border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => setMyCalendarsOpen(!myCalendarsOpen)}
          className="flex items-center justify-start w-full px-0 hover:bg-transparent"
          aria-expanded={myCalendarsOpen}
        >
          {myCalendarsOpen ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <span className="font-semibold">My calendars</span>
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {myCalendarsOpen && (
            <>
              {/* Holidays Section */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="holidays" 
                    checked={showHolidays}
                    onCheckedChange={onHolidaysToggle}
                    className="border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <label 
                    htmlFor="holidays" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <CalendarDays className="h-4 w-4 text-green-600" />
                    <span>Malaysia Holidays</span>
                    {holidays.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {holidays.length}
                      </Badge>
                    )}
                  </label>
                </div>
              </div>

              <Separator />

              {/* Staff Section */}
              <div className="space-y-3">
                {/* Staff Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Staff
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {totalTasksSelected + totalEventsSelected} active
                  </Badge>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {/* Column Headers with Toggle All Buttons */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-muted/30 rounded-md">
                  <div className="col-span-5">
                    <span className="text-xs font-medium text-muted-foreground">Staff</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllTasks}
                      className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-blue-600 gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      Task
                      {allTasksSelected && (
                        <span className="text-blue-600 ml-1">✓</span>
                      )}
                    </Button>
                  </div>
                  <div className="col-span-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllEvents}
                      className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-purple-600 gap-1"
                    >
                      <CalendarDays className="h-3 w-3" />
                      Events
                      {allEventsSelected && (
                        <span className="text-purple-600 ml-1">✓</span>
                      )}
                    </Button>
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {/* Staff List - REMOVED background grey when selected */}
                <div className="space-y-1">
                  {filteredStaff.map((staff) => {
                    const colors = getUserColorClasses(staff)
                    const staffCode = staff.user_id || staff.id
                    const showStaffTasks = getStaffTasksChecked(staffCode)
                    const showStaffEvents = getStaffEventsChecked(staffCode)
                    
                    return (
                      <div 
                        key={staff.id} 
                        className={cn(
                          "grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-md transition-all",
                          // REMOVED: (showStaffTasks || showStaffEvents) && "bg-blue-50/50 dark:bg-blue-950/20",
                          "hover:bg-muted/50"
                        )}
                      >
                        {/* Staff Name */}
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full", colors.bg)} />
                          <UserRound className={cn("h-3 w-3 flex-shrink-0", colors.text)} />
                          <span className={cn("text-sm font-medium truncate", colors.text)}>
                            {staff.name}
                          </span>
                        </div>

                        {/* Task Checkbox */}
                        <div className="col-span-3 flex justify-center">
                          <Checkbox
                            id={`staff-${staff.id}-task`}
                            checked={showStaffTasks}
                            onCheckedChange={(checked) => {
                              handleStaffTaskToggle(staffCode, checked === true)
                            }}
                            className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          />
                        </div>

                        {/* Events Checkbox */}
                        <div className="col-span-3 flex justify-center">
                          <Checkbox
                            id={`staff-${staff.id}-event`}
                            checked={showStaffEvents}
                            onCheckedChange={(checked) => {
                              handleStaffEventToggle(staffCode, checked === true)
                            }}
                            className="border-purple-400 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          />
                        </div>

                        {/* Status Indicator - Green dot when selected */}
                        <div className="col-span-1 flex justify-center">
                          {(showStaffTasks || showStaffEvents) && (
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary Footer */}
                {filteredStaff.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3 text-blue-500" />
                        <span>{totalTasksSelected}/{filteredStaff.length} tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-purple-500" />
                        <span>{totalEventsSelected}/{filteredStaff.length} events</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredStaff.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No staff found</p>
                    {staffSearch && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setStaffSearch('')}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}