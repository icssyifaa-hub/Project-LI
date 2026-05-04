
export type User {
  id: string
  name: string
  email: string
  color: string
  role: 'admin' | 'staff'
  created_at: string
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
  pdfJobOrderPath: string
  pdfJobOrderUrl?: string    
  pdfFinalReportPath: string
  pdfFinalReportUrl?: string
  jobStatus: 'in-progress' | 'completed' | 'incompleted'
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
  location?: string   
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
  pdfJobOrderPath?: string
  pdfJobOrderUrl?: string
  runningNumber?: string
  createdAt: Date
}
 
export type ViewType = 'day' | 'week' | 'month' | 'year' | 'schedule'


export interface StaffOption {
  id: string    
  name: string  
  color: string 
}
