'use client'

import { useState } from 'react'
import { usePDF } from '../hooks/usePDF'
import { PDFTemplate } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Upload, 
  Download, 
  Trash2, 
  Loader2, 
  FileText,
  Eye
} from 'lucide-react'

export function PDFTab() {
  const { templates, loading, uploading, uploadPDF, downloadPDF, deletePDF } = usePDF()
  const { toast } = useToast()
  
  const [jobOrderFile, setJobOrderFile] = useState<File | null>(null)
  const [finalReportFile, setFinalReportFile] = useState<File | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    template: PDFTemplate | null
  }>({ isOpen: false, template: null })

  const handleUpload = async (type: 'job-order' | 'final-report', file: File | null) => {
    if (!file) {
      toast({ 
        title: "Error", 
        description: "Please select a file", 
        variant: "destructive" 
      })
      return
    }

    if (file.type !== 'application/pdf') {
      toast({ 
        title: "Error", 
        description: "Only PDF files are allowed", 
        variant: "destructive" 
      })
      return
    }

    try {
      await uploadPDF(type, file)
      // Clear file input
      if (type === 'job-order') {
        setJobOrderFile(null)
      } else {
        setFinalReportFile(null)
      }
      // Reset file input
      const fileInput = document.getElementById(`${type}-file`) as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      // Error already handled in hook
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.template) return

    try {
      await deletePDF(deleteDialog.template.id, deleteDialog.template.file_url || undefined)
      setDeleteDialog({ isOpen: false, template: null })
    } catch (error) {
      // Error already handled in hook
    }
  }

  const getTemplate = (type: 'job-order' | 'final-report'): PDFTemplate | undefined => {
    return templates.find(t => t.type === type)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
        <CardHeader>
          <CardTitle className="text-gray-900">PDF File Settings</CardTitle>
          <CardDescription className="text-gray-500">
            Manage PDF templates for Job Orders and Final Reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Order PDF */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Job Order Template</h3>
              {getTemplate('job-order') && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Uploaded
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Input 
                  id="job-order-file"
                  type="file" 
                  accept=".pdf" 
                  className="flex-1"
                  onChange={(e) => setJobOrderFile(e.target.files?.[0] || null)}
                />
                <Button 
                  variant="outline"
                  onClick={() => handleUpload('job-order', jobOrderFile)}
                  disabled={!jobOrderFile || uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
              </div>

              {getTemplate('job-order') && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getTemplate('job-order')?.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded: {formatDate(getTemplate('job-order')!.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600"
                      onClick={() => downloadPDF(getTemplate('job-order')!)}
                      title="View/Download"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setDeleteDialog({ 
                        isOpen: true, 
                        template: getTemplate('job-order')! 
                      })}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Final Report PDF */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Final Report Template</h3>
              {getTemplate('final-report') && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Uploaded
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Input 
                  id="final-report-file"
                  type="file" 
                  accept=".pdf" 
                  className="flex-1"
                  onChange={(e) => setFinalReportFile(e.target.files?.[0] || null)}
                />
                <Button 
                  variant="outline"
                  onClick={() => handleUpload('final-report', finalReportFile)}
                  disabled={!finalReportFile || uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
              </div>

              {getTemplate('final-report') && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getTemplate('final-report')?.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded: {formatDate(getTemplate('final-report')!.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600"
                      onClick={() => downloadPDF(getTemplate('final-report')!)}
                      title="View/Download"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setDeleteDialog({ 
                        isOpen: true, 
                        template: getTemplate('final-report')! 
                      })}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            ℹ️ Uploaded PDFs will be available when generating Job Orders and Final Reports.
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => 
        setDeleteDialog(open ? deleteDialog : { isOpen: false, template: null })
      }>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete PDF Template</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to delete "{deleteDialog.template?.file_name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialog({ isOpen: false, template: null })}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}