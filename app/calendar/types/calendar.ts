
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  is_active: boolean
  created_at: string
  updated_at?: string
  phone?: string
  color?: string

}

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
  jobOrderNumber?: string
  finalReportNumber?: string
  jobStatus: 'onhold' | 'in-progress' | 'completed' | 'incomplete'
  createdby?: string              
  createdAt?: string
  updatedAt?: string
  task_pic_id?: string          
  task_pic_color?: string         
  task_pic_name?: string
  task_support_ids?: string[]
  task_support_names?: string[]
  task_support_colors?: string[]    
}

export interface Event {
  id: string
  title: string
  description?: string
  dateStart: string
  dateStop: string
  timeStart?: string
  timeStop?: string
  createdby?: string              
  createdAt?: string
  updatedAt?: string
  event_pic_id?: string            
  event_pic_color?: string        
  event_pic_name?: string
  event_support_ids?: string[]         
  event_support_names?: string[]     
  event_support_colors?: string[]      
}

export interface Holiday {
  id: string
  name: string
  date: string
  states?: string[]
}

export interface StaffInfo {
  id: string        
  name: string        
  color: string       
  role?: string
  email?: string     
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
  task_pic_id?: string          
  task_pic_name?: string         
  task_pic_color?: string        
  jobOrderNumber?: string
  finalReportNumber?: string
  runningNumber?: string
  createdAt: Date
}
 
export type ViewType = 'day' | 'week' | 'month' | 'year' | 'schedule'


export interface StaffOption {
  id: string
  name: string  
  color: string 
}
