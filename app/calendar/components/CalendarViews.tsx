'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, CalendarCheck, X, Edit2, PartyPopper, UserRound } from 'lucide-react'
import type { Task, Event } from '@/app/calendar/types/calendar'
import { MALAYSIA_STATES } from '@/app/settings-admin/types'
import { getItemStyleClasses, getItemBgClass, getBadgeClass, getDotClass, getSolidClass } from '@/lib/colors'

interface StaffFilters {
  [staffId: string]: {
    tasks: boolean
    events: boolean
  }
}

const getItemStyle = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = 'blue'
  }
  
  return getItemStyleClasses(colorKey)
}

const holidayStyle = 'bg-emerald-600 text-black cursor-pointer hover:bg-emerald-700 transition-colors dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400'

const shouldDisableTouchRangeDrag = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)').matches

const getTaskDisplayText = (item: any) => {
  const jobTask = item.jobTask || 'No Job Task'
  const clientName = item.clientName || 'No Client'
  
  let staffText = item.task_pic_name || 'No PIC'
  if (item.task_support_names && item.task_support_names.length > 0) {
    staffText += ` + ${item.task_support_names.join(', ')}`
  }

  return `${jobTask} - ${clientName} (${staffText})`
}

const getTaskDisplayElement = (item: any) => {
  const jobTask = item.jobTask || 'No Job Task'
  const clientName = item.clientName || 'No Client'
  const picText = item.task_pic_name || 'No PIC'
  const supportText = item.task_support_names && item.task_support_names.length > 0
    ? `, ${item.task_support_names.join(',')}`
    : ''
  
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate font-medium">
        {jobTask} - {clientName}
      </span>
      <div className="ml-2 flex min-w-0 flex-shrink items-center gap-1">
        <span className="max-w-24 truncate text-right text-[10px] font-medium opacity-90 sm:max-w-32">
          {picText}{supportText}
        </span>
      </div>
    </div>
  )
}

const getEventDisplayText = (item: any) => {
  let staffText = item.event_pic_name || 'No PIC'
  if (item.event_support_names && item.event_support_names.length > 0) {
    staffText += ` + ${item.event_support_names.join(', ')}`
  }
  return `${item.title} (${staffText})`
}

const getEventDisplayElement = (item: any) => {
  const hasPIC = item.event_pic_name || item.event_pic_id
  const picName = item.event_pic_name || 'No PIC'
  
  const supportNames = item.event_support_names || []
  const supportText = supportNames.length > 0 
    ? ` + ${supportNames.join(', ')}` 
    : ''
  
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate font-medium">
        {item.title}
      </span>
      {hasPIC && (
        <div className="flex min-w-0 flex-shrink items-center gap-1">
          <span className="max-w-24 truncate text-right text-[10px] font-medium opacity-90 sm:max-w-32">
            {picName}{supportText}
          </span>
        </div>
      )}
    </div>
  )
}

const getEventMiniDisplay = (item: any) => {
  const picName = item.event_pic_name || 'No PIC'
  
  return `${item.title} (${picName})`
}

const getItemIcon = (item: any) => {
  if (item.type === 'task') return '📋'
  if (item.type === 'event') return '📅'
  return '🎉'
}

interface HolidayPopupProps {
  holiday: any
  position?: { x: number; y: number } | null
  onClose: () => void
}

const HolidayPopup: React.FC<HolidayPopupProps> = ({ holiday, position, onClose }) => {
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const getStatesDisplay = () => {
    if (!holiday.states || holiday.states.length === 0 || holiday.states.length === MALAYSIA_STATES.length) {
      return 'This is a national public holiday observed across all states in Malaysia.'
    }
    
    if (holiday.states.length === 1) {
      const state = MALAYSIA_STATES.find(s => s.value === holiday.states[0])
      return `This holiday is observed in ${state?.label || holiday.states[0]}.`
    }
    
    const stateLabels = holiday.states.map((code: string) => 
      MALAYSIA_STATES.find(s => s.value === code)?.label || code
    )
    
    if (holiday.states.length === 2) {
      return `This holiday is observed in ${stateLabels.join(' and ')}.`
    }
    
    const lastState = stateLabels.pop()
    return `This holiday is observed in ${stateLabels.join(', ')} and ${lastState}.`
  }

  const popupStyle: React.CSSProperties | undefined = position
    ? {
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }
    : undefined

  return (
    <div
      className={`fixed inset-0 z-[200] p-3 sm:p-4 ${position ? 'pointer-events-none' : 'flex items-center justify-center bg-black/50'}`}
      onClick={position ? undefined : onClose}
    >
      <div
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100 ${position ? 'pointer-events-auto fixed' : ''}`}
        style={popupStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-lg border-b bg-emerald-600 p-4 text-black dark:bg-emerald-500 dark:text-white">
          <h2 className="flex min-w-0 items-center truncate text-lg font-semibold">
            <span className="mr-2">🎉</span> Public Holiday
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-black hover:bg-emerald-700 dark:text-white dark:hover:bg-emerald-400">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="mb-1 break-words text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-100">{holiday.name}</h3>
            <p className="text-gray-600 dark:text-gray-300">{formatDisplayDate(holiday.date)}</p>
          </div>

          <div className="border-t pt-4 mt-2">
            <div className="flex items-center text-gray-700 mb-2 dark:text-gray-200">
              <CalendarCheck className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Observing States</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 ml-6">
              {getStatesDisplay()}
            </p>
            
            {holiday.states && holiday.states.length > 0 && holiday.states.length !== MALAYSIA_STATES.length && (
              <div className="mt-3 ml-6 flex flex-wrap gap-1">
                {holiday.states.map((stateCode: string) => {
                  const state = MALAYSIA_STATES.find(s => s.value === stateCode)
                  return state ? (
                    <span 
                      key={stateCode}
                      className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full"
                    >
                      {state.label}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end rounded-b-lg border-t bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ItemDetailPopupProps {
  item: any
  type: 'task' | 'event'
  position?: { x: number; y: number } | null
  onClose: () => void
  onEdit: () => void
}

const ItemDetailPopup: React.FC<ItemDetailPopupProps> = ({ item, type, position, onClose, onEdit }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getHeaderColorClass = () => {
    if (type === 'event') {
      return getSolidClass(item.event_pic_color) || 'bg-purple-500'
    } else {
      return getSolidClass(item.task_pic_color) || 'bg-blue-500'
    }
  }

  const getDisplayText = () => {
    if (type === 'event') {
      const eventPicColor = item.event_pic_color || 'purple'
      const eventPicPanelClass = eventPicColor === 'gray'
        ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        : `${getBadgeClass(eventPicColor)} dark:bg-gray-800 dark:text-gray-100`

      return (
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{item.title}</h3>
            </div>
          </div>
          
          <div className="border-t pt-3 mt-2">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>Person In Charge:</span>
            </p>
            <div className={`flex flex-wrap items-center gap-2 rounded-lg p-2 ${eventPicPanelClass}`}>
              <div className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-full ${getDotClass(item.event_pic_color)}`}></span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.event_pic_name || 'No PIC'}
                </span>
              </div>
              
              {item.event_support_names && item.event_support_names.length > 0 && (
                <>
                  <span className="text-gray-400">→</span>
                  {item.event_support_names.map((name: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full ${getDotClass(item.event_support_colors?.[idx])}`}></span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          
          {item.description && (
            <p className="text-gray-700 text-sm mt-3 border-t pt-3 dark:border-gray-800 dark:text-gray-200">📝 {item.description}</p>
          )}
        </div>
      )
    } else {
      const taskPicColor = item.task_pic_color || 'blue'
      const taskPicPanelClass = taskPicColor === 'gray'
        ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        : `${getBadgeClass(taskPicColor)} dark:bg-gray-800 dark:text-gray-100`

      return (
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-2xl mr-3">📋</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {getTaskDisplayText(item)}
              </h3>
            </div>
          </div>
          
          <div className="border-t pt-3 mt-2">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>Person In Charge:</span>
            </p>
            <div className={`flex flex-wrap items-center gap-2 rounded-lg p-2 ${taskPicPanelClass}`}>
              <div className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-full ${getDotClass(item.task_pic_color)}`}></span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.task_pic_name || 'No PIC'}
                </span>
              </div>
              
              {item.task_support_names && item.task_support_names.length > 0 && (
                <>
                  <span className="text-gray-400">→</span>
                  {item.task_support_names.map((name: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full ${getDotClass(item.task_support_colors?.[idx])}`}></span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {item.additionalRemark && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-1 dark:text-gray-400">📝 Remark:</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 p-2 rounded-lg dark:bg-gray-950 dark:text-gray-200">
                {item.additionalRemark}
              </p>
            </div>
          )}
        </div>
      )
    }
  }

  const detailStyle: React.CSSProperties | undefined = position
    ? {
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }
    : undefined

  return (
    <div
      className={`fixed inset-0 z-[110] p-3 sm:p-4 ${
        position
          ? 'pointer-events-none'
          : 'flex items-center justify-center bg-black/50'
      }`}
      onClick={position ? undefined : onClose}
    >
      <div
        className={`pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100 ${position ? 'fixed' : ''}`}
        style={detailStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`flex items-center justify-between gap-3 rounded-t-lg border-b p-4 ${getHeaderColorClass()} text-white`}>
          <h2 className="min-w-0 truncate text-lg font-semibold">
            {type === 'event' ? '📅 Event Details' : '📋 Task Details'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4">
            {getDisplayText()}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              📅 {formatDate(item.dateStart)}
              {item.timeStart && ` at ${item.timeStart}`}
              {item.timeStop && ` - ${item.timeStop}`}
            </p>
            {item.dateStop && item.dateStop !== item.dateStart && (
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                Until {formatDate(item.dateStop)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-b-lg border-t bg-gray-50 p-4 sm:flex-row sm:justify-between dark:border-gray-800 dark:bg-gray-950">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={() => {
              onEdit()
              onClose()
            }}
            className={type === 'event'
              ? 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:text-purple-950 dark:hover:bg-purple-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-400'}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

interface CalendarViewsProps {
  view: 'day' | 'week' | 'month' | 'year' | 'schedule'
  currentDate: Date
  tasks: Task[]
  events: Event[]
  holidays?: any[]
  loading: boolean
  onAddClick: (date: Date, endDate?: Date | null) => void
  onEditTask: (task: Task) => void
  onEditEvent: (event: Event) => void
  onViewChange?: (view: 'day' | 'week' | 'month' | 'year' | 'schedule') => void
  onMonthSelect?: (date: Date) => void
  onDragOver?: (e: React.DragEvent, date: Date) => void
  onDrop?: (e: React.DragEvent, date: Date) => void
  draggedOverDate?: string | null
  isDragging?: boolean
  focusedDateKey?: string | null
  staffTaskEventFilters?: StaffFilters
}

export const CalendarViews: React.FC<CalendarViewsProps> = ({
  view,
  currentDate,
  tasks,
  events,
  holidays = [],
  loading,
  onAddClick,
  onEditTask,
  onEditEvent,
  onViewChange,
  onMonthSelect,
  onDragOver,
  onDrop,
  draggedOverDate,
  isDragging,
  focusedDateKey,
  staffTaskEventFilters = {},
}) => {
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<{item: any, type: 'task' | 'event'} | null>(null)
  const [selectedMoreItems, setSelectedMoreItems] = useState<{date: Date, items: any[], holidays: any[], position: { x: number; y: number }} | null>(null)
  const [selectedYearDate, setSelectedYearDate] = useState<Date | null>(null)
  const [selectedYearPopupPosition, setSelectedYearPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const hiddenStaffFilterCount = Object.values(staffTaskEventFilters).reduce((count, filter) => {
    return count + (filter.tasks === false ? 1 : 0) + (filter.events === false ? 1 : 0)
  }, 0)
  const monthRangeDragStartRef = useRef<Date | null>(null)
  const monthRangeLastDateRef = useRef<Date | null>(null)
  const monthRangeDidMoveRef = useRef(false)
  const monthRangeSuppressClickRef = useRef(false)
  const [monthRangePreview, setMonthRangePreview] = useState<{ start: string; end: string } | null>(null)

  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseDateKey = (dateKey?: string) => {
    if (!dateKey) return null
    const [year, month, day] = dateKey.split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
  }

  const addDays = (date: Date, days: number) => {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + days)
    return nextDate
  }

  const getDayDiff = (start: Date, end: Date) => {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
    return Math.round((endUtc - startUtc) / 86400000)
  }

  const getOrderedDateRange = (start: Date, end: Date) => {
    const fixedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const fixedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return fixedStart <= fixedEnd
      ? { start: fixedStart, end: fixedEnd }
      : { start: fixedEnd, end: fixedStart }
  }

  const isMonthRangeBlockedTarget = (target: HTMLElement) => {
    const targetButton = target.closest('button')
    const isDateSurfaceButton = targetButton?.hasAttribute('data-month-date-key')
    return Boolean(
      target.closest('.calendar-view-item-text,[data-task-id],[data-event-id],[data-month-cell-action]') ||
      (targetButton && !isDateSurfaceButton)
    )
  }

  const startMonthRangeDrag = (date: Date) => {
    monthRangeDragStartRef.current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    monthRangeLastDateRef.current = monthRangeDragStartRef.current
    monthRangeDidMoveRef.current = false
    setMonthRangePreview(null)
  }

  const updateMonthRangeDrag = (date: Date) => {
    if (!monthRangeDragStartRef.current) return
    monthRangeLastDateRef.current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const { start, end } = getOrderedDateRange(monthRangeDragStartRef.current, date)
    if (formatDateKey(start) !== formatDateKey(end)) {
      monthRangeDidMoveRef.current = true
      setMonthRangePreview({ start: formatDateKey(start), end: formatDateKey(end) })
    }
  }

  const finishMonthRangeDrag = (endDate?: Date | null) => {
    if (!monthRangeDragStartRef.current) return
    const startDate = monthRangeDragStartRef.current
    const targetDate = endDate || monthRangeLastDateRef.current || startDate
    const didMove = monthRangeDidMoveRef.current

    monthRangeDragStartRef.current = null
    monthRangeLastDateRef.current = null
    monthRangeDidMoveRef.current = false
    setMonthRangePreview(null)

    if (!didMove) return

    const { start, end } = getOrderedDateRange(startDate, targetDate)
    monthRangeSuppressClickRef.current = true
    onAddClick(start, end)
  }

  const handleMonthRangeMouseDown = (date: Date, e: React.MouseEvent<HTMLElement>) => {
    if (shouldDisableTouchRangeDrag()) return
    if (view !== 'month' || isDragging || e.button !== 0) return
    const target = e.target as HTMLElement
    if (isMonthRangeBlockedTarget(target)) return

    startMonthRangeDrag(date)
  }

  const handleMonthRangeMouseEnter = (date: Date) => {
    if (shouldDisableTouchRangeDrag()) return
    if (!monthRangeDragStartRef.current || view !== 'month' || isDragging) return
    updateMonthRangeDrag(date)
  }

  const handleMonthRangeMouseUp = (date: Date, e: React.MouseEvent<HTMLElement>) => {
    if (shouldDisableTouchRangeDrag()) return
    if (!monthRangeDragStartRef.current || view !== 'month' || isDragging) return
    finishMonthRangeDrag(date)
    e.stopPropagation()
  }

  const handleMonthCellClick = (date: Date) => {
    if (monthRangeSuppressClickRef.current) {
      monthRangeSuppressClickRef.current = false
      return
    }
    handleDateClick(date)
  }

  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!monthRangeDragStartRef.current) return

      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      const dateElement = target?.closest('[data-month-date-key]') as HTMLElement | null
      const dateKey = dateElement?.dataset.monthDateKey
      const date = parseDateKey(dateKey)
      if (!date) return

      updateMonthRangeDrag(date)
    }

    const handleWindowMouseUp = () => {
      finishMonthRangeDrag()
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [])

  const getItemDateRange = (item: any) => {
    const start = parseDateKey(item.dateStart)
    const stop = parseDateKey(item.dateStop || item.dateStart)

    if (!start || !stop) return null
    return start <= stop ? { start, stop } : { start: stop, stop: start }
  }

  const getHolidaysForDate = (date: Date): any[] => {
    const dateKey = formatDateKey(date)
    return holidays.filter(h => h.date === dateKey) || []
  }

  const getMonthHolidays = (year: number, month: number) => {
    return holidays.filter(h => {
      const date = parseDateKey(h.date)
      return date?.getFullYear() === year && date.getMonth() === month
    })
  }

  const isItemOnDate = (item: any, date: Date) => {
    const range = getItemDateRange(item)
    if (!range) return false

    const fixedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return fixedDate >= range.start && fixedDate <= range.stop
  }

  const shouldShowTask = (task: Task): boolean => {
    const assignedStaffIds = [
      task.task_pic_id,
      ...(task.task_support_ids || []),
    ].filter((staffId): staffId is string => Boolean(staffId))

    if (assignedStaffIds.length === 0) return true

    return assignedStaffIds.some(staffId => staffTaskEventFilters[staffId]?.tasks !== false)
  }

  const shouldShowEvent = (event: Event): boolean => {
    const assignedStaffIds = [
      event.event_pic_id,
      ...(event.event_support_ids || []),
    ].filter((staffId): staffId is string => Boolean(staffId))

    if (assignedStaffIds.length === 0) return true

    return assignedStaffIds.some(staffId => staffTaskEventFilters[staffId]?.events !== false)
  }

  const getItemsForDate = (date: Date) => {
    const dateTasks = tasks
      .filter(task => isItemOnDate(task, date) && shouldShowTask(task))
      .map(task => ({ ...task, type: 'task' as const }))
    
    const dateEvents = events
      .filter(event => isItemOnDate(event, date) && shouldShowEvent(event))
      .map(event => ({ ...event, type: 'event' as const }))
    
    const sorted = [...dateTasks, ...dateEvents].sort((a, b) => {
      if (a.timeStart && b.timeStart) return a.timeStart.localeCompare(b.timeStart)
      if (a.timeStart) return -1
      if (b.timeStart) return 1
      return 0
    })
    
    return sorted
  }

  const getVisibleItems = () => {
    const dateTasks = tasks
      .filter(task => shouldShowTask(task))
      .map(task => ({ ...task, type: 'task' as const }))
    
    const dateEvents = events
      .filter(event => shouldShowEvent(event))
      .map(event => ({ ...event, type: 'event' as const }))
    
    return [...dateTasks, ...dateEvents].sort((a, b) => {
      const aRange = getItemDateRange(a)
      const bRange = getItemDateRange(b)
      const aStart = aRange?.start.getTime() || 0
      const bStart = bRange?.start.getTime() || 0
      if (aStart !== bStart) return aStart - bStart
      const aSpan = aRange ? getDayDiff(aRange.start, aRange.stop) : 0
      const bSpan = bRange ? getDayDiff(bRange.start, bRange.stop) : 0
      if (aSpan !== bSpan) return bSpan - aSpan
      if (a.timeStart && b.timeStart) return a.timeStart.localeCompare(b.timeStart)
      if (a.timeStart) return -1
      if (b.timeStart) return 1
      return 0
    })
  }

  const getAllItemsForYearMonth = (year: number, month: number) => {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const items: { date: Date; items: any[]; holidays: any[] }[] = []
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d)
      items.push({
        date,
        items: getItemsForDate(date),
        holidays: getHolidaysForDate(date)
      })
    }
    
    return items
  }

  const formatScheduleTime = (item: any) => {
    if (!item.timeStart) return 'All day'

    const formatTime = (time?: string) => {
      if (!time) return ''
      const [hourValue, minuteValue = '00'] = time.split(':')
      const hour = Number(hourValue)
      if (!Number.isFinite(hour)) return time
      const minute = Number(minuteValue)
      const suffix = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      const minuteText = minute > 0 ? `:${String(minute).padStart(2, '0')}` : ''
      return `${hour12}${minuteText} ${suffix}`
    }

    if (!item.timeStop) return formatTime(item.timeStart)
    return `${formatTime(item.timeStart)} - ${formatTime(item.timeStop)}`
  }

  const getScheduleItemTitle = (item: any) => {
    if (item.type === 'holiday') return item.title || item.name || 'Public Holiday'
    if (item.type === 'event') return item.title || 'Untitled Event'
    return `${item.jobTask || 'Task'} - ${item.clientName || 'No Client'}`
  }

  const getScheduleItemColor = (item: any) => {
    if (item.type === 'holiday') return 'bg-emerald-500'
    return getSolidClass(item.type === 'event' ? item.event_pic_color : item.task_pic_color) || 'bg-blue-500'
  }

  const sortScheduleItems = (items: any[]) => [...items].sort((a, b) => {
    if (!a.timeStart && b.timeStart) return -1
    if (a.timeStart && !b.timeStart) return 1
    if (a.timeStart && b.timeStart) return a.timeStart.localeCompare(b.timeStart)
    return getScheduleItemTitle(a).localeCompare(getScheduleItemTitle(b))
  })

  const formatYearPanelDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleItemClick = (item: any, type: 'task' | 'event', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedItem({ item, type })
  }

  const handleHolidayClick = (holiday: any, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedHoliday(holiday)
  }

  const handleDateClick = (date: Date) => {
    onAddClick(date)
  }

  const handleMoreItemsClick = (date: Date, items: any[], holidays: any[], e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const popupWidth = 240
    const itemCount = items.length + holidays.length
    const popupHeight = Math.min(320, 92 + Math.max(itemCount, 1) * 24)
    const margin = 12
    const hasRoomBelow = rect.bottom + 8 + popupHeight <= window.innerHeight - margin
    const preferredY = hasRoomBelow ? rect.bottom + 8 : rect.top - popupHeight - 8
    const y = Math.min(Math.max(preferredY, margin), window.innerHeight - margin - popupHeight)

    setSelectedMoreItems({
      date,
      items,
      holidays,
      position: {
        x: Math.min(Math.max(rect.left + rect.width / 2, margin + popupWidth / 2), window.innerWidth - margin - popupWidth / 2),
        y,
      },
    })
  }

  const closeMoreItemsPopup = () => {
    setSelectedMoreItems(null)
    setSelectedItem(null)
    setSelectedHoliday(null)
    setSelectedYearDate(null)
    setSelectedYearPopupPosition(null)
  }

  const getDetailPopupPosition = () => {
    if (!selectedMoreItems) return null

    const margin = 12
    const gap = 18
    const listWidth = 240
    const detailWidth = Math.min(448, window.innerWidth - margin * 2)
    const detailHeight = Math.min(560, window.innerHeight - margin * 2)
    const listLeft = selectedMoreItems.position.x - listWidth / 2
    const listRight = selectedMoreItems.position.x + listWidth / 2
    const canFitLeft = listLeft - gap - detailWidth >= margin
    const canFitRight = listRight + gap + detailWidth <= window.innerWidth - margin

    let x = window.innerWidth / 2
    if (canFitLeft) {
      x = listLeft - gap - detailWidth / 2
    } else if (canFitRight) {
      x = listRight + gap + detailWidth / 2
    } else if (listLeft > window.innerWidth - listRight) {
      x = Math.max(margin + detailWidth / 2, listLeft - gap - detailWidth / 2)
    } else {
      x = Math.min(window.innerWidth - margin - detailWidth / 2, listRight + gap + detailWidth / 2)
    }

    const y = Math.min(
      Math.max(selectedMoreItems.position.y + 120, margin + detailHeight / 2),
      window.innerHeight - margin - detailHeight / 2
    )

    return { x, y }
  }

  const handleYearDateClick = (date: Date, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const fixedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const rect = e.currentTarget.getBoundingClientRect()
    const popupWidth = 240
    const dateItems = getItemsForDate(fixedDate)
    const dateHolidays = getHolidaysForDate(fixedDate)
    const itemCount = dateItems.length + dateHolidays.length
    const popupHeight = Math.min(320, 92 + Math.max(itemCount, 1) * 24)
    const margin = 12
    const hasRoomBelow = rect.bottom + 8 + popupHeight <= window.innerHeight - margin
    const preferredY = hasRoomBelow ? rect.bottom + 8 : rect.top - popupHeight - 8
    const y = Math.min(Math.max(preferredY, margin), window.innerHeight - margin - popupHeight)

    setSelectedYearDate(fixedDate)
    setSelectedYearPopupPosition(null)
    setSelectedMoreItems({
      date: fixedDate,
      items: dateItems,
      holidays: dateHolidays,
      position: {
        x: Math.min(Math.max(rect.left + rect.width / 2, margin + popupWidth / 2), window.innerWidth - margin - popupWidth / 2),
        y,
      },
    })
  }

  // Handle month click from year view
  const handleMonthClick = (year: number, month: number) => {
    const newDate = new Date(year, month, 1)
    if (onViewChange) {
      onViewChange('month')
    }
    if (onMonthSelect) {
      onMonthSelect(newDate)
    }
  }

  const renderYearView = () => (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-3 text-gray-900 sm:p-4 dark:bg-gray-950 dark:text-gray-100">
      <h2 className="mb-5 text-center text-2xl font-semibold text-gray-800 sm:mb-6 sm:text-3xl dark:text-gray-100">
        {currentDate.getFullYear()}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {months.map((month, index) => {
          const year = currentDate.getFullYear()
          const monthHolidays = getMonthHolidays(year, index)
          const monthItems = getAllItemsForYearMonth(year, index)
          const totalTasksInMonth = monthItems.reduce((sum, day) => sum + day.items.filter(item => item.type === 'task').length, 0)
          const totalEventsInMonth = monthItems.reduce((sum, day) => sum + day.items.filter(item => item.type === 'event').length, 0)
          const firstDayOfMonth = new Date(year, index, 1).getDay()
          const calendarStart = new Date(year, index, 1 - firstDayOfMonth)

          return (
            <div key={month} className="min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
                <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">{month}</h3>
                {monthHolidays.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <PartyPopper className="h-3 w-3" />
                    {monthHolidays.length}
                  </div>
                )}
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600 dark:text-gray-300">{totalTasksInMonth} Tasks</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  <span className="text-gray-600 dark:text-gray-300">{totalEventsInMonth} Events</span>
                </div>
              </div>

              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={`${day}-${idx}`} className="h-5">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center text-[10px]">
                {Array.from({ length: 42 }, (_, cellIndex) => {
                  const date = addDays(calendarStart, cellIndex)
                  const isCurrentMonth = date.getMonth() === index
                  const isToday = formatDateKey(date) === formatDateKey(new Date())
                  const isSelected = selectedYearDate && formatDateKey(date) === formatDateKey(selectedYearDate)

                  return (
                    <button
                      key={formatDateKey(date)}
                      type="button"
                      className={`mx-auto flex h-5 w-8 items-center justify-center rounded-full text-[10px] transition-colors
                        ${isCurrentMonth ? 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-800'}
                        ${isToday ? 'ring-1 ring-blue-400' : ''}
                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-500' : ''}
                      `}
                      onClick={(e) => handleYearDateClick(date, e)}
                      aria-label={formatYearPanelDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selectedYearDate && selectedYearPopupPosition && (() => {
        const selectedItems = getItemsForDate(selectedYearDate)
        const selectedHolidays = getHolidaysForDate(selectedYearDate)
        const hasDetails = selectedItems.length > 0 || selectedHolidays.length > 0

        return (
          <div
            className="fixed z-[80] w-[260px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-gray-100 p-3 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            style={{ left: selectedYearPopupPosition.x, top: selectedYearPopupPosition.y }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 text-center">
                <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  {selectedYearDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-3xl font-medium leading-tight text-gray-900 dark:text-gray-100">
                  {selectedYearDate.getDate()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedYearDate(null)
                  setSelectedYearPopupPosition(null)
                }}
                aria-label="Close selected date details"
                className="h-7 w-7 shrink-0 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto">
              {selectedHolidays.map(holiday => (
                <button
                  key={`holiday-${holiday.id}`}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs transition-colors hover:bg-white dark:hover:bg-gray-700"
                  onClick={(e) => handleHolidayClick(holiday, e)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-lime-500"></span>
                  <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">Holiday - {holiday.name}</span>
                </button>
              ))}

              {selectedItems.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  data-task-id={item.type === 'task' ? item.id : undefined}
                  data-event-id={item.type === 'event' ? item.id : undefined}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs transition-colors hover:bg-white dark:hover:bg-gray-700"
                  onClick={(e) => handleItemClick(item, item.type, e)}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.type === 'event' ? 'bg-purple-500' : 'bg-lime-500'}`}></span>
                  <span className="shrink-0 text-gray-700 dark:text-gray-300">{item.timeStart || 'All day'}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-100">
                    {item.type === 'event'
                      ? item.title
                      : `${item.jobTask || 'Task'}${item.clientName ? ` - ${item.clientName}` : ''}`}
                  </span>
                </button>
              ))}

              {!hasDetails && (
                <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  No task, event or holiday.
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {selectedHoliday && (
        <HolidayPopup 
          holiday={selectedHoliday} 
          position={getDetailPopupPosition()}
          onClose={() => setSelectedHoliday(null)} 
        />
      )}

      {selectedItem && (
        <ItemDetailPopup
          item={selectedItem.item}
          type={selectedItem.type}
          position={getDetailPopupPosition()}
          onClose={() => setSelectedItem(null)}
          onEdit={() => {
            if (selectedItem.type === 'task') {
              onEditTask(selectedItem.item)
            } else {
              onEditEvent(selectedItem.item)
            }
            setSelectedItem(null)
            setSelectedMoreItems(null)
          }}
        />
      )}

      {selectedMoreItems && (
        <MoreItemsPopup
          date={selectedMoreItems.date}
          items={selectedMoreItems.items}
          holidays={selectedMoreItems.holidays}
          position={selectedMoreItems.position}
          onClose={closeMoreItemsPopup}
          onItemClick={(item, type) => {
            setSelectedItem({ item, type })
          }}
          onHolidayClick={(holiday) => {
            setSelectedHoliday(holiday)
          }}
        />
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex-shrink-0 p-4 border-b bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  {currentDate.toLocaleDateString('default', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h2>
                <div className="mt-1 space-y-1">
                  {getHolidaysForDate(currentDate).map(holiday => (
                    <div 
                      key={holiday.id}
                      className={`calendar-view-item-text mr-2 inline-block rounded-full px-3 py-1 text-sm ${holidayStyle}`}
                      onClick={(e) => handleHolidayClick(holiday, e)}
                    >
                      🎉 {holiday.name}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={() => onAddClick(currentDate)} className="calendar-add-button w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-black dark:hover:bg-blue-400 sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {getItemsForDate(currentDate).filter(item => !item.timeStart).length > 0 && (
              <div className="border-b p-2 bg-blue-50 dark:border-gray-800 dark:bg-blue-950/30">
                <div className="text-xs font-semibold text-blue-600 mb-1">📌 ALL DAY</div>
                {getItemsForDate(currentDate).filter(item => !item.timeStart).map(item => (
                  <div
                    key={`allday-${item.type}-${item.id}`}
                    data-task-id={item.type === 'task' ? item.id : undefined}
                    data-event-id={item.type === 'event' ? item.id : undefined}
                    className={`calendar-view-item-text p-2 mb-1 rounded-lg cursor-pointer text-sm ${getItemStyle(item)}`}
                    onClick={(e) => handleItemClick(item, item.type, e)}
                  >
                    <span className="mr-2">{getItemIcon(item)}</span>
                    {item.type === 'task' ? getTaskDisplayElement(item) : getEventDisplayElement(item)}
                  </div>
                ))}
              </div>
            )}

            {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
              const hourItems = getItemsForDate(currentDate).filter(item => {
                if (!item.timeStart) return false
                const itemHour = parseInt(item.timeStart.split(':')[0])
                return itemHour === hour
              })

              const isCurrentHour = new Date().getHours() === hour && 
                formatDateKey(new Date()) === formatDateKey(currentDate)

              return (
                <div 
                  key={hour} 
                  className={`flex border-b min-h-[60px] hover:bg-gray-50 cursor-pointer dark:border-gray-800 dark:hover:bg-gray-900/70 ${
                    isCurrentHour ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                  }`}
                  onClick={() => handleDateClick(currentDate)}
                >
                  <div className="w-20 p-2 text-right text-sm text-gray-500 border-r dark:border-gray-800 dark:text-gray-400">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 p-1 relative">
                    {hourItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        data-task-id={item.type === 'task' ? item.id : undefined}
                        data-event-id={item.type === 'event' ? item.id : undefined}
                        className={`calendar-view-item-text p-2 mb-1 rounded-lg cursor-pointer text-sm ${getItemStyle(item)}`}
                        onClick={(e) => handleItemClick(item, item.type, e)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2">{getItemIcon(item)}</span>
                          <div className="flex-1">
                            {item.type === 'task' ? getTaskDisplayElement(item) : getEventDisplayElement(item)}
                          </div>
                          {item.timeStop && (
                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                              {item.timeStart}-{item.timeStop}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="h-full overflow-x-auto bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex h-full min-w-[760px] flex-col">
          <div className="sticky top-0 z-10 grid flex-shrink-0 grid-cols-8 divide-x border-b bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            <div className="p-2 bg-gray-50 dark:bg-gray-900"></div>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(currentDate)
              date.setDate(currentDate.getDate() - currentDate.getDay() + i)
              const isToday = formatDateKey(date) === formatDateKey(new Date())
              const dayHolidays = getHolidaysForDate(date)
              
              return (
                <div 
                  key={i} 
                  className={`p-2 text-center ${isToday ? 'bg-blue-50 dark:bg-blue-950/40' : ''} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="font-semibold text-sm">{weekDays[date.getDay()]}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayHolidays.map(holiday => (
                      <div 
                        key={holiday.id}
                        className={`calendar-view-item-text truncate rounded-full px-1 py-0.5 text-[10px] ${holidayStyle}`}
                        onClick={(e) => handleHolidayClick(holiday, e)}
                      >
                        🎉 {holiday.name}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 grid grid-cols-8 divide-x border-b bg-gray-50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              <div className="p-2 text-right text-xs text-gray-500 dark:text-gray-400">All day</div>
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(currentDate)
                date.setDate(currentDate.getDate() - currentDate.getDay() + i)
                const allDayItems = getItemsForDate(date).filter(item => !item.timeStart)
                const dayHolidays = getHolidaysForDate(date)
                
                return (
                  <div key={i} className="p-1 min-h-[60px]">
                    {dayHolidays.map(holiday => (
                      <div 
                        key={holiday.id}
                        className={`calendar-view-item-text mb-1 truncate rounded p-1 text-xs ${holidayStyle}`}
                        onClick={(e) => handleHolidayClick(holiday, e)}
                      >
                        🎉 {holiday.name}
                      </div>
                    ))}
                    {allDayItems.map((item) => (
                      <div
                        key={`allday-${item.type}-${item.id}`}
                        data-task-id={item.type === 'task' ? item.id : undefined}
                        data-event-id={item.type === 'event' ? item.id : undefined}
                        className={`calendar-view-item-text p-1 mb-1 rounded text-xs cursor-pointer truncate ${getItemStyle(item)}`}
                        onClick={(e) => handleItemClick(item, item.type, e)}
                      >
                        {item.type === 'task' ? getTaskDisplayElement(item) : getEventDisplayElement(item)}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
              <div key={hour} className="grid grid-cols-8 divide-x min-h-[60px] border-b dark:divide-gray-800 dark:border-gray-800">
                <div className="p-1 text-right text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 dark:text-gray-400">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(currentDate)
                  date.setDate(currentDate.getDate() - currentDate.getDay() + i)
                  const hourItems = getItemsForDate(date).filter(item => {
                    if (!item.timeStart) return false
                    const itemHour = parseInt(item.timeStart.split(':')[0])
                    return itemHour === hour
                  })

                  return (
                    <div 
                      key={i} 
                      className="relative p-1 hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-900/70"
                      onClick={() => handleDateClick(date)}
                      onDragOver={(e) => onDragOver?.(e, date)}
                      onDrop={(e) => onDrop?.(e, date)}
                    >
                      {hourItems.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          data-task-id={item.type === 'task' ? item.id : undefined}
                          data-event-id={item.type === 'event' ? item.id : undefined}
                          className={`calendar-view-item-text p-1 mb-1 rounded text-xs cursor-pointer truncate ${getItemStyle(item)}`}
                          onClick={(e) => handleItemClick(item, item.type, e)}
                        >
                          <span className="mr-1">{getItemIcon(item)}</span>
                          {item.type === 'task' ? getTaskDisplayElement(item) : getEventDisplayElement(item)}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="h-full overflow-hidden md:overflow-x-auto">
            <div className="flex h-full w-full min-w-0 flex-col overflow-hidden md:min-w-[720px]">
            <div className="grid flex-shrink-0 grid-cols-7 border-b border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
              {weekDays.map(day => (
                <div key={day} className="py-2 text-center text-[10px] font-semibold text-gray-700 sm:text-xs md:text-sm dark:text-gray-200">
                  {day}
                </div>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto lg:flex lg:flex-col">
            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()
              const firstDay = new Date(year, month, 1).getDay()
              const calendarStart = new Date(year, month, 1 - firstDay)
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const totalCells = Math.max(35, Math.ceil((firstDay + daysInMonth) / 7) * 7)
              const visibleCalendarItems = getVisibleItems()
              const weeks: Date[][] = []
              
              for (let i = 0; i < totalCells; i++) {
                const weekIndex = Math.floor(i / 7)
                if (!weeks[weekIndex]) weeks[weekIndex] = []
                weeks[weekIndex].push(addDays(calendarStart, i))
              }

              return weeks.map((week, weekIndex) => {
                const weekStart = week[0]
                const weekEnd = week[6]
                const lanes: { endCol: number }[] = []
                const MAX_MONTH_RANGE_LANES = 2
                const MONTH_RANGE_ITEM_HEIGHT = 16
                const MONTH_RANGE_LANE_HEIGHT = 18
                const MONTH_CELL_CONTENT_TOP = 30
                const weekSegments = visibleCalendarItems
                  .map(item => {
                    const range = getItemDateRange(item)
                    if (!range || range.stop < weekStart || range.start > weekEnd) return null
                    const segmentStart = range.start < weekStart ? weekStart : range.start
                    const segmentEnd = range.stop > weekEnd ? weekEnd : range.stop
                    const colStart = getDayDiff(weekStart, segmentStart)
                    const colEnd = getDayDiff(weekStart, segmentEnd)
                    return {
                      item,
                      range,
                      colStart,
                      colEnd,
                      rangeLength: getDayDiff(range.start, range.stop) + 1,
                      continuesBefore: range.start < weekStart,
                      continuesAfter: range.stop > weekEnd,
                    }
                  })
                  .filter(Boolean)
                  .sort((a: any, b: any) => {
                    if (a.colStart !== b.colStart) return a.colStart - b.colStart
                    if (b.rangeLength !== a.rangeLength) return b.rangeLength - a.rangeLength
                    return a.colEnd - b.colEnd
                  })
                  .map((segment: any) => {
                    const lane = lanes.findIndex(existingLane => existingLane.endCol < segment.colStart)
                    const laneIndex = lane === -1 ? lanes.length : lane
                    lanes[laneIndex] = { endCol: segment.colEnd }
                    return {
                      ...segment,
                      laneIndex,
                    }
                  })
                const previewStart = parseDateKey(monthRangePreview?.start)
                const previewEnd = parseDateKey(monthRangePreview?.end)
                const previewSegment = previewStart && previewEnd && previewEnd >= weekStart && previewStart <= weekEnd
                  ? {
                      colStart: getDayDiff(weekStart, previewStart < weekStart ? weekStart : previewStart),
                      colEnd: getDayDiff(weekStart, previewEnd > weekEnd ? weekEnd : previewEnd),
                      continuesBefore: previewStart < weekStart,
                      continuesAfter: previewEnd > weekEnd,
                    }
                  : null
                return (
                  <div key={`range-week-${weekIndex}`} className="relative grid min-h-[150px] grid-cols-7 border-b border-gray-200 sm:min-h-[140px] lg:min-h-[92px] lg:flex-1 dark:border-gray-800">
                    {week.map((date, dayIndex) => {
                      const dateKey = formatDateKey(date)
                      const isToday = dateKey === formatDateKey(new Date())
                      const isFocusedDate = dateKey === focusedDateKey
                      const isCurrentMonth = date.getMonth() === month
                      const isHighlightedDate = isToday || isFocusedDate
                      const dayHolidays = getHolidaysForDate(date)
                      const rangesOnDay = weekSegments.filter((segment: any) =>
                        segment.colStart <= dayIndex &&
                        segment.colEnd >= dayIndex
                      )
                      const dayRangeItems = rangesOnDay.map((segment: any) => segment.item)
                      const visibleRangeCount = rangesOnDay.filter((segment: any) => segment.laneIndex < MAX_MONTH_RANGE_LANES).length
                      const visibleHolidayCount = Math.max(0, Math.min(dayHolidays.length, 2 - visibleRangeCount))
                      const visibleLineCount = visibleRangeCount + visibleHolidayCount
                      const totalLineCount = rangesOnDay.length + dayHolidays.length
                      const moreCount = visibleLineCount >= 2 ? Math.max(0, totalLineCount - 2) : 0
                      const visibleHolidays = dayHolidays.slice(0, visibleHolidayCount)
                      return (
                        <div
                          key={dateKey}
                          data-month-date-key={dateKey}
                          className={`
                            relative min-h-[150px] cursor-pointer border-r border-gray-200 p-1 pt-1.5 sm:min-h-[140px] lg:min-h-[92px] lg:pb-7
                            hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60
                            ${isCurrentMonth ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900/80'}
                            ${isToday ? 'bg-blue-50 dark:bg-blue-950/40' : ''}
                            ${isFocusedDate ? 'ring-2 ring-blue-600 ring-inset dark:ring-blue-400' : ''}
                            ${draggedOverDate === dateKey ? 'bg-blue-100 border-2 border-dashed border-blue-400 dark:bg-blue-950/60 dark:border-blue-400' : ''}
                          `}
                          onMouseDown={(e) => handleMonthRangeMouseDown(date, e)}
                          onMouseEnter={() => handleMonthRangeMouseEnter(date)}
                          onMouseUp={(e) => handleMonthRangeMouseUp(date, e)}
                          onClick={() => handleMonthCellClick(date)}
                        >
                          <button
                            type="button"
                            data-month-date-key={dateKey}
                            className="absolute inset-0 z-10 cursor-pointer touch-pan-y bg-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                            aria-label={`Add item on ${dateKey}`}
                            onMouseDown={(e) => handleMonthRangeMouseDown(date, e)}
                            onMouseEnter={() => handleMonthRangeMouseEnter(date)}
                            onMouseUp={(e) => handleMonthRangeMouseUp(date, e)}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (monthRangeSuppressClickRef.current) {
                                monthRangeSuppressClickRef.current = false
                                return
                              }
                              onAddClick(date)
                            }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="pointer-events-none relative z-20 flex h-6 items-center gap-1 text-[12px] font-medium">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]
                                  ${isHighlightedDate ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                                `}
                              >
                                {date.getDate()}
                              </span>
                              {date.getDate() === 1 && (
                                <span className={isCurrentMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                                  {months[date.getMonth()].slice(0, 3)}
                                </span>
                              )}
                            </span>

                          </div>

                          <div className="mt-1 space-y-0.5">
                            {visibleHolidays.map(holiday => (
                              <div
                                key={`holiday-${holiday.id}`}
                                data-month-cell-action
                                className={`calendar-view-item-text absolute left-1 right-1 z-20 h-[16px] truncate rounded px-1 text-[12px] leading-[16px] sm:px-1.5 ${holidayStyle}`}
                                style={{
                                  top: `${MONTH_CELL_CONTENT_TOP + (visibleRangeCount + visibleHolidays.indexOf(holiday)) * MONTH_RANGE_LANE_HEIGHT}px`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleHolidayClick(holiday, e)
                                }}
                              >
                                {holiday.name}
                              </div>
                            ))}
                          </div>

                          {moreCount > 0 && (
                            <button
                              type="button"
                              data-month-cell-action
                              className="absolute left-1 right-1 z-30 h-[16px] truncate rounded bg-blue-50 px-1 text-left text-[12px] font-medium leading-[16px] text-blue-700 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-200 dark:hover:bg-blue-900/80"
                              style={{
                                top: `${MONTH_CELL_CONTENT_TOP + 2 * MONTH_RANGE_LANE_HEIGHT}px`,
                              }}
                              onClick={(e) => handleMoreItemsClick(date, dayRangeItems, dayHolidays, e)}
                            >
                              {moreCount} more
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {previewSegment && (
                      <div
                        className={`
                          pointer-events-none absolute z-50 h-[18px] truncate rounded bg-sky-500 px-1.5 text-[10px] font-semibold leading-[18px] text-white shadow-md
                          ${previewSegment.continuesBefore ? 'rounded-l-none' : 'rounded-l'}
                          ${previewSegment.continuesAfter ? 'rounded-r-none' : 'rounded-r'}
                        `}
                        style={{
                          left: `calc(${(previewSegment.colStart / 7) * 100}% + 2px)`,
                          width: `calc(${((previewSegment.colEnd - previewSegment.colStart + 1) / 7) * 100}% - 4px)`,
                          top: `${MONTH_CELL_CONTENT_TOP}px`,
                        }}
                      >
                        (No title)
                      </div>
                    )}

                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-1 overflow-hidden"
                      style={{ top: `${MONTH_CELL_CONTENT_TOP}px` }}
                    >
                      {weekSegments.map((segment: any) => {
                        const { item, range, colStart, colEnd, laneIndex, continuesBefore, continuesAfter } = segment
                        const span = colEnd - colStart + 1
                        if (laneIndex >= MAX_MONTH_RANGE_LANES) return null

                        return (
                          <div
                            key={`${item.type}-${item.id}-${weekIndex}`}
                            data-task-id={item.type === 'task' ? item.id : undefined}
                            data-event-id={item.type === 'event' ? item.id : undefined}
                            className={`
                              calendar-view-item-text pointer-events-auto absolute z-30 h-[20px] cursor-pointer truncate px-1 text-[12px] leading-[16px] shadow-sm sm:px-1.5
                              ${getItemStyle(item)}
                              ${continuesBefore ? 'rounded-l-none' : 'rounded-l'}
                              ${continuesAfter ? 'rounded-r-none' : 'rounded-r'}
                            `}
                            style={{
                              left: `calc(${(colStart / 7) * 100}% + 2px)`,
                              width: `calc(${(span / 7) * 100}% - 4px)`,
                              top: `${laneIndex * MONTH_RANGE_LANE_HEIGHT}px`,
                              height: `${MONTH_RANGE_ITEM_HEIGHT}px`,
                            }}
                            onClick={(e) => handleItemClick(item, item.type, e)}
                            title={item.type === 'task' ? getTaskDisplayText(item) : getEventDisplayText(item)}
                          >
                            <span className="font-medium">
                              {range.start < weekStart ? '' : `${getItemIcon(item)} `}
                              {item.type === 'task'
                                ? `${item.jobTask || 'No Job Task'} - ${item.clientName || 'No Client'} (${item.task_pic_name || 'No PIC'})`
                                : getEventMiniDisplay(item)
                              }
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
            </div>
            </div>
          </div>
      )}

      {/* YEAR VIEW */}
      {view === 'year' && renderYearView()}
      {false && view === 'year' && (
        <div className="flex h-full flex-col overflow-y-auto p-3 text-gray-900 sm:p-4 dark:text-gray-100">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-800 sm:mb-6 sm:text-3xl dark:text-gray-100">
            {currentDate.getFullYear()}
          </h2>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
            {months.map((month, index) => {
              const monthHolidays = getMonthHolidays(currentDate.getFullYear(), index)
              const monthItems = getAllItemsForYearMonth(currentDate.getFullYear(), index)
              const totalTasksInMonth = monthItems.reduce((sum, day) => sum + day.items.filter(i => i.type === 'task').length, 0)
              const totalEventsInMonth = monthItems.reduce((sum, day) => sum + day.items.filter(i => i.type === 'event').length, 0)
              const totalHolidaysInMonth = monthHolidays.length
              const daysWithItems = monthItems.filter(day => day.items.length > 0 || day.holidays.length > 0).slice(0, 3)
              const firstDayOfMonth = new Date(currentDate.getFullYear(), index, 1).getDay()
              const daysInMonth = new Date(currentDate.getFullYear(), index + 1, 0).getDate()
              const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7 

              return (
                <div 
                  key={month} 
                  className="border rounded-xl p-4 hover:shadow-xl transition-all cursor-pointer bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={() => handleMonthClick(currentDate.getFullYear(), index)}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{month}</h3>
                    <div className="flex flex-wrap gap-1">
                      {totalHolidaysInMonth > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          🎉 {totalHolidaysInMonth}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-600 dark:text-gray-300">{totalTasksInMonth} Tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-gray-600 dark:text-gray-300">{totalEventsInMonth} Events</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 mb-3 text-center text-[8px] font-medium text-gray-400 dark:text-gray-500">
                    {['S', 'M', 'T', 'W', 'Th', 'F', 'S'].map((day, idx) => (
                      <div key={idx}>{day}</div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                    {(() => {
                      const previewDays = []
                      
                      for (let i = 0; i < firstDayOfMonth; i++) {
                        previewDays.push(<div key={`empty-${i}`} className="h-5"></div>)
                      }
                      
                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(currentDate.getFullYear(), index, day)
                        const itemsOnDay = getItemsForDate(date)
                        const hasItems = itemsOnDay.length > 0 || getHolidaysForDate(date).length > 0
                        const isToday = formatDateKey(date) === formatDateKey(new Date())
                        
                        previewDays.push(
                          <div 
                            key={day} 
                            className={`h-5 flex items-center justify-center rounded-full text-[9px] font-medium
                              ${hasItems ? 'bg-blue-100 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}
                              ${isToday ? 'ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-950/80' : ''}
                            `}
                          >
                            {day}
                          </div>
                        )
                      }
                      
                      const remainingCells = totalCells - (firstDayOfMonth + daysInMonth)
                      for (let i = 0; i < remainingCells; i++) {
                        previewDays.push(<div key={`next-empty-${i}`} className="h-5"></div>)
                      }
                      
                      return previewDays
                    })()}
                  </div>
                  {daysWithItems.length === 0 && (
                    <div className="mt-3 pt-2 border-t text-center text-[10px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
                      No items this month
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE VIEW */}
      {view === 'schedule' && (
        <div className="flex h-full flex-col overflow-hidden bg-white text-gray-900 dark:bg-[#202124] dark:text-white">
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()
              
              const monthData = getAllItemsForYearMonth(year, month)
              const datesWithItems = monthData.filter(day => day.items.length > 0 || day.holidays.length > 0)
              
              if (datesWithItems.length === 0) {
                return (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-base font-medium text-gray-700 sm:text-lg dark:text-gray-200">No tasks or events for {months[month]} {year}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {hiddenStaffFilterCount > 0 
                        ? 'Try enabling more staff filters to see more items.'
                        : 'Add tasks or events to get started.'}
                    </p>
                  </div>
                )
              }
              
              return (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {datesWithItems.map(({ date, items, holidays: dayHolidays }) => {
                    const isToday = formatDateKey(date) === formatDateKey(new Date())
                    const scheduleItems = sortScheduleItems([
                      ...items,
                      ...dayHolidays.map((holiday: any) => ({
                        ...holiday,
                        type: 'holiday' as const,
                        title: holiday.name,
                      })),
                    ])
                    
                    return (
                      <div 
                        key={formatDateKey(date)} 
                        className={`grid grid-cols-[54px_minmax(0,1fr)] gap-1 px-3 py-2 sm:grid-cols-[76px_minmax(120px,160px)_minmax(0,1fr)] sm:gap-4 sm:px-5 ${
                          isToday ? 'bg-blue-50 dark:bg-white/[0.04]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="flex flex-col items-center gap-0.5 pt-0.5 text-left sm:grid sm:grid-cols-[24px_1fr] sm:items-start sm:gap-2"
                          onClick={() => handleDateClick(date)}
                        >
                          <span className="text-lg font-medium leading-none text-gray-900 sm:text-base sm:font-bold dark:text-gray-100">{date.getDate()}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:pt-0.5 sm:text-[11px] dark:text-gray-400">
                            <span className="hidden sm:inline">{months[date.getMonth()].slice(0, 3)}, </span>
                            {weekDays[date.getDay()]}
                          </span>
                        </button>

                        <div className="col-start-2 space-y-1 sm:hidden">
                          {scheduleItems.map(item => {
                            const colorClass = getScheduleItemColor(item)
                            const title = getScheduleItemTitle(item)

                            return (
                              <button
                                key={`${item.type}-${item.id}`}
                                data-task-id={item.type === 'task' ? item.id : undefined}
                                data-event-id={item.type === 'event' ? item.id : undefined}
                                className={`calendar-view-item-text block w-full rounded-[5px] px-2.5 py-1.5 text-left text-[15px] font-semibold leading-snug text-black ${colorClass}`}
                                onClick={(e) => {
                                  if (item.type === 'holiday') {
                                    handleHolidayClick(item, e)
                                  } else {
                                    handleItemClick(item, item.type, e)
                                  }
                                }}
                              >
                                <span className="block break-words">{title}</span>
                                {formatScheduleTime(item) !== 'All day' && (
                                  <span className="mt-0.5 block text-[13px] font-normal leading-snug">{formatScheduleTime(item)}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        <div className="hidden space-y-2 sm:col-start-2 sm:col-span-2 sm:block">
                          {scheduleItems.map(item => (
                            <button
                              key={`${item.type}-${item.id}-time`}
                              className="grid w-full grid-cols-[14px_minmax(104px,150px)_minmax(0,1fr)] items-start gap-3 text-left"
                              onClick={(e) => {
                                if (item.type === 'holiday') {
                                  handleHolidayClick(item, e)
                                } else {
                                  handleItemClick(item, item.type, e)
                                }
                              }}
                            >
                              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${getScheduleItemColor(item)}`}></span>
                              <span className="text-xs font-semibold leading-5 text-gray-800 dark:text-gray-100">{formatScheduleTime(item)}</span>
                              <span className="break-words text-sm font-semibold leading-5 text-gray-900 dark:text-gray-100">{getScheduleItemTitle(item)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

interface MoreItemsPopupProps {
  date: Date
  items: any[]
  holidays: any[]
  position: { x: number; y: number }
  onClose: () => void
  onItemClick: (item: any, type: 'task' | 'event') => void
  onHolidayClick: (holiday: any) => void
}

const MoreItemsPopup: React.FC<MoreItemsPopupProps> = ({ 
  date, 
  items, 
  holidays,
  position,
  onClose, 
  onItemClick,
  onHolidayClick
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getItemIconLocal = (item: any) => {
    if (item.type === 'task') return '📋'
    if (item.type === 'event') return '📅'
    return '🎉'
  }

  const getItemDisplayText = (item: any) => {
    if (item.type === 'holiday') {
      return item.name
    }
    if (item.type === 'event') {
      return getEventDisplayText(item)
    }
    if (item.type === 'task') {
      return getTaskDisplayText(item)
    }
    return ''
  }

  const groupedItems = {
    holidays: holidays.map(h => ({ ...h, type: 'holiday' as const })),
    tasks: items.filter(item => item.type === 'task'),
    events: items.filter(item => item.type === 'event')
  }

  const sortByTime = (a: any, b: any) => {
    if (a.timeStart && b.timeStart) return a.timeStart.localeCompare(b.timeStart)
    if (a.timeStart) return -1
    if (b.timeStart) return 1
    return 0
  }

  groupedItems.tasks.sort(sortByTime)
  groupedItems.events.sort(sortByTime)

  const allItems = [
    ...groupedItems.holidays,
    ...groupedItems.tasks,
    ...groupedItems.events
  ]

  const getCompactLabel = (item: any) => {
    if (item.type === 'holiday') return item.name

    if (item.type === 'event') {
      const picName = item.event_pic_name || 'No PIC'
      const supportNames = Array.isArray(item.event_support_names) ? item.event_support_names : []
      const staffText = [picName, ...supportNames].filter(Boolean).join(' + ')
      const eventText = item.title || getEventMiniDisplay(item)

      return `${eventText}${staffText ? ` (${staffText})` : ''}`
    }

    const picName = item.task_pic_name || 'No PIC'
    const supportNames = Array.isArray(item.task_support_names) ? item.task_support_names : []
    const staffText = [picName, ...supportNames].filter(Boolean).join(' + ')
    const taskText = `${item.jobTask || 'Task'}${item.clientName ? ` - ${item.clientName}` : ''}`

    return `${taskText}${staffText ? ` (${staffText})` : ''}`
  }

  const getCompactClass = (item: any) => {
    if (item.type === 'holiday') return holidayStyle
    if (item.type === 'event') return getSolidClass(item.event_pic_color) || 'bg-purple-500'
    return getSolidClass(item.task_pic_color) || 'bg-blue-500'
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        className="fixed z-[100] w-[240px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-gray-100 p-3 text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 text-center">
            <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-3xl font-medium leading-tight text-gray-900 dark:text-gray-100">
              {date.getDate()}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close more items"
            className="h-7 w-7 shrink-0 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {allItems.map((item: any) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              className={`calendar-view-item-text flex h-5 w-full items-center rounded px-1.5 text-left text-xs font-semibold leading-5 shadow-sm ${getCompactClass(item)}`}
              onClick={(e) => {
                e.stopPropagation()
                if (item.type === 'holiday') {
                  onHolidayClick(item)
                } else {
                  onItemClick(item, item.type)
                }
              }}
            >
              <span className="mr-1 shrink-0">{getItemIconLocal(item)}</span>
              <span className="min-w-0 flex-1 truncate">{getCompactLabel(item)}</span>
            </button>
          ))}

          {allItems.length === 0 && (
            <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
              No task, event or holiday.
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="flex max-h-[82vh] w-full max-w-[500px] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-gray-100 rounded-t-xl dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 text-lg dark:text-gray-100">
                {formatDate(date)}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-200">
                  Total: {allItems.length} item{allItems.length !== 1 ? 's' : ''}
                </span>
                {holidays.length > 0 && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-black dark:bg-emerald-500 dark:text-white">
                    🎉 {holidays.length} holiday{holidays.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:bg-gray-200 rounded-full dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 bg-gray-50 dark:bg-gray-950">
          {allItems.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No items for this date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item: any) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`
                    group relative bg-white rounded-lg p-3 cursor-pointer transition-all dark:bg-gray-900 dark:text-gray-100
                    hover:shadow-md border-l-4 hover:scale-[1.02] active:scale-[0.99]
                    ${item.type === 'holiday' ? 'border-l-green-500 hover:border-l-green-600' : 
                      item.type === 'event' ? `border-l-${item.event_pic_color || 'purple'}-500` : 
                      `border-l-${item.task_pic_color || 'blue'}-500`}
                    border border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.type === 'holiday') {
                      onClose()
                      onHolidayClick(item)
                    } else {
                      onClose()
                      onItemClick(item, item.type)
                    }
                  }}
                >
                  <div className="absolute -right-2 -top-2">
                    <span className={`
                      text-[10px] px-2 py-0.5 rounded-full shadow-sm
                      ${item.type === 'holiday' ? 'bg-green-500 text-black dark:text-white' :
                        item.type === 'event' ? getSolidClass(item.event_pic_color) :
                        getSolidClass(item.task_pic_color)}
                    `}>
                      {item.type === 'holiday' ? 'Holiday' : item.type === 'event' ? 'Event' : 'Task'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-lg
                      ${item.type === 'holiday' ? 'bg-green-100' : 
                        item.type === 'event' ? getItemBgClass(item.event_pic_color) : 
                        getItemBgClass(item.task_pic_color)}
                    `}>
                      {getItemIconLocal(item)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words pr-16">
                        {getItemDisplayText(item)}
                      </div>
                      
                      <div className="mt-2 space-y-1.5">
                        {item.timeStart && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <span className="text-gray-400">🕒</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {item.timeStart}
                              {item.timeStop && ` - ${item.timeStop}`}
                            </span>
                          </div>
                        )}

                        {item.type === 'task' && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">👥 Staff:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${getDotClass(item.task_pic_color)}`}></span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">PIC: {item.task_pic_name || 'No PIC'}</span>
                              </div>
                              {item.task_support_names && item.task_support_names.map((name: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className="text-gray-300 dark:text-gray-600">+</span>
                                  <span className={`w-2 h-2 rounded-full ${getDotClass(item.task_support_colors?.[idx])}`}></span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.type === 'event' && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">👥 Staff:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${getDotClass(item.event_pic_color)}`}></span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">PIC: {item.event_pic_name || 'No PIC'}</span>
                              </div>
                              {item.event_support_names && item.event_support_names.map((name: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className="text-gray-300 dark:text-gray-600">+</span>
                                  <span className={`w-2 h-2 rounded-full ${getDotClass(item.event_support_colors?.[idx])}`}></span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.type === 'holiday' && item.states && item.states.length > 0 && item.states.length !== MALAYSIA_STATES.length && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">🗺️</span>
                            {item.states.slice(0, 3).map((stateCode: string) => {
                              const state = MALAYSIA_STATES.find(s => s.value === stateCode)
                              return state ? (
                                <span 
                                  key={stateCode}
                                  className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full"
                                >
                                  {state.label}
                                </span>
                              ) : null
                            })}
                            {item.states.length > 3 && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                +{item.states.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {item.type === 'task' && item.jobStatus && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">📊 Status:</span>
                            <span className={`
                              px-2 py-0.5 rounded-full text-[10px] font-medium
                              ${item.jobStatus === 'completed' ? 'bg-green-100 text-green-700' : ''}
                              ${item.jobStatus === 'ongoing' ? 'bg-green-100 text-green-700' : ''}
                              ${item.jobStatus === 'upcoming' ? 'bg-blue-100 text-blue-700' : ''}
                              ${item.jobStatus === 'in-progress' ? 'bg-yellow-200 text-yellow-900' : ''}
                              ${item.jobStatus === 'incomplete' ? 'bg-red-200 text-red-900' : ''}
                            `}>
                              {item.jobStatus === 'in-progress' ? 'In Progress' :
                               item.jobStatus === 'ongoing' ? 'Ongoing' :
                               item.jobStatus === 'upcoming' ? 'Upcoming' :
                               item.jobStatus === 'completed' ? 'Completed' :
                               item.jobStatus === 'onhold' ? 'On Hold' : 'Incomplete'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-b-xl border-t bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Task
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Event
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Holiday
            </span>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white shadow-md"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}


