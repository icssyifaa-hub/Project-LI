import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function uploadPDF(file: File, bucket: string, fileName: string) {
  try {
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_')
    const fullFileName = `${safeFileName}_${timestamp}.${fileExt}`
    const filePath = `${fullFileName}`
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      path: filePath,
      publicUrl: publicUrl
    }
  } catch (error) {
    console.error('Error uploading PDF:', error)
    return null
  }
}

export async function deletePDF(filePath: string) {
  try {
    // Determine which bucket the file is in based on path or use default
    let bucket = 'task-job-orders'
    if (filePath.includes('final') || filePath.includes('Final')) {
      bucket = 'task-final-reports'
    }
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting PDF:', error)
    return false
  }
}

export async function getPDFUrl(filePath: string, bucket: string) {
  try {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Error getting PDF URL:', error)
    return null
  }
}