// types/calendar.ts

export interface Task {
  id: string
  clientName: string
  runningNumber: string
  jobTask: string
  dateStart: string
  dateStop: string
  timeStart?: string
  timeStop?: string
  additionalRemark?: string
  pdfJobOrder: File | null
  pdfJobOrderName: string
  pdfJobOrderPath: string
  pdfJobOrderUrl?: string 
  taskPicStaff: string           
  taskSupportStaff?: string      
  pdfFinalReport: File | null
  pdfFinalReportName: string
  pdfFinalReportPath: string
  pdfFinalReportUrl?: string
  finalReportStaff?: string
  jobStatus: 'in-progress' | 'completed' | 'incompleted'
  createdby?: string
  createdAt?: string
  updatedAt?: string
  task_pic_color?: string        
  task_pic_name?: string         
  task_support_color?: string   
  task_support_name?: string     
}

export interface Event {
  id: string
  title: string
  description?: string
  dateStart: string
  dateStop: string
  timeStart?: string
  timeStop?: string
  location?: string
  eventPicStaff?: string        
  eventSupportStaff?: string     
  createdby?: string
  createdAt?: string
  updatedAt?: string
  event_pic_color?: string       
  event_pic_name?: string        
  event_support_color?: string 
  event_support_name?: string    
}

export interface Holiday {
  id: string
  name: string
  date: string
  states?: string[]
}

export interface StaffColor {
  code: string     
  name: string     
  color: string     
  id: string       
}
export interface UnscheduledTask {
  id: string
  clientName: string
  jobTask: string
  jobTaskCode?: string
  taskPicStaff: string
  taskPicName?: string
  taskPicColor?: string
  pdfJobOrder?: string
  pdfJobOrderName?: string
  pdfJobOrderPath?: string
  pdfJobOrderUrl?: string
  runningNumber?: string
  createdAt: Date
}

export type ViewType = 'day' | 'week' | 'month' | 'year' | 'schedule'