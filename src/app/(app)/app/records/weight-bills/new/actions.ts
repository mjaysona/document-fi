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
        collection: 'weight-bill-receipts',
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

    const existingSessionResult = await payload.find({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
      limit: 1,
      depth: 0,
    })

    const existingSession = existingSessionResult.docs[0]

    if (existingSession) {
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
          const mediaInUse = await payload.find({
            collection: 'weight-bills',
            where: {
              proofOfReceipt: {
                equals: mediaId,
              },
            },
            limit: 1,
            depth: 0,
          })

          if (mediaInUse.docs.length > 0) {
            continue
          }

          await payload.delete({
            collection: 'weight-bill-receipts',
            id: mediaId,
            depth: 0,
          })
        } catch (deleteError) {
          console.error('Failed to delete previous session media:', mediaId, deleteError)
        }
      }
    }

    const sessionUpload = await payload.create({
      collection: 'session-uploads',
      data: {
        userId: session.user.id,
        documentType: 'weight-bill',
        uploads: uploads.map((u) => ({
          fileName: u.fileName,
          media: u.mediaId,
          savedStatus: 'unsaved',
        })),
      },
      depth: 0,
    })

    return { success: true, data: sessionUpload }
  } catch (error) {
    console.error('Create session upload error:', error)
    return { success: false, error: String(error) }
  }
}
