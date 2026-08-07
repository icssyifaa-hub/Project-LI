import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const BUCKET_NAME = 'user-manual'
const MANUAL_FILE_NAME = 'user-manual.pdf'
const MANUAL_PATH = MANUAL_FILE_NAME

const isBucketNotFoundError = (error: { message?: string } | null) => (
  !!error?.message && (
    error.message.toLowerCase().includes('bucket not found') ||
    error.message.toLowerCase().includes('not found')
  )
)

async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('users')
    .select('id, name, email, role, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (error || !data || !data.is_active) return null
  return data
}

async function getManualPayload() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 1,
      search: MANUAL_FILE_NAME,
    })

  if (isBucketNotFoundError(error)) {
    return {
      exists: false,
      fileName: null,
      updatedAt: null,
      url: null,
    }
  }

  if (error) throw error

  const manual = data?.find((item) => item.name === MANUAL_FILE_NAME)

  if (!manual) {
    return {
      exists: false,
      fileName: null,
      updatedAt: null,
      url: null,
    }
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(MANUAL_PATH, 60 * 60)

  if (signedError) throw signedError

  return {
    exists: true,
    fileName: manual.name,
    updatedAt: manual.updated_at || manual.created_at || null,
    url: signedData.signedUrl,
  }
}

async function ensureManualBucketExists() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.getBucket(BUCKET_NAME)

  if (data && !error) return
  if (error && !isBucketNotFoundError(error)) throw error

  const { error: createError } = await admin.storage.createBucket(BUCKET_NAME, {
    public: false,
    allowedMimeTypes: ['application/pdf'],
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw createError
  }
}

export async function GET() {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getManualPayload())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load user manual'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update the user manual' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    await ensureManualBucketExists()

    const admin = createAdminSupabaseClient()
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(MANUAL_PATH, fileBuffer, {
        cacheControl: '60',
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    return NextResponse.json(await getManualPayload())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update user manual'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const profile = await getCurrentProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove the user manual' }, { status: 403 })
    }

    const admin = createAdminSupabaseClient()
    const { error } = await admin.storage.from(BUCKET_NAME).remove([MANUAL_PATH])

    if (error) throw error

    return NextResponse.json(await getManualPayload())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove user manual'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
