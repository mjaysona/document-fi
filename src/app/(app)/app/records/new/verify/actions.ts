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
  paymentStatus?: 'PAID' | 'CANCELLED'
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

export async function saveWeightBill(
  index: number,
  weightBillData: VerifiedData,
  fileName: string,
  isVerified: boolean = false,
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

    // Check if weight bill with the same number already exists
    let weightBill
    const existingBills = await payload.find({
      collection: 'weight-bills',
      where: {
        weightBillNumber: { equals: weightBillData.weightBillNumber },
      },
      limit: 1,
    })

    if (existingBills.docs.length > 0) {
      // Update existing weight bill
      weightBill = await payload.update({
        collection: 'weight-bills',
        id: existingBills.docs[0].id,
        data: {
          ...weightBillData,
          proofOfReceipt: upload.media,
          isVerified,
        },
      })
    } else {
      // Create new weight bill
      weightBill = await payload.create({
        collection: 'weight-bills',
        data: {
          ...weightBillData,
          proofOfReceipt: upload.media,
          isVerified,
        },
      })
    }

    // Update the upload's savedStatus instead of removing it
    const newUploads = uploads.map((u: any, i: number) =>
      i === index
        ? {
            ...u,
            savedStatus: isVerified ? 'verified' : 'saved',
          }
        : u,
    )

    // Update session with updated uploads
    await payload.update({
      collection: 'session-uploads',
      id: sessionDoc.id,
      data: {
        uploads: newUploads,
      },
    })

    return { success: true, data: weightBill }
  } catch (error) {
    console.error('Save weight bill error:', error)
    return { success: false, error: String(error) }
  }
}

export async function verifyAndSaveWeightBill(
  index: number,
  verifiedData: VerifiedData,
  fileName: string,
) {
  return saveWeightBill(index, verifiedData, fileName, true)
}
