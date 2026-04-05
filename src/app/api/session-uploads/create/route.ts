import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Upload all files to Media collection first
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const media = await payload.create({
        collection: 'media',
        data: {},
        file: {
          data: buffer,
          name: file.name,
          mimetype: file.type || 'application/octet-stream',
          size: buffer.length,
        },
      })
      return { fileName: file.name, mediaId: media.id }
    })

    const uploads = await Promise.all(uploadPromises)

    // Delete existing session for user
    await payload.delete({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
    })

    // Create new session with media relationships
    const sessionUpload = await payload.create({
      collection: 'session-uploads',
      data: {
        userId: session.user.id,
        documentType: 'weight-bill',
        uploads: uploads.map((u) => ({
          fileName: u.fileName,
          media: u.mediaId,
        })),
      },
    })

    return NextResponse.json({ success: true, data: sessionUpload })
  } catch (error) {
    console.error('Create session upload error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
