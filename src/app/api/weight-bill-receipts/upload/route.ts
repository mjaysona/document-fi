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
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const buffer = Buffer.from(await file.arrayBuffer())

    const media = await payload.create({
      collection: 'weight-bill-receipts',
      data: {},
      file: {
        data: buffer,
        name: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: buffer.length,
      },
      depth: 0,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: String(media.id),
        fileName: media.filename || file.name,
        url: media.url || '',
      },
    })
  } catch (error) {
    console.error('Weight bill receipt upload error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
