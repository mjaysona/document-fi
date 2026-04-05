'use server'

import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'

type FileRecord = {
  fileName: string
  fileData: string
}

export async function createSessionUpload(records: FileRecord[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })

    // Upload all files to Media collection first
    const uploadPromises = records.map(async (record) => {
      const buffer = Buffer.from(record.fileData, 'base64')
      const media = await payload.create({
        collection: 'media',
        data: {},
        file: {
          data: buffer,
          name: record.fileName,
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
      })
      return { fileName: record.fileName, mediaId: media.id }
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

    return { success: true, data: sessionUpload }
  } catch (error) {
    console.error('Create session upload error:', error)
    return { success: false, error: String(error) }
  }
}
