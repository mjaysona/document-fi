import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config })

    const existingSessionResult = await payload.find({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
      limit: 1,
      depth: 0,
    })

    const existingSession = existingSessionResult.docs[0]

    if (!existingSession) {
      return NextResponse.json({ success: true, data: { cleared: false } })
    }

    const previousMediaIds = (existingSession.uploads || [])
      .map((upload) =>
        typeof upload.media === 'string'
          ? upload.media
          : upload.media && typeof upload.media === 'object' && 'id' in upload.media
            ? String(upload.media.id)
            : '',
      )
      .filter((id) => Boolean(id))

    await payload.delete({
      collection: 'session-uploads',
      id: existingSession.id,
      depth: 0,
    })

    for (const mediaId of previousMediaIds) {
      try {
        await payload.delete({
          collection: 'media',
          id: mediaId,
          depth: 0,
        })
      } catch (deleteError) {
        console.error('Failed to delete previous session media:', mediaId, deleteError)
      }
    }

    return NextResponse.json({ success: true, data: { cleared: true } })
  } catch (error) {
    console.error('Reset session upload error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
