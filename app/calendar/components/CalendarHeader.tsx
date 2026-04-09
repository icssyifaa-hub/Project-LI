// app/calendar/components/CalendarHeader.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Bell,
  History,
  UserCircle,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  ListTodo,
  Menu
} from 'lucide-react'
import type { ViewType } from '@/components/calendar/types'

interface CalendarHeaderProps {
  view: ViewType
  setView: (view: ViewType) => void
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  getTitle: () => string
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  setView,
  currentDate,
  onPrev,
  onNext,
  getTitle,
  mobileMenuOpen,
  setMobileMenuOpen
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          </div>
          <div className="hidden lg:flex items-center space-x-3">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4 mr-2" />
              Reminders
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
            </Button>
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Activity Log
            </Button>
          </div>
          <div className="flex lg:hidden items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">3</span>
            </Button>
            <Button variant="ghost" size="icon">
              <UserCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* View Tabs - Desktop */}
        <div className="hidden lg:flex items-center space-x-2 mt-2 border-b border-gray-200 pb-1">
          {[
            { value: 'day', icon: CalendarIcon, label: 'Day' },
            { value: 'week', icon: CalendarDays, label: 'Week' },
            { value: 'month', icon: CalendarRange, label: 'Month' },
            { value: 'year', icon: CalendarDays, label: 'Year' },
            { value: 'schedule', icon: ListTodo, label: 'Schedule' }
          ].map((item) => (
            <Button
              key={item.value}
              variant={view === item.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView(item.value as ViewType)}
              className={view === item.value ? 'bg-blue-600 text-white' : ''}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>

        {/* View Select - Mobile */}
        <div className="lg:hidden mt-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewType)}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            <option value="day">Day View</option>
            <option value="week">Week View</option>
            <option value="month">Month View</option>
            <option value="year">Year View</option>
            <option value="schedule">Schedule View</option>
          </select>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Menu</h2>
        </div>
        <div className="p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
            <Bell className="h-4 w-4 mr-2" />
            Reminders
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
            <History className="h-4 w-4 mr-2" />
            Activity Log
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{getTitle()}</h2>
        <div className="w-20"></div>
      </div>
    </>
  )
}