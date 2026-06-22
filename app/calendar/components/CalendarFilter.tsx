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
import type { StaffInfo, Holiday } from '@/app/calendar/types/calendar'
import { colorClasses, getColorClass, getDotClass, getBadgeClass, getItemBgClass, type ColorKey } from '@/lib/colors'

interface StaffFilters {
  [staffId: string]: {
    tasks: boolean
    events: boolean
  }
}

interface CalendarFilterProps {
  users: StaffInfo[]
  holidays: Holiday[]
  showHolidays: boolean
  onHolidaysToggle: () => void
  
  staffTaskEventFilters?: StaffFilters
  onStaffTaskToggle?: (staffId: string, value: boolean) => void
  onStaffEventToggle?: (staffId: string, value: boolean) => void
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
  const [internalFilters, setInternalFilters] = useState<StaffFilters>({})
  const hasExternalHandlers = !!externalTaskToggle && !!externalEventToggle
  const staffFilters = hasExternalHandlers ? externalFilters : internalFilters
  const staffList = users.filter((staff) => staff.role === 'staff')
  const filteredStaff = staffList.filter((staff) =>
    staff.name?.toLowerCase().includes(staffSearch.toLowerCase())
  )

  const getUserColorClasses = (user: StaffInfo) => {
    const colorKey = user.color || 'blue'
    const isPaletteColor = colorKey in colorClasses
    const customColorStyle = isPaletteColor ? undefined : { color: colorKey }
    const customDotStyle = isPaletteColor ? undefined : { backgroundColor: colorKey }

    return {
      bg: isPaletteColor ? getDotClass(colorKey as ColorKey) : 'bg-gray-400',
      dotStyle: customDotStyle,
      text: isPaletteColor ? getColorClass(colorKey as ColorKey, 'text') : '',
      iconStyle: customColorStyle,
      badge: getBadgeClass(colorKey),
      lightBg: getItemBgClass(colorKey),
      solid: getColorClass(colorKey, 'solid'),
      border: getColorClass(colorKey, 'border'),
    }
  }

  const getStaffTasksChecked = (staffId: string): boolean => {
    return staffFilters[staffId]?.tasks || false
  }

  const getStaffEventsChecked = (staffId: string): boolean => {
    return staffFilters[staffId]?.events || false
  }

  const handleStaffTaskToggle = (staffId: string, value: boolean) => {
    if (hasExternalHandlers && externalTaskToggle) {
      externalTaskToggle(staffId, value)
    } else {
      setInternalFilters(prev => {
        const current = prev[staffId] || { tasks: false, events: false }
        return {
          ...prev,
          [staffId]: {
            tasks: value,
            events: current.events
          }
        }
      })
    }
  }

  const handleStaffEventToggle = (staffId: string, value: boolean) => {
    if (hasExternalHandlers && externalEventToggle) {
      externalEventToggle(staffId, value)
    } else {
      setInternalFilters(prev => {
        const current = prev[staffId] || { tasks: false, events: false }
        return {
          ...prev,
          [staffId]: {
            tasks: current.tasks,
            events: value
          }
        }
      })
    }
  }
  
  const handleToggleAllTasks = () => {
    if (filteredStaff.length === 0) return
    
    const allTasksChecked = filteredStaff.every(staff => 
      getStaffTasksChecked(staff.id)
    )
    
    filteredStaff.forEach(staff => {
      handleStaffTaskToggle(staff.id, !allTasksChecked)
    })
  }

  const handleToggleAllEvents = () => {
    if (filteredStaff.length === 0) return
    
    const allEventsChecked = filteredStaff.every(staff => 
      getStaffEventsChecked(staff.id)
    )
    
    filteredStaff.forEach(staff => {
      handleStaffEventToggle(staff.id, !allEventsChecked)
    })
  }

  const totalTasksSelected = filteredStaff.filter(staff => 
    getStaffTasksChecked(staff.id)
  ).length

  const totalEventsSelected = filteredStaff.filter(staff => 
    getStaffEventsChecked(staff.id)
  ).length

  const totalActiveSelections = staffList.reduce((count, staff) => {
    return count + (getStaffTasksChecked(staff.id) ? 1 : 0) + (getStaffEventsChecked(staff.id) ? 1 : 0)
  }, 0)

  const allTasksSelected = filteredStaff.length > 0 && totalTasksSelected === filteredStaff.length
  const allEventsSelected = filteredStaff.length > 0 && totalEventsSelected === filteredStaff.length

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-b bg-background lg:border-b-0 lg:border-r">
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
                <div className="flex items-center gap-3">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Staff ({staffList.length})
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {totalActiveSelections} active
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
                <div className="grid grid-cols-12 gap-2 rounded-md bg-muted/30 px-2 py-1">
                  <div className="col-span-5">
                    <span className="text-xs font-medium text-muted-foreground">Staff</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllTasks}
                      className="h-auto gap-1 p-0 text-xs font-medium text-muted-foreground hover:text-blue-600"
                    >
                      <CheckSquare className="h-3 w-3" />
                      Task
                      {allTasksSelected && filteredStaff.length > 0 && (
                        <span className="text-blue-600 ml-1">✓</span>
                      )}
                    </Button>
                  </div>
                  <div className="col-span-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllEvents}
                      className="h-auto gap-1 p-0 text-xs font-medium text-muted-foreground hover:text-purple-600"
                    >
                      <CalendarDays className="h-3 w-3" />
                      Events
                      {allEventsSelected && filteredStaff.length > 0 && (
                        <span className="text-purple-600 ml-1">✓</span>
                      )}
                    </Button>
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {/* Staff List */}
                <div className="max-h-[42vh] space-y-1 overflow-y-auto pr-1 sm:max-h-[52vh] lg:max-h-[400px]">
                  {filteredStaff.map((staff) => {
                    const colors = getUserColorClasses(staff)
                    const staffId = staff.id
                    const showStaffTasks = getStaffTasksChecked(staffId)
                    const showStaffEvents = getStaffEventsChecked(staffId)
                    
                    return (
                      <div 
                        key={staff.id} 
                        className={cn(
                          "grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-md transition-all",
                          "hover:bg-muted/50"
                        )}
                      >
                        {/* Staff Name */}
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <div
                            className={cn("w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10 dark:ring-white/20", colors.bg)}
                            style={colors.dotStyle}
                          />
                          <UserRound
                            className={cn("h-3 w-3 flex-shrink-0", colors.text || 'text-muted-foreground')}
                            style={colors.iconStyle}
                          />
                          <span className="text-sm font-medium truncate text-foreground">
                            {staff.name}
                          </span>
                        </div>

                        {/* Task Checkbox */}
                        <div className="col-span-3 flex justify-center">
                          <Checkbox
                            id={`staff-${staff.id}-task`}
                            checked={showStaffTasks}
                            onCheckedChange={(checked) => {
                              handleStaffTaskToggle(staffId, checked === true)
                            }}
                            className="border-blue-300 data-[state=checked]:bg-blue-300 data-[state=checked]:border-blue-300"
                          />
                        </div>

                        {/* Events Checkbox */}
                        <div className="col-span-3 flex justify-center">
                          <Checkbox
                            id={`staff-${staff.id}-event`}
                            checked={showStaffEvents}
                            onCheckedChange={(checked) => {
                              handleStaffEventToggle(staffId, checked === true)
                            }}
                            className="border-purple-300 data-[state=checked]:bg-purple-300 data-[state=checked]:border-purple-300"
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
                  <div className="mt-2 border-t pt-2">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
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
                    <p className="text-sm text-muted-foreground">
                      {staffSearch ? 'No staff matching search' : 'No staff found'}
                    </p>
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
