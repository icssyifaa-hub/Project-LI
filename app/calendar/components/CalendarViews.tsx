'use client'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, CalendarCheck, X, Edit2 } from 'lucide-react'
import type { Task, Event } from '@/app/calendar/types/calendar'
import { MALAYSIA_STATES } from '@/app/settings/types'
import { getItemStyleClasses, getItemBgClass, getBadgeClass, getDotClass, getSolidClass, getHeaderGradientClass } from '@/lib/colors'

interface StaffFilters {
  [staffId: string]: {
    tasks: boolean
    events: boolean
  }
}

export const getItemStyle = (item: any) => {
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

export const getItemBgColor = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = 'blue'
  }
  
  return getItemBgClass(colorKey)
}

export const getItemBorderColor = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = 'blue'
  }
  
  return getItemBgClass(colorKey)
}

export const holidayStyle = 'bg-emerald-600 text-white border-emerald-700 cursor-pointer hover:bg-emerald-700 transition-colors dark:bg-emerald-500 dark:text-emerald-950 dark:border-emerald-400 dark:hover:bg-emerald-400'

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
  const picColor = item.task_pic_color || 'blue'
  const supportText = item.task_support_names && item.task_support_names.length > 0
    ? `, ${item.task_support_names.join(',')}`
    : ''
  
  return (
    <div className="flex items-center justify-between w-full">
      <span className="truncate font-medium">
        {jobTask} - {clientName}
      </span>
      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getBadgeClass(picColor)}`}>
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
  const picColor = item.event_pic_color || 'purple'
  const picName = item.event_pic_name || 'No PIC'
  
  const supportNames = item.event_support_names || []
  const supportText = supportNames.length > 0 
    ? ` + ${supportNames.join(', ')}` 
    : ''
  
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <span className="truncate font-medium">
        {item.title}
      </span>
      {hasPIC && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getBadgeClass(picColor)} whitespace-nowrap`}>
            👤 {picName}{supportText}
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
  onClose: () => void
}

const HolidayPopup: React.FC<HolidayPopupProps> = ({ holiday, onClose }) => {
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

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md dark:bg-gray-900 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-emerald-600 text-white rounded-t-lg dark:bg-emerald-500 dark:text-emerald-950">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🎉</span> Public Holiday
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-emerald-700 dark:text-emerald-950 dark:hover:bg-emerald-400">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1 dark:text-gray-100">{holiday.name}</h3>
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

        <div className="border-t p-4 bg-gray-50 flex justify-end rounded-b-lg dark:border-gray-800 dark:bg-gray-950">
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
  onClose: () => void
  onEdit: () => void
}

const ItemDetailPopup: React.FC<ItemDetailPopupProps> = ({ item, type, onClose, onEdit }) => {
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
      return (
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{item.title}</h3>
              {item.location && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">📍 {item.location}</p>
              )}
            </div>
          </div>
          
          <div className="border-t pt-3 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">👥 Person In Charge:</p>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-purple-50">
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
                      <span className="text-sm text-gray-700 dark:text-gray-200">{name}</span>
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
            <p className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">👥 Person In Charge:</p>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-blue-50">
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
                      <span className="text-sm text-gray-700 dark:text-gray-200">{name}</span>
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

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md dark:bg-gray-900 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-4 border-b rounded-t-lg ${getHeaderColorClass()} text-white`}>
          <h2 className="text-lg font-semibold">
            {type === 'event' ? '📅 Event Details' : '📋 Task Details'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
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

        <div className="border-t p-4 bg-gray-50 flex justify-between rounded-b-lg dark:border-gray-800 dark:bg-gray-950">
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
  onAddClick: (date: Date) => void
  onEditTask: (task: Task) => void
  onEditEvent: (event: Event) => void
  onDateClick?: (date: Date) => void
  onViewChange?: (view: 'day' | 'week' | 'month' | 'year' | 'schedule') => void
  onMonthSelect?: (date: Date) => void
  onDragOver?: (e: React.DragEvent, date: Date) => void
  onDrop?: (e: React.DragEvent, date: Date) => void
  onDragLeave?: () => void
  draggedOverDate?: string | null
  isDragging?: boolean
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
  onDateClick,
  onViewChange,
  onMonthSelect,
  onDragOver,
  onDrop,
  onDragLeave,
  draggedOverDate,
  isDragging,
  staffTaskEventFilters = {},
}) => {
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<{item: any, type: 'task' | 'event'} | null>(null)
  const [selectedMoreItems, setSelectedMoreItems] = useState<{date: Date, items: any[], holidays: any[]} | null>(null)

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
      const date = new Date(h.date)
      return date.getFullYear() === year && date.getMonth() === month
    })
  }

  const shouldShowTask = (task: Task): boolean => {
    if (Object.keys(staffTaskEventFilters).length === 0) return true
    
    const picId = task.task_pic_id
    if (picId && staffTaskEventFilters[picId]?.tasks === true) return true
    
    const supportIds = task.task_support_ids || []
    for (const supportId of supportIds) {
      if (staffTaskEventFilters[supportId]?.tasks === true) return true
    }
    return false
  }

  const shouldShowEvent = (event: Event): boolean => {
    if (Object.keys(staffTaskEventFilters).length === 0) return true
    
    const picId = event.event_pic_id
    if (picId && staffTaskEventFilters[picId]?.events === true) return true
    
    const supportIds = event.event_support_ids || []
    for (const supportId of supportIds) {
      if (staffTaskEventFilters[supportId]?.events === true) return true
    }
    return false
  }

  const getItemsForDate = (date: Date) => {
    const dateKey = formatDateKey(date)
    
    const dateTasks = tasks
      .filter(task => task.dateStart === dateKey && shouldShowTask(task))
      .map(task => ({ ...task, type: 'task' as const }))
    
    const dateEvents = events
      .filter(event => event.dateStart === dateKey && shouldShowEvent(event))
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
    setSelectedMoreItems({ date, items, holidays })
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
          onClose={() => setSelectedHoliday(null)} 
        />
      )}

      {selectedItem && (
        <ItemDetailPopup
          item={selectedItem.item}
          type={selectedItem.type}
          onClose={() => setSelectedItem(null)}
          onEdit={() => {
            if (selectedItem.type === 'task') {
              onEditTask(selectedItem.item)
            } else {
              onEditEvent(selectedItem.item)
            }
            setSelectedItem(null)
          }}
        />
      )}

      {selectedMoreItems && (
        <MoreItemsPopup
          date={selectedMoreItems.date}
          items={selectedMoreItems.items}
          holidays={selectedMoreItems.holidays}
          onClose={() => setSelectedMoreItems(null)}
          onItemClick={(item, type) => setSelectedItem({ item, type })}
          onHolidayClick={(holiday) => setSelectedHoliday(holiday)}
        />
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex-shrink-0 p-4 border-b bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
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
                      className="inline-block mr-2 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full cursor-pointer hover:bg-emerald-700 transition-colors dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                      onClick={(e) => handleHolidayClick(holiday, e)}
                    >
                      🎉 {holiday.name}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={() => onAddClick(currentDate)}>
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
                    className={`p-2 mb-1 rounded-lg cursor-pointer text-sm ${getItemStyle(item)}`}
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
                        className={`p-2 mb-1 rounded-lg cursor-pointer text-sm ${getItemStyle(item)}`}
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
        <div className="h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex-shrink-0 grid grid-cols-8 divide-x border-b sticky top-0 bg-white z-10 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
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
                        className="text-[10px] bg-emerald-600 text-white px-1 py-0.5 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors truncate dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
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
            <div className="grid grid-cols-8 divide-x border-b bg-gray-50 sticky top-0 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
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
                        className="p-1 mb-1 rounded text-xs bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 transition-colors truncate dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
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
                        className={`p-1 mb-1 rounded text-xs cursor-pointer truncate ${getItemStyle(item)}`}
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
                          className={`p-1 mb-1 rounded text-xs cursor-pointer truncate ${getItemStyle(item)}`}
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
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-shrink-0 grid grid-cols-7 bg-gray-50 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">
                {day}
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()
              const firstDay = new Date(year, month, 1).getDay()
              const calendarStart = new Date(year, month, 1 - firstDay)
              const visibleCalendarItems = getVisibleItems()
              const weeks: Date[][] = []

              for (let i = 0; i < 35; i++) {
                const weekIndex = Math.floor(i / 7)
                if (!weeks[weekIndex]) weeks[weekIndex] = []
                weeks[weekIndex].push(addDays(calendarStart, i))
              }

              return weeks.map((week, weekIndex) => {
                const weekStart = week[0]
                const weekEnd = week[6]
                const lanes: { endCol: number }[] = []
                const MAX_MONTH_RANGE_LANES = 2
                const weekSegments = visibleCalendarItems
                  .map(item => {
                    const range = getItemDateRange(item)
                    if (!range || range.stop < weekStart || range.start > weekEnd) return null

                    const segmentStart = range.start < weekStart ? weekStart : range.start
                    const segmentEnd = range.stop > weekEnd ? weekEnd : range.stop
                    const colStart = getDayDiff(weekStart, segmentStart)
                    const colEnd = getDayDiff(weekStart, segmentEnd)
                    const lane = lanes.findIndex(existingLane => existingLane.endCol < colStart)
                    const laneIndex = lane === -1 ? lanes.length : lane
                    lanes[laneIndex] = { endCol: colEnd }

                    return {
                      item,
                      range,
                      colStart,
                      colEnd,
                      laneIndex,
                      continuesBefore: range.start < weekStart,
                      continuesAfter: range.stop > weekEnd,
                    }
                  })
                  .filter(Boolean)

                return (
                  <div key={`range-week-${weekIndex}`} className="relative grid grid-cols-7 min-h-[140px] border-b border-gray-200 dark:border-gray-800">
                    {week.map((date, dayIndex) => {
                      const dateKey = formatDateKey(date)
                      const isToday = dateKey === formatDateKey(new Date())
                      const isCurrentMonth = date.getMonth() === month
                      const dayHolidays = getHolidaysForDate(date)
                      const dayItems = getItemsForDate(date)
                      const hiddenRangeCount = weekSegments.filter((segment: any) =>
                        segment.laneIndex >= MAX_MONTH_RANGE_LANES &&
                        segment.colStart <= dayIndex &&
                        segment.colEnd >= dayIndex
                      ).length
                      const hiddenHolidayCount = Math.max(0, dayHolidays.length - 1)
                      const moreCount = hiddenRangeCount + hiddenHolidayCount

                      return (
                        <div
                          key={dateKey}
                          className={`
                            min-h-[140px] border-r border-gray-200 p-1 pt-1.5 relative cursor-pointer
                            hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60
                            ${isCurrentMonth ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900/80'}
                            ${isToday ? 'bg-blue-50 dark:bg-blue-950/40' : ''}
                            ${draggedOverDate === dateKey ? 'bg-blue-100 border-2 border-dashed border-blue-400 dark:bg-blue-950/60 dark:border-blue-400' : ''}
                          `}
                          onClick={() => handleDateClick(date)}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`
                              text-xs font-medium w-5 h-5 flex items-center justify-center
                              ${isToday ? 'bg-blue-600 text-white rounded-full dark:bg-blue-500' : isCurrentMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                            `}>
                              {date.getDate() === 1 ? `${date.getDate()} ${months[date.getMonth()].slice(0, 3)}` : date.getDate()}
                            </span>

                          </div>

                          <div className="mt-1 space-y-0.5">
                            {dayHolidays.slice(0, 1).map(holiday => (
                              <div
                                key={`holiday-${holiday.id}`}
                                className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-emerald-700 transition-colors dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
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
                              className="absolute bottom-1 left-1 right-1 z-20 rounded bg-blue-50 px-1 py-0.5 text-left text-[10px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-200 dark:hover:bg-blue-900/80"
                              onClick={(e) => handleMoreItemsClick(date, dayItems, dayHolidays, e)}
                            >
                              {moreCount} more
                            </button>
                          )}
                        </div>
                      )
                    })}

                    <div className="pointer-events-none absolute inset-x-0 top-[52px] bottom-6">
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
                              pointer-events-auto absolute h-5 px-1.5 text-[10px] leading-5 truncate cursor-pointer shadow-sm
                              ${getItemStyle(item)}
                              ${continuesBefore ? 'rounded-l-none' : 'rounded-l'}
                              ${continuesAfter ? 'rounded-r-none' : 'rounded-r'}
                            `}
                            style={{
                              left: `calc(${(colStart / 7) * 100}% + 3px)`,
                              width: `calc(${(span / 7) * 100}% - 6px)`,
                              top: `${laneIndex * 22}px`,
                            }}
                            onClick={(e) => handleItemClick(item, item.type, e)}
                            title={item.type === 'task' ? getTaskDisplayText(item) : getEventDisplayText(item)}
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {range.start < weekStart ? '' : `${getItemIcon(item)} `}
                              {item.type === 'task'
                                ? `${item.jobTask || 'No Job Task'} - ${item.clientName || 'No Client'}`
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
      )}

      {/* YEAR VIEW */}
      {view === 'year' && (
        <div className="h-full flex flex-col p-4 overflow-y-auto text-gray-900 dark:text-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center dark:text-gray-100">
            {currentDate.getFullYear()}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                  <div className="flex items-center justify-between mb-3 pb-2 border-b dark:border-gray-800">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{month}</h3>
                    <div className="flex gap-1">
                      {totalHolidaysInMonth > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          🎉 {totalHolidaysInMonth}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mb-3 text-xs">
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
        <div className="h-full flex flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex-shrink-0 bg-white border-b p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 Schedule View</h2>
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                Showing tasks and events for {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </p>
              {Object.keys(staffTaskEventFilters).length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Filtered by {Object.values(staffTaskEventFilters).filter(f => f.tasks || f.events).length} staff member(s)
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              const year = currentDate.getFullYear()
              const month = currentDate.getMonth()
              
              const monthData = getAllItemsForYearMonth(year, month)
              const datesWithItems = monthData.filter(day => day.items.length > 0 || day.holidays.length > 0)
              
              if (datesWithItems.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-500 text-lg dark:text-gray-300">No tasks or events for {months[month]} {year}</p>
                    <p className="text-sm text-gray-400 mt-2 dark:text-gray-500">
                      {Object.keys(staffTaskEventFilters).length > 0 
                        ? 'Try selecting different staff filters or disable filters to see more items.'
                        : 'Add tasks or events to get started.'}
                    </p>
                  </div>
                )
              }
              
              return (
                <div className="space-y-3">
                  {datesWithItems.map(({ date, items, holidays: dayHolidays }) => {
                    const isToday = formatDateKey(date) === formatDateKey(new Date())
                    
                    return (
                      <div 
                        key={formatDateKey(date)} 
                        className={`border rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 ${
                          isToday ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div 
                          className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                            isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => handleDateClick(date)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold">
                              {date.getDate()} {months[date.getMonth()]} {date.getFullYear()}
                            </span>
                            <span className={`text-sm ${isToday ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                              {date.toLocaleDateString('default', { weekday: 'long' })}
                            </span>
                            {dayHolidays.length > 0 && (
                              <div className="flex gap-1">
                                {dayHolidays.map(holiday => (
                                  <span 
                                    key={holiday.id}
                                    className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleHolidayClick(holiday, e)
                                    }}
                                  >
                                    🎉 {holiday.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm">
                            {items.length} item{items.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {items.length > 0 && (
                          <div className="divide-y dark:divide-gray-800">
                            {items.map(item => (
                              <div
                                key={`${item.type}-${item.id}`}
                                data-task-id={item.type === 'task' ? item.id : undefined}
                                data-event-id={item.type === 'event' ? item.id : undefined}
                                className="p-3 hover:bg-gray-50 cursor-pointer transition-colors dark:hover:bg-gray-800/70"
                                onClick={(e) => handleItemClick(item, item.type, e)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {item.timeStart || 'All day'}
                                    {item.timeStop && ` - ${item.timeStop}`}
                                  </div>
                                  <div className="text-lg">
                                    {getItemIcon(item)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {item.type === 'event' 
                                        ? item.title 
                                        : `${item.jobTask || 'Task'} - ${item.clientName || 'No Client'}`
                                      }
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                      <span className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${getDotClass(item.type === 'event' ? item.event_pic_color : item.task_pic_color)}`}></span>
                                        <span>👤 PIC: {item.type === 'event' ? (item.event_pic_name || 'No PIC') : (item.task_pic_name || 'No PIC')}</span>
                                      </span>
                                      
                                      {item.type === 'event' && item.event_support_names && item.event_support_names.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <span className="text-gray-400">→</span>
                                          <span>👥 Support: {item.event_support_names.join(', ')}</span>
                                        </span>
                                      )}
                                      
                                      {item.type === 'task' && item.task_support_names && item.task_support_names.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <span className="text-gray-400">→</span>
                                          <span>👥 Support: {item.task_support_names.join(', ')}</span>
                                        </span>
                                      )}
                                      
                                      {item.type === 'event' && item.location && (
                                        <span className="flex items-center gap-1">
                                          <span>📍</span>
                                          <span>{item.location}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {item.type === 'task' && item.jobStatus && (
                                    <div className={`
                                      text-xs px-2 py-1 rounded-full whitespace-nowrap
                                      ${item.jobStatus === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                      ${item.jobStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                      ${item.jobStatus === 'incompleted' ? 'bg-red-100 text-red-800' : ''}
                                    `}>
                                      {item.jobStatus === 'in-progress' ? 'In Progress' : 
                                       item.jobStatus === 'completed' ? 'Completed' : 'Incompleted'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {items.length === 0 && dayHolidays.length > 0 && (
                          <div className="p-3 bg-green-50 text-center text-sm text-green-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                            {dayHolidays.map(holiday => (
                              <span key={holiday.id} className="inline-block mr-2">
                                🎉 Public Holiday: {holiday.name}
                              </span>
                            ))}
                          </div>
                        )}
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
  onClose: () => void
  onItemClick: (item: any, type: 'task' | 'event') => void
  onHolidayClick: (holiday: any) => void
}

const MoreItemsPopup: React.FC<MoreItemsPopupProps> = ({ 
  date, 
  items, 
  holidays,
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-16" onClick={onClose}>
      <div className="bg-white rounded-xl w-[500px] shadow-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-gray-100 rounded-t-xl dark:border-gray-800 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg dark:text-gray-100">
                {formatDate(date)}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-200">
                  Total: {allItems.length} item{allItems.length !== 1 ? 's' : ''}
                </span>
                {holidays.length > 0 && (
                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full dark:bg-emerald-500 dark:text-emerald-950">
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
                    e.currentTarget.style.pointerEvents = 'none'
                    if (item.type === 'holiday') {
                      onHolidayClick(item)
                    } else {
                      onItemClick(item, item.type)
                    }
                    setTimeout(() => {
                      if (e.currentTarget) e.currentTarget.style.pointerEvents = 'auto'
                    }, 300)
                  }}
                >
                  <div className="absolute -top-2 -right-2">
                    <span className={`
                      text-[10px] px-2 py-0.5 rounded-full shadow-sm
                      ${item.type === 'holiday' ? 'bg-green-500 text-white' : 
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

                        {item.type === 'event' && item.location && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <span className="text-gray-400">📍</span>
                            <span>{item.location}</span>
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
                              ${item.jobStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${item.jobStatus === 'incompleted' ? 'bg-red-100 text-red-700' : ''}
                            `}>
                              {item.jobStatus === 'in-progress' ? 'In Progress' : 
                               item.jobStatus === 'completed' ? 'Completed' : 'Incompleted'}
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

        <div className="border-t px-4 py-3 bg-gray-50 flex justify-between items-center rounded-b-xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2">
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


