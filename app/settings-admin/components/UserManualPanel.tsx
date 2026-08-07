'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  settingsCardClass,
  settingsContentClass,
  settingsDescriptionClass,
  settingsHeaderClass,
  settingsHeaderRowClass,
  settingsInputClass,
  settingsPrimaryButtonClass,
  settingsTitleClass,
} from './settings-styles'

type UserManual = {
  exists: boolean
  fileName: string | null
  updatedAt: string | null
  url: string | null
}

type UserManualPanelProps = {
  canManage?: boolean
}

const formatUpdatedAt = (value: string | null) => {
  if (!value) return 'Not uploaded yet'

  return new Date(value).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UserManualPanel({ canManage = false }: UserManualPanelProps) {
  const [manual, setManual] = useState<UserManual | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const loadManual = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user-manual', { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to load user manual')
      setManual(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user manual'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
      setManual(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadManual()
  }, [loadManual])

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      return
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      toast({
        title: 'Invalid file',
        description: 'Please select a PDF file only.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/user-manual', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to update user manual')

      setManual(result)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast({ title: 'User manual updated' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user manual'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch('/api/user-manual', { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to remove user manual')

      setManual(result)
      toast({ title: 'User manual removed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove user manual'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const manualUrl = manual?.url || ''

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsHeaderClass}>
        <div className={settingsHeaderRowClass}>
          <div>
            <CardTitle className={settingsTitleClass}>
              <FileText className="h-5 w-5 text-blue-600" />
              User Manual
            </CardTitle>
            <CardDescription className={settingsDescriptionClass}>
              {canManage
                ? 'Upload and replace the PDF manual shown to staff.'
                : 'View the latest PDF manual uploaded by admin.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadManual}
            disabled={loading || uploading || deleting}
            className="border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className={settingsContentClass}>
        {canManage && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="userManualPdf" className="text-gray-700 dark:text-gray-200">
                  Upload PDF Manual
                </Label>
                <Input
                  ref={fileInputRef}
                  id="userManualPdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                  className={settingsInputClass}
                  disabled={uploading || deleting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Uploading a new PDF replaces the current user manual.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading || deleting}
                className={settingsPrimaryButtonClass}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Update Manual
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : manual?.exists && manualUrl ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {manual.fileName || 'user-manual.pdf'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {formatUpdatedAt(manual.updatedAt)}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(manualUrl, '_blank')}
                  className="border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Open PDF
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleting || uploading}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-950">
              <iframe
                key={manualUrl}
                src={manualUrl}
                title="User Manual PDF"
                className="h-[70vh] min-h-[520px] w-full bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center dark:border-gray-700 dark:bg-gray-950/50">
            <AlertCircle className="mb-3 h-9 w-9 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No user manual uploaded yet</p>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {canManage
                ? 'Upload a PDF manual above so staff can view it here.'
                : 'Please check again later after admin uploads the user manual.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
