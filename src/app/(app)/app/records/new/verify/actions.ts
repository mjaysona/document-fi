'use server'

import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'

type VerifiedData = {
  date: string
  customerName: string
  weightBillNumber?: number
  vehicle: string
  amount?: number
  paymentStatus: string
}

export async function getSessionUploads() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })
    const sessionUploads = await payload.find({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
      limit: 1,
    })

    if (sessionUploads.docs.length === 0) {
      return { success: true, data: null }
    }

    return { success: true, data: sessionUploads.docs[0] }
  } catch (error) {
    console.error('Get session uploads error:', error)
    return { success: false, error: String(error) }
  }
}

export async function verifyAndSaveWeightBill(
  index: number,
  verifiedData: VerifiedData,
  fileName: string,
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })

    // Get current session
    const sessionUploads = await payload.find({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
      limit: 1,
    })

    if (sessionUploads.docs.length === 0) {
      throw new Error('No session found')
    }

    const sessionDoc = sessionUploads.docs[0]
    const uploads = sessionDoc.uploads || []
    const upload = uploads[index]

    if (!upload) {
      throw new Error('Upload not found')
    }

    // Create weight bill with media relationship
    const weightBill = await payload.create({
      collection: 'weight-bills',
      data: {
        ...verifiedData,
        proofOfReceipt: upload.media,
        isVerified: true,
      },
    })

    // Remove the upload from the array
    const newUploads = uploads.filter((_: any, i: number) => i !== index)

    if (newUploads.length === 0) {
      // Delete session if no more uploads
      await payload.delete({
        collection: 'session-uploads',
        id: sessionDoc.id,
      })
    } else {
      // Update session with remaining uploads
      await payload.update({
        collection: 'session-uploads',
        id: sessionDoc.id,
        data: {
          uploads: newUploads,
        },
      })
    }

    return { success: true, data: weightBill }
  } catch (error) {
    console.error('Verify error:', error)
    return { success: false, error: String(error) }
  }
}
