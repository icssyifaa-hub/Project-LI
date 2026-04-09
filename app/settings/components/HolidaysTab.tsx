'use client'

import { useState } from 'react'
import { useHolidays } from '../hooks/useHolidays'
import { Holiday, MALAYSIA_STATES } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Loader2, Save, Calendar, ChevronDown } from 'lucide-react'

export function HolidaysTab() {
  const { holidays, loading, addHoliday, updateHoliday, deleteHoliday } = useHolidays()
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterState, setFilterState] = useState('all')
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    states: [] as string[]
  })
  const [isStatePopoverOpen, setIsStatePopoverOpen] = useState(false)

  // Generate year options (current year -2 to +2)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  // Filter holidays
  const filteredHolidays = holidays.filter(holiday => {
    const holidayYear = new Date(holiday.date).getFullYear()
    const matchesYear = holidayYear === filterYear
    
    let matchesState = true
    if (filterState !== 'all') {
      if (filterState === 'national') {
        matchesState = !holiday.states || holiday.states.length === 0
      } else {
        matchesState = holiday.states?.includes(filterState) || false
      }
    }
    
    return matchesYear && matchesState
  })

  const handleAdd = () => {
    setEditingHoliday(null)
    setFormData({
      name: '',
      date: '',
      states: []
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date,
      states: holiday.states || []
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      toast({ 
        title: "Error", 
        description: "Holiday name and date are required", 
        variant: "destructive" 
      })
      return
    }

    setSaving(true)
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, formData)
      } else {
        await addHoliday(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return
    try {
      await deleteHoliday(id)
    } catch (error) {
      // Error already handled in hook
    }
  }

  const toggleState = (stateValue: string) => {
    setFormData(prev => ({
      ...prev,
      states: prev.states.includes(stateValue)
        ? prev.states.filter(s => s !== stateValue)
        : [...prev.states, stateValue]
    }))
  }

  const getStatesLabel = (stateCodes?: string[] | null) => {
    if (!stateCodes || stateCodes.length === 0) return 'All States (National)'
    if (stateCodes.length === 1) {
      const state = MALAYSIA_STATES.find(s => s.value === stateCodes[0])
      return state ? state.label : stateCodes[0]
    }
    if (stateCodes.length === 2) {
      const states = stateCodes.map(code => 
        MALAYSIA_STATES.find(s => s.value === code)?.label || code
      )
      return states.join(' & ')
    }
    return `${stateCodes.length} states`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <>
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Holiday Management</CardTitle>
              <CardDescription className="text-gray-500">
                Add, edit, or remove holidays - Will appear in calendar
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-blue-300 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <Select
                value={filterYear.toString()}
                onValueChange={(value) => setFilterYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterState}
                onValueChange={setFilterState}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="national">National Only</SelectItem>
                  {MALAYSIA_STATES.map(state => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Holidays Table */}
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">States</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No holidays found for this filter
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((holiday, index) => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {new Date(holiday.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{holiday.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {!holiday.states || holiday.states.length === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            National
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {holiday.states.map(stateCode => {
                              const state = MALAYSIA_STATES.find(s => s.value === stateCode)
                              return state ? (
                                <Badge key={stateCode} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {state.label}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(holiday)}
                            title="Edit holiday"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(holiday.id)}
                            title="Delete holiday"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-4 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Holidays added here will automatically appear in the calendar with a green background.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Fill in the holiday details below
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holidayName" className="text-gray-700">Holiday Name *</Label>
              <Input
                id="holidayName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Hari Merdeka"
                className="border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holidayDate" className="text-gray-700">Date *</Label>
              <Input
                id="holidayDate"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">States (Leave empty for National holiday)</Label>
              <Popover open={isStatePopoverOpen} onOpenChange={setIsStatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between border-gray-300 bg-white hover:bg-gray-50"
                  >
                    {formData.states.length === 0 ? (
                      <span className="text-gray-500">All States (National)</span>
                    ) : (
                      <span className="text-gray-900">
                        {getStatesLabel(formData.states)}
                      </span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-4 bg-white" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b pb-2">
                      <Checkbox
                        id="select-all"
                        checked={formData.states.length === MALAYSIA_STATES.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              states: MALAYSIA_STATES.map(s => s.value)
                            })
                          } else {
                            setFormData({
                              ...formData,
                              states: []
                            })
                          }
                        }}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Select All States
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                      {MALAYSIA_STATES.map((state) => (
                        <div key={state.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={state.value}
                            checked={formData.states.includes(state.value)}
                            onCheckedChange={() => toggleState(state.value)}
                          />
                          <label
                            htmlFor={state.value}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {state.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-2 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({...formData, states: []})}
                      >
                        Clear All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsStatePopoverOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Select multiple states where this holiday is observed. Leave empty for national holiday.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingHoliday ? 'Update' : 'Save'} Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}