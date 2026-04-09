// lib/pdf-service.ts
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface PDFUploadResult {
  fileName: string
  filePath: string
  publicUrl: string
}

export async function uploadPDF(
  file: File,
  taskId: string,
  type: 'job_order' | 'final_report'
): Promise<PDFUploadResult> {
  if (!file) throw new Error('No file provided')
  
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed')
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size cannot exceed 10MB')
  }

  const timestamp = Date.now()
  const safeFileName = `${taskId}_${type}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const filePath = `tasks/${taskId}/${type}/${safeFileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('task-pdfs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-pdfs')
    .getPublicUrl(filePath)

  return {
    fileName: file.name,
    filePath: filePath,
    publicUrl: publicUrl
  }
}

export async function deletePDF(filePath: string): Promise<void> {
  if (!filePath) return
  
  const { error } = await supabase.storage
    .from('task-pdfs')
    .remove([filePath])
  
  if (error) {
    console.error('Error deleting PDF:', error)
  }
}

export async function getPDFUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null
  
  const { data: { publicUrl } } = supabase.storage
    .from('task-pdfs')
    .getPublicUrl(filePath)
  
  return publicUrl
}