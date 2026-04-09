import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, CalendarCheck, X, Edit2 } from 'lucide-react'
import type { Task, Event } from '@/types/calendar'
import { MALAYSIA_STATES } from '@/app/settings/types'

// ==================== TYPE FOR STAFF FILTERS ====================
interface StaffFilters {
  [staffCode: string]: {
    tasks: boolean
    events: boolean
  }
}

// ==================== COLOR STYLES ====================
export const getItemStyle = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = null
  }
  
  const colorMap: {[key: string]: string} = {
    'blue': 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    'green': 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
    'purple': 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
    'teal': 'bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200',
    'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    'pink': 'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200',
    'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200',
    'orange': 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
    'cyan': 'bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200',
    'red': 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    'rose': 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200',
    'amber': 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
    'lime': 'bg-lime-100 text-lime-800 border-lime-300 hover:bg-lime-200',
    'emerald': 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
    'violet': 'bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200',
  }
  
  return colorMap[colorKey || 'blue'] || 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
}

export const getItemBgColor = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = null
  }
  
  const colorMap: {[key: string]: string} = {
    'blue': 'bg-blue-50',
    'green': 'bg-green-50',
    'purple': 'bg-purple-50',
    'teal': 'bg-teal-50',
    'yellow': 'bg-yellow-50',
    'pink': 'bg-pink-50',
    'indigo': 'bg-indigo-50',
    'orange': 'bg-orange-50',
    'cyan': 'bg-cyan-50',
    'red': 'bg-red-50',
    'rose': 'bg-rose-50',
    'amber': 'bg-amber-50',
    'lime': 'bg-lime-50',
    'emerald': 'bg-emerald-50',
    'violet': 'bg-violet-50',
  }
  
  return colorMap[colorKey] || 'bg-gray-50'
}

export const getItemBorderColor = (item: any) => {
  let colorKey
  
  if (item.type === 'task') {
    colorKey = item.task_pic_color
  } else if (item.type === 'event') {
    colorKey = item.event_pic_color
  } else {
    colorKey = null
  }
  
  const colorMap: {[key: string]: string} = {
    'blue': 'border-blue-400',
    'green': 'border-green-400',
    'purple': 'border-purple-400',
    'teal': 'border-teal-400',
    'yellow': 'border-yellow-400',
    'pink': 'border-pink-400',
    'indigo': 'border-indigo-400',
    'orange': 'border-orange-400',
    'cyan': 'border-cyan-400',
    'red': 'border-red-400',
    'rose': 'border-rose-400',
    'amber': 'border-amber-400',
    'lime': 'border-lime-400',
    'emerald': 'border-emerald-400',
    'violet': 'border-violet-400',
  }
  
  return colorMap[colorKey] || 'border-gray-400'
}

export const holidayStyle = 'bg-green-400 text-white border-green-600 cursor-pointer hover:bg-green-500 transition-colors'

const getTaskDisplayText = (item: any) => {
  const jobTask = item.jobTask || 'No Job Task'
  const clientName = item.clientName || 'No Client'
  
  let staffText = item.task_pic_name || 'No PIC'
  if (item.task_support_name) {
    staffText += ` + ${item.task_support_name}`
  }
  
  return `${jobTask} - ${clientName} (${staffText})`
}

const getTaskDisplayElement = (item: any) => {
  const displayText = `${item.jobTask || 'Task'} - ${item.clientName || 'No Client'}`
  const picText = item.task_pic_name || 'No PIC'
  const supportText = item.task_support_name ? ` + ${item.task_support_name}` : ''
  
  return (
    <div className="flex items-center justify-between w-full">
      <span className="truncate font-medium">
        {displayText}
      </span>
      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-${item.task_pic_color}-200 text-${item.task_pic_color}-800`}>
          {picText}{supportText}
        </span>
      </div>
    </div>
  )
}

const getEventDisplayElement = (item: any) => {
  const hasPIC = item.event_pic_name || item.eventPicStaff
  const picColor = item.event_pic_color || 'purple'
  
  return (
    <div className="flex items-center justify-between w-full">
      <span className="truncate font-medium">
        {item.title}
      </span>
      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        {hasPIC && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-${picColor}-200 text-${picColor}-800`}>
            {item.event_pic_name || 'PIC'}
            {item.event_support_name && ` + ${item.event_support_name}`}
          </span>
        )}
      </div>
    </div>
  )
}

const getItemIcon = (item: any) => {
  if (item.type === 'task') return '📋'
  if (item.type === 'event') return '📅'
  return '🎉'
}

// ==================== HOLIDAY POPUP ====================
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
    if (!holiday.states || holiday.states.length === 0) {
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
      <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-green-400 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🎉</span> Public Holiday
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-green-500">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{holiday.name}</h3>
            <p className="text-gray-600">{formatDisplayDate(holiday.date)}</p>
          </div>

          <div className="border-t pt-4 mt-2">
            <div className="flex items-center text-gray-700 mb-2">
              <CalendarCheck className="h-4 w-4 mr-2 text-green-600" />
              <span className="font-medium">Observing States</span>
            </div>
            <p className="text-sm text-gray-600 ml-6">
              {getStatesDisplay()}
            </p>
            
            {holiday.states && holiday.states.length > 0 && (
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

        <div className="border-t p-4 bg-gray-50 flex justify-end rounded-b-lg">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== ITEM DETAIL POPUP ====================
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

  const getDisplayText = () => {
    if (type === 'event') {
      return (
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
              {item.location && (
                <p className="text-sm text-gray-600 mt-1">📍 {item.location}</p>
              )}
            </div>
          </div>
          
          <div className="border-t pt-3 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Person In Charge:</p>
            <div className="flex items-center p-2 rounded-lg" style={{ backgroundColor: `${item.event_pic_color}10` }}>
              <span className={`w-3 h-3 rounded-full bg-${item.event_pic_color || 'purple'}-500 mr-2`}></span>
              <span className="text-sm text-gray-900">
                {item.event_pic_name} {item.eventPicStaff && `(${item.eventPicStaff})`}
              </span>
              
              {item.event_support_name && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className={`w-3 h-3 rounded-full bg-${item.event_support_color}-500 mr-2`}></span>
                  <span className="text-sm text-gray-600">
                    {item.event_support_name} {item.eventSupportStaff && `(${item.eventSupportStaff})`}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {item.description && (
            <p className="text-gray-700 text-sm mt-3 border-t pt-3">{item.description}</p>
          )}
        </div>
      )
    } else {
      return (
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-2xl mr-3">📋</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {getTaskDisplayText(item)}
              </h3>
            </div>
          </div>
          
          <div className="border-t pt-3 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Person In Charge:</p>
            <div className="flex items-center p-2 rounded-lg" style={{ backgroundColor: `${item.task_pic_color}10` }}>
              <span className={`w-3 h-3 rounded-full bg-${item.task_pic_color || 'blue'}-500 mr-2`}></span>
              <span className="text-sm text-gray-900">
                {item.task_pic_name} {item.taskPicStaff && `(${item.taskPicStaff})`}
              </span>
              
              {item.task_support_name && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className={`w-3 h-3 rounded-full bg-${item.task_support_color}-500 mr-2`}></span>
                  <span className="text-sm text-gray-600">
                    {item.task_support_name} {item.taskSupportStaff && `(${item.taskSupportStaff})`}
                  </span>
                </>
              )}
            </div>
          </div>

          {item.additionalRemark && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-1">Remark:</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                {item.additionalRemark}
              </p>
            </div>
          )}
        </div>
      )
    }
  }

  const getHeaderColor = () => {
    if (type === 'event') {
      return `bg-${item.event_pic_color || 'purple'}-500`
    } else {
      return `bg-${item.task_pic_color || 'blue'}-500`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-4 border-b rounded-t-lg ${getHeaderColor()} text-white`}>
          <h2 className="text-lg font-semibold">
            {type === 'event' ? 'Event Details' : 'Task Details'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-opacity-20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            {getDisplayText()}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              {formatDate(item.dateStart)}
              {item.timeStart && ` at ${item.timeStart}`}
              {item.timeStop && ` - ${item.timeStop}`}
            </p>
            {item.dateStop && item.dateStop !== item.dateStart && (
              <p className="text-sm text-gray-500 mt-1">
                Until {formatDate(item.dateStop)}
              </p>
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50 flex justify-between rounded-b-lg">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={() => {
              onEdit()
              onClose()
            }}
            className={type === 'event' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== MORE ITEMS POPUP ====================
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

  const getItemDisplayText = (item: any) => {
    if (item.type === 'holiday') {
      return item.name
    }
    if (item.type === 'event') {
      return item.title
    }
    if (item.type === 'task') {
      const jobTask = item.jobTask || 'No Job Task'
      const clientName = item.clientName || 'No Client'
      return `${jobTask} - ${clientName}`
    }
    return ''
  }

  const getItemIconLocal = (item: any) => {
    if (item.type === 'task') return '📋'
    if (item.type === 'event') return '📅'
    return '🎉'
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
      <div className="bg-white rounded-xl w-[450px] shadow-2xl max-h-[80vh] flex flex-col border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white text-lg">
                {formatDate(date)}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Total: {allItems.length} item{allItems.length !== 1 ? 's' : ''}
                </span>
                {holidays.length > 0 && (
                  <span className="text-xs bg-green-400 text-white px-2 py-0.5 rounded-full">
                    🎉 {holidays.length} holiday{holidays.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 bg-gray-50">
          {allItems.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm text-gray-500">No items for this date</p>
              <p className="text-xs text-gray-400 mt-1">Click the + button to add a task or event</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item: any) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`
                    group relative bg-white rounded-lg p-3 cursor-pointer transition-all
                    hover:shadow-md border-l-4 hover:scale-[1.02] active:scale-[0.99]
                    ${item.type === 'holiday' ? 'border-l-green-500 hover:border-l-green-600' : 
                      item.type === 'event' ? `border-l-${item.event_pic_color || 'purple'}-500` : 
                      `border-l-${item.task_pic_color || 'blue'}-500`}
                    border border-gray-200 hover:border-gray-300
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
                        item.type === 'event' ? `bg-${item.event_pic_color || 'purple'}-500 text-white` : 
                        `bg-${item.task_pic_color || 'blue'}-500 text-white`}
                    `}>
                      {item.type === 'holiday' ? 'Holiday' : item.type === 'event' ? 'Event' : 'Task'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-lg
                      ${item.type === 'holiday' ? 'bg-green-100' : 
                        item.type === 'event' ? `bg-${item.event_pic_color || 'purple'}-100` : 
                        `bg-${item.task_pic_color || 'blue'}-100`}
                    `}>
                      {getItemIconLocal(item)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 break-words pr-16">
                        {getItemDisplayText(item)}
                      </div>
                      
                      <div className="mt-2 space-y-1.5">
                        {item.timeStart && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="text-gray-400">🕒</span>
                            <span className="font-medium">
                              {item.timeStart}
                              {item.timeStop && ` - ${item.timeStop}`}
                            </span>
                          </div>
                        )}

                        {item.type === 'task' && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500">👥 PIC:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full bg-${item.task_pic_color}-500`}></span>
                                <span className="font-medium">{item.task_pic_name}</span>
                                <span className="text-gray-400 text-[10px]">({item.taskPicStaff})</span>
                              </div>
                              {item.task_support_name && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full bg-${item.task_support_color}-500`}></span>
                                    <span className="font-medium">{item.task_support_name}</span>
                                    <span className="text-gray-400 text-[10px]">({item.taskSupportStaff})</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {item.type === 'event' && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500">👥 PIC:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full bg-${item.event_pic_color || 'purple'}-500`}></span>
                                <span className="font-medium">{item.event_pic_name || 'No PIC'}</span>
                                <span className="text-gray-400 text-[10px]">({item.eventPicStaff || '-'})</span>
                              </div>
                              {item.event_support_name && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full bg-${item.event_support_color}-500`}></span>
                                    <span className="font-medium">{item.event_support_name}</span>
                                    <span className="text-gray-400 text-[10px]">({item.eventSupportStaff})</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {item.type === 'event' && item.location && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="text-gray-400">📍</span>
                            <span>{item.location}</span>
                          </div>
                        )}

                        {item.type === 'holiday' && item.states && item.states.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-gray-500">🗺️</span>
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
                              <span className="text-[10px] text-gray-500">
                                +{item.states.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {item.type === 'task' && item.jobStatus && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">📊 Status:</span>
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

                      {item.type === 'task' && item.additionalRemark && (
                        <div className="mt-2 text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <span className="font-medium text-gray-700 block mb-0.5">📝 Remark:</span>
                          <p className="text-gray-600">{item.additionalRemark}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 bg-gray-50 flex justify-between items-center rounded-b-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Task
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Event
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Holiday
            </span>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN CALENDAR VIEWS COMPONENT ====================
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
  onDragOver?: (e: React.DragEvent, date: Date) => void
  onDrop?: (e: React.DragEvent, date: Date) => void
  onDragLeave?: () => void
  draggedOverDate?: string | null
  isDragging?: boolean
  staffTaskEventFilters?: StaffFilters  // ✅ TAMBAH INI
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
  onDragOver,
  onDrop,
  onDragLeave,
  draggedOverDate,
  isDragging,
  staffTaskEventFilters = {}  // ✅ TAMBAH INI dengan default empty object
}) => {
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<{item: any, type: 'task' | 'event'} | null>(null)
  const [selectedMoreItems, setSelectedMoreItems] = useState<{date: Date, items: any[], holidays: any[]} | null>(null)

  // Debug
  useEffect(() => {
    console.log('📋 Total Tasks:', tasks.length)
    console.log('📅 Total Events:', events.length)
    console.log('🔍 Staff Filters:', staffTaskEventFilters)
    
    const allDates = [...tasks.map(t => t.dateStart), ...events.map(e => e.dateStart)]
    const uniqueDates = [...new Set(allDates)]
    console.log('📆 Dates with data:', uniqueDates.sort())
    
    const checkDates = ['2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04']
    checkDates.forEach(date => {
      const tasksOnDate = tasks.filter(t => t.dateStart === date)
      const eventsOnDate = events.filter(e => e.dateStart === date)
      if (tasksOnDate.length > 0 || eventsOnDate.length > 0) {
        console.log(`✅ ${date}: ${tasksOnDate.length} tasks, ${eventsOnDate.length} events`)
      } else {
        console.log(`❌ ${date}: No items found`)
      }
    })
  }, [tasks, events, staffTaskEventFilters])

  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

  // Helper to check if task should be shown based on staff filters
  const shouldShowTask = (task: Task): boolean => {
    if (Object.keys(staffTaskEventFilters).length === 0) return true
    
    const picCode = task.task_pic_id || task.task_pic_name
    const filter = staffTaskEventFilters[picCode]
    return filter?.tasks === true
  }

  // Helper to check if event should be shown based on staff filters
  const shouldShowEvent = (event: Event): boolean => {
    if (Object.keys(staffTaskEventFilters).length === 0) return true
    
    const picCode = event.event_pic_id || event.event_pic_name
    const filter = staffTaskEventFilters[picCode]
    return filter?.events === true
  }

  const getItemsForDate = (date: Date) => {
    const dateKey = formatDateKey(date)
    
    const dateTasks = tasks
      .filter(task => task.dateStart === dateKey && shouldShowTask(task))
      .map(task => ({ ...task, type: 'task' as const }))
    
    const dateEvents = events
      .filter(event => event.dateStart === dateKey && shouldShowEvent(event))
      .map(event => ({ ...event, type: 'event' as const }))
    
    return [...dateTasks, ...dateEvents].sort((a, b) => {
      if (a.timeStart && b.timeStart) return a.timeStart.localeCompare(b.timeStart)
      if (a.timeStart) return -1
      if (b.timeStart) return 1
      return 0
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

  const handleMoreItemsClick = (date: Date, items: any[], holidays: any[], e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedMoreItems({ date, items, holidays })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading calendar...</p>
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
        <div className="h-full flex flex-col bg-white">
          <div className="flex-shrink-0 p-4 border-b bg-gray-50">
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
                      className="inline-block mr-2 px-3 py-1 bg-green-400 text-white text-sm rounded-full cursor-pointer hover:bg-green-500 transition-colors"
                      onClick={(e) => handleHolidayClick(holiday, e)}
                    >
                      🎉 {holiday.name}
                      {holiday.states && holiday.states.length > 0 && (
                        <span className="ml-1 text-xs opacity-90">
                          ({holiday.states.length} state{holiday.states.length > 1 ? 's' : ''})
                        </span>
                      )}
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
              <div className="border-b p-2 bg-blue-50">
                <div className="text-xs font-semibold text-blue-600 mb-1">ALL DAY</div>
                {getItemsForDate(currentDate).filter(item => !item.timeStart).map(item => (
                  <div
                    key={`allday-${item.type}-${item.id}`}
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
                  className={`flex border-b min-h-[60px] hover:bg-gray-50 cursor-pointer ${
                    isCurrentHour ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onDateClick?.(currentDate)}
                >
                  <div className="w-20 p-2 text-right text-sm text-gray-500 border-r">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 p-1 relative">
                    {hourItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`p-2 mb-1 rounded-lg cursor-pointer text-sm ${getItemStyle(item)}`}
                        onClick={(e) => handleItemClick(item, item.type, e)}
                      >
                        <div className="flex items-center">
                          <span className="mr-2">{getItemIcon(item)}</span>
                          <div className="flex-1">
                            {item.type === 'task' ? getTaskDisplayElement(item) : getEventDisplayElement(item)}
                          </div>
                          {item.timeStop && (
                            <span className="ml-auto text-xs text-gray-500">
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
        <div className="h-full flex flex-col bg-white">
          <div className="flex-shrink-0 grid grid-cols-8 divide-x border-b sticky top-0 bg-white z-10">
            <div className="p-2 bg-gray-50"></div>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(currentDate)
              date.setDate(currentDate.getDate() - currentDate.getDay() + i)
              const isToday = formatDateKey(date) === formatDateKey(new Date())
              const holidays = getHolidaysForDate(date)
              
              return (
                <div 
                  key={i} 
                  className={`p-2 text-center ${isToday ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-100`}
                  onClick={() => onDateClick?.(date)}
                >
                  <div className="font-semibold text-sm">{weekDays[date.getDay()]}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {holidays.map(holiday => (
                      <div 
                        key={holiday.id}
                        className="text-[10px] bg-green-400 text-white px-1 py-0.5 rounded-full cursor-pointer hover:bg-green-500 transition-colors truncate"
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
            <div className="grid grid-cols-8 divide-x border-b bg-gray-50 sticky top-0">
              <div className="p-2 text-right text-xs text-gray-500">All day</div>
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(currentDate)
                date.setDate(currentDate.getDate() - currentDate.getDay() + i)
                const allDayItems = getItemsForDate(date).filter(item => !item.timeStart)
                const holidays = getHolidaysForDate(date)
                
                return (
                  <div key={i} className="p-1 min-h-[60px]">
                    {holidays.map(holiday => (
                      <div 
                        key={holiday.id}
                        className="p-1 mb-1 rounded text-xs bg-green-400 text-white cursor-pointer hover:bg-green-500 transition-colors truncate"
                        onClick={(e) => handleHolidayClick(holiday, e)}
                      >
                        🎉 {holiday.name}
                      </div>
                    ))}
                    {allDayItems.map((item) => (
                      <div
                        key={`allday-${item.type}-${item.id}`}
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
              <div key={hour} className="grid grid-cols-8 divide-x min-h-[60px] border-b">
                <div className="p-1 text-right text-xs text-gray-500 bg-gray-50">
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
                      className="relative p-1 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onDateClick?.(date)}
                      onDragOver={(e) => onDragOver?.(e, date)}
                      onDrop={(e) => onDrop?.(e, date)}
                    >
                      {hourItems.map((item) => (
                        <div
                          key={`${item.type}-${item.id}`}
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
          <div className="flex-shrink-0 grid grid-cols-7 bg-gray-50 border-b">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center font-semibold text-sm">
                {day}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-0 overflow-y-auto">
            {(() => {
              const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              const startDayOfWeek = firstDayOfMonth.getDay()
              
              const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
              const prevMonthDays = startDayOfWeek
              const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7
              const nextMonthDays = totalCells - (prevMonthDays + daysInMonth)
              
              const allDates = []
              
              // Add previous month dates
              const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
              const prevMonthDaysCount = prevMonth.getDate()
              for (let i = prevMonthDaysCount - prevMonthDays + 1; i <= prevMonthDaysCount; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, i)
                allDates.push(date)
              }
              
              // Add current month dates
              for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
                allDates.push(date)
              }
              
              // Add next month dates
              for (let i = 1; i <= nextMonthDays; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
                allDates.push(date)
              }
              
              return allDates.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = formatDateKey(date) === formatDateKey(new Date())
                const holidays = getHolidaysForDate(date)
                const dayItems = getItemsForDate(date)
                const holidayCount = holidays.length
                const itemCount = dayItems.length
                const totalItems = holidayCount + itemCount
                const MAX_VISIBLE = 3
                const visibleHolidays = holidays.slice(0, Math.min(holidayCount, MAX_VISIBLE))
                const remainingSlots = MAX_VISIBLE - visibleHolidays.length
                const visibleItems = dayItems.slice(0, remainingSlots)
                const hasMore = totalItems > MAX_VISIBLE

                return (
                  <div
                    key={index}
                    className={`
                      border-b border-r p-1 min-h-[100px] relative overflow-hidden
                      hover:bg-gray-50 cursor-pointer
                      ${!isCurrentMonth ? 'bg-gray-50' : ''}
                      ${isToday ? 'bg-blue-50' : ''}
                      ${draggedOverDate === formatDateKey(date) ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''}
                    `}
                    onClick={() => onDateClick?.(date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`
                        text-xs font-medium w-5 h-5 flex items-center justify-center
                        ${isToday ? 'bg-blue-600 text-white rounded-full' : ''}
                        ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                      `}>
                        {date.getDate()}
                      </span>
                      
                      {totalItems > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {totalItems}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {visibleHolidays.map(holiday => (
                        <div 
                          key={`holiday-${holiday.id}`}
                          className="bg-green-500 text-white text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-green-600 transition-colors flex items-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleHolidayClick(holiday, e)
                          }}
                        >
                          <span className="mr-1">🎉</span>
                          <span className="truncate">{holiday.name}</span>
                        </div>
                      ))}

                      {visibleItems.map(item => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className={`
                            text-[10px] p-0.5 rounded truncate cursor-pointer
                            ${getItemStyle(item)}
                            flex items-center justify-between gap-1
                          `}
                          onClick={(e) => handleItemClick(item, item.type, e)}
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <span className="mr-1 flex-shrink-0 text-xs">{getItemIcon(item)}</span>
                            <span className="truncate">
                              {item.type === 'task' 
                                ? `${item.jobTask || 'Task'} - ${item.clientName || 'No Client'}`
                                : item.title
                              }
                            </span>
                          </div>
                          
                          {item.type === 'task' && item.task_pic_name && (
                            <span className={`ml-1 text-[8px] px-1 rounded-full flex-shrink-0 bg-${item.task_pic_color}-200 text-${item.task_pic_color}-800`}>
                              {item.task_pic_name.substring(0, 3)}
                              {item.task_support_name && '+'}
                            </span>
                          )}
                          
                          {item.type === 'event' && item.event_pic_name && (
                            <span className={`ml-1 text-[8px] px-1 rounded-full flex-shrink-0 bg-${item.event_pic_color || 'purple'}-200 text-${item.event_pic_color || 'purple'}-800`}>
                              {item.event_pic_name.substring(0, 3)}
                              {item.event_support_name && '+'}
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {hasMore && (
                        <div 
                          className="text-[9px] text-blue-600 hover:text-blue-800 font-medium pl-1 cursor-pointer bg-blue-50 rounded py-0.5 mt-0.5 text-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoreItemsClick(date, dayItems, holidays, e)
                          }}
                        >
                          +{totalItems - MAX_VISIBLE} more
                        </div>
                      )}
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
        <div className="h-full flex flex-col p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{currentDate.getFullYear()}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {months.map((month, index) => {
              const monthHolidays = getMonthHolidays(currentDate.getFullYear(), index)

              return (
                <div 
                  key={month} 
                  className="border rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    const newDate = new Date(currentDate.getFullYear(), index, 1)
                    onDateClick?.(newDate)
                  }}
                >
                  <h3 className="font-semibold text-lg mb-2 flex items-center justify-between">
                    <span>{month}</span>
                    {monthHolidays.length > 0 && (
                      <span className="text-xs bg-green-400 text-white px-2 py-0.5 rounded-full">
                        {monthHolidays.length} holidays
                      </span>
                    )}
                  </h3>
                  
                  {monthHolidays.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {monthHolidays.slice(0, 2).map(holiday => (
                        <div 
                          key={holiday.id}
                          className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors flex items-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleHolidayClick(holiday, e)
                          }}
                        >
                          <span className="mr-1">🎉</span>
                          <span className="truncate">{holiday.name}</span>
                          <span className="ml-auto text-[10px]">
                            {new Date(holiday.date).getDate()} {months[new Date(holiday.date).getMonth()]}
                          </span>
                        </div>
                      ))}
                      {monthHolidays.length > 2 && (
                        <div className="text-[10px] text-gray-500 pl-1">
                          +{monthHolidays.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-[8px] text-gray-400 text-center">{d}</div>
                    ))}
                    
                    {Array.from({ length: new Date(currentDate.getFullYear(), index, 1).getDay() === 0 ? 6 : new Date(currentDate.getFullYear(), index, 1).getDay() - 1 }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-4"></div>
                    ))}

                    {Array.from({ length: new Date(currentDate.getFullYear(), index + 1, 0).getDate() }).map((_, i) => {
                      const day = i + 1
                      const dateKey = formatDateKey(new Date(currentDate.getFullYear(), index, day))
                      const dayHolidays = holidays.filter(h => h.date === dateKey)
                      
                      return (
                        <div
                          key={day}
                          className={`
                            h-4 text-[8px] flex items-center justify-center rounded cursor-pointer relative
                            ${dayHolidays.length > 0 ? 'bg-green-400 text-white hover:bg-green-500' : 'bg-gray-100 hover:bg-gray-200'}
                          `}
                          title={dayHolidays.map(h => h.name).join(', ')}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (dayHolidays.length > 0) {
                              handleHolidayClick(dayHolidays[0], e)
                            }
                          }}
                        >
                          {dayHolidays.length > 0 && (
                            <span className="relative">
                              🎉
                              {dayHolidays.length > 1 && (
                                <span className="absolute -top-1 -right-2 text-[6px] bg-red-500 text-white rounded-full w-2.5 h-2.5 flex items-center justify-center">
                                  {dayHolidays.length}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE VIEW */}
      {view === 'schedule' && (
        <div className="h-full flex flex-col p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Upcoming Schedule</h2>
          
          {(() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const allItems = [
              ...tasks.filter(shouldShowTask).map(t => ({ ...t, type: 'task' as const })),
              ...events.filter(shouldShowEvent).map(e => ({ ...e, type: 'event' as const }))
            ]
              .filter(item => new Date(item.dateStart) >= today)
              .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())

            const groupedByDate: { [key: string]: any[] } = {}
            
            allItems.forEach(item => {
              if (!groupedByDate[item.dateStart]) {
                groupedByDate[item.dateStart] = []
              }
              groupedByDate[item.dateStart].push(item)
            })

            const allDates = new Set([
              ...Object.keys(groupedByDate),
              ...holidays.map(h => h.date)
            ])

            if (allDates.size === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No upcoming items</p>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {Array.from(allDates).sort().map(date => {
                  const itemDate = new Date(date)
                  const isToday = formatDateKey(new Date()) === date
                  const dayHolidays = holidays.filter(h => h.date === date)
                  const dayItems = groupedByDate[date] || []
                  
                  return (
                    <div key={date} className="border rounded-lg overflow-hidden">
                      <div 
                        className={`px-4 py-2 font-semibold flex items-center justify-between cursor-pointer hover:bg-opacity-80 ${
                          isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        onClick={() => onDateClick?.(itemDate)}
                      >
                        <span className="flex items-center gap-2">
                          {itemDate.toLocaleDateString('default', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          <div className="flex gap-1">
                            {dayHolidays.map(holiday => (
                              <span 
                                key={holiday.id}
                                className="text-xs bg-green-400 text-white px-2 py-0.5 rounded-full cursor-pointer hover:bg-green-500 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleHolidayClick(holiday, e)
                                }}
                              >
                                🎉 {holiday.name}
                              </span>
                            ))}
                          </div>
                        </span>
                        <span className="text-sm">
                          {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {dayItems.length > 0 && (
                        <div className="divide-y">
                          {dayItems.slice(0, 3).map(item => (
                            <div
                              key={`${item.type}-${item.id}`}
                              className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
                              onClick={(e) => handleItemClick(item, item.type, e)}
                            >
                              <div className="w-16 text-sm font-medium text-gray-600">
                                {item.timeStart || 'All day'}
                              </div>
                              <div className={`text-lg ${getItemStyle(item)} p-1 rounded`}>
                                {getItemIcon(item)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {item.type === 'event' 
                                    ? item.title 
                                    : getTaskDisplayText(item)
                                  }
                                </div>
                                <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                                  {item.type === 'task' ? (
                                    <>
                                      <span className={`w-2 h-2 rounded-full bg-${item.task_pic_color}-500`}></span>
                                      <span>{item.task_pic_name}</span>
                                      {item.task_support_name && (
                                        <>
                                          <span>+</span>
                                          <span className={`w-2 h-2 rounded-full bg-${item.task_support_color}-500`}></span>
                                          <span>{item.task_support_name}</span>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className={`w-2 h-2 rounded-full bg-${item.event_pic_color || 'purple'}-500`}></span>
                                      <span>{item.event_pic_name || 'No PIC'}</span>
                                      {item.event_support_name && (
                                        <>
                                          <span>+</span>
                                          <span className={`w-2 h-2 rounded-full bg-${item.event_support_color}-500`}></span>
                                          <span>{item.event_support_name}</span>
                                        </>
                                      )}
                                      {item.location && (
                                        <>
                                          <span>📍</span>
                                          <span>{item.location}</span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {item.type === 'task' && item.jobStatus && (
                                <div className={`
                                  text-xs px-2 py-1 rounded-full
                                  ${item.jobStatus === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                  ${item.jobStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${item.jobStatus === 'incompleted' ? 'bg-red-100 text-red-800' : ''}
                                `}>
                                  {item.jobStatus === 'in-progress' ? 'In Progress' : 
                                   item.jobStatus === 'completed' ? 'Completed' : 'Incompleted'}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {dayItems.length > 3 && (
                            <div 
                              className="p-2 text-center text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer border-t"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMoreItemsClick(itemDate, dayItems, dayHolidays, e)
                              }}
                            >
                              +{dayItems.length - 3} more items
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}