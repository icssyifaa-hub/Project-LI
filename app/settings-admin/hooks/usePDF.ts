import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PDFTemplate } from '../types'
import { useToast } from '@/components/ui/use-toast'
export function usePDF() {
  const [templates, setTemplates] = useState<PDFTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('type', { ascending: true })
      
      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to fetch PDF templates", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadPDF = async (type: 'job-order' | 'final-report', file: File) => {
    setUploading(true)
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}-${Date.now()}.${fileExt}`
      const filePath = `pdf-templates/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Check if template already exists
      const existingTemplate = templates.find(t => t.type === type)

      if (existingTemplate) {
        // Delete old file
        if (existingTemplate.file_url) {
          const oldPath = existingTemplate.file_url.split('/').pop()
          if (oldPath) {
            await supabase.storage
              .from('documents')
              .remove([`pdf-templates/${oldPath}`])
          }
        }

        // Update database
        const { error: updateError } = await supabase
          .from('pdf_templates')
          .update({
            file_url: publicUrl,
            file_name: fileName,
            uploaded_at: new Date().toISOString()
          })
          .eq('id', existingTemplate.id)

        if (updateError) throw updateError

        setTemplates(templates.map(t => 
          t.type === type 
            ? { ...t, file_url: publicUrl, file_name: fileName, uploaded_at: new Date().toISOString() }
            : t
        ))
      } else {
        // Insert new
        const { data, error: insertError } = await supabase
          .from('pdf_templates')
          .insert([{
            name: type === 'job-order' ? 'Job Order Template' : 'Final Report Template',
            file_url: publicUrl,
            file_name: fileName,
            type: type,
            uploaded_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (insertError) throw insertError
        setTemplates([...templates, data])
      }

      toast({ title: "PDF uploaded successfully" })
      return true
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to upload PDF", 
        variant: "destructive" 
      })
      throw error
    } finally {
      setUploading(false)
    }
  }

  const downloadPDF = (template: PDFTemplate) => {
    if (template.file_url) {
      window.open(template.file_url, '_blank')
    }
  }

  const deletePDF = async (id: string, fileUrl?: string) => {
    try {
      // Delete from storage if exists
      if (fileUrl) {
        const fileName = fileUrl.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('documents')
            .remove([`pdf-templates/${fileName}`])
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTemplates(templates.filter(t => t.id !== id))
      toast({ title: "PDF deleted successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete PDF", 
        variant: "destructive" 
      })
      throw error
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return {
    templates,
    loading,
    uploading,
    uploadPDF,
    downloadPDF,
    deletePDF,
    refresh: fetchTemplates
  }
}