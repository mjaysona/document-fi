'use server'

import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'

type VehicleOption = {
  id: string
  name: string
  amount: number
}

type VerifiedData = {
  date: string
  customerName: string
  weightBillNumber?: number
  vehicle?: string
  amount?: number
  paymentStatus?: 'PAID' | 'CANCELLED'
  proofOfReceipt?: string
}

async function resolveVehicleId(payload: any, vehicleValue?: string): Promise<string | undefined> {
  if (!vehicleValue) return undefined

  const trimmedVehicleValue = vehicleValue.trim()

  const vehicles = await payload.find({
    collection: 'vehicles',
    limit: 1000,
    depth: 0,
  })

  const matchedById = vehicles.docs.find(
    (vehicle: any) => String(vehicle.id) === trimmedVehicleValue,
  )

  if (matchedById) {
    return String(matchedById.id)
  }

  const matchedByName = vehicles.docs.find((vehicle: any) => vehicle.name === trimmedVehicleValue)

  if (matchedByName) {
    return String(matchedByName.id)
  }

  return undefined
}

function formatDateForInput(dateValue?: string | null): string {
  if (!dateValue) return ''

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return parsedDate.toISOString().split('T')[0] || ''
}

export async function getSessionUploads() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })
    const vehicles = await payload.find({
      collection: 'vehicles',
      sort: 'name',
      limit: 100,
    })
    const sessionUploads = await payload.find({
      collection: 'session-uploads',
      where: {
        userId: { equals: session.user.id },
      },
      limit: 1,
    })

    if (sessionUploads.docs.length === 0) {
      return {
        success: true,
        data: {
          session: null,
          vehicles: vehicles.docs.map((vehicle) => ({
            id: String(vehicle.id),
            name: vehicle.name,
            amount: vehicle.amount,
          })) as VehicleOption[],
        },
      }
    }

    return {
      success: true,
      data: {
        session: sessionUploads.docs[0],
        vehicles: vehicles.docs.map((vehicle) => ({
          id: String(vehicle.id),
          name: vehicle.name,
          amount: vehicle.amount,
        })) as VehicleOption[],
      },
    }
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

    const resolvedVehicleId = await resolveVehicleId(payload, weightBillData.vehicle)
    const normalizedWeightBillData = {
      ...weightBillData,
      vehicle: resolvedVehicleId,
      proofOfReceipt: weightBillData.proofOfReceipt || upload.media,
    }

    // Check if weight bill with the same number already exists
    let weightBill
    const existingBills = await payload.find({
      collection: 'weight-bills',
      where: {
        weightBillNumber: { equals: weightBillData.weightBillNumber },
      },
      limit: 1,
      depth: 0,
    })

    if (existingBills.docs.length > 0) {
      // Update existing weight bill
      weightBill = await payload.update({
        collection: 'weight-bills',
        id: existingBills.docs[0].id,
        data: {
          ...normalizedWeightBillData,
          isVerified,
        },
        depth: 0,
      })
    } else {
      // Create new weight bill
      weightBill = await payload.create({
        collection: 'weight-bills',
        data: {
          ...normalizedWeightBillData,
          isVerified,
        },
        depth: 0,
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

export async function getWeightBillForEdit(weightBillId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })

    const [weightBill, vehicles] = await Promise.all([
      payload.findByID({
        collection: 'weight-bills',
        id: weightBillId,
        depth: 0,
      }),
      payload.find({
        collection: 'vehicles',
        sort: 'name',
        limit: 1000,
        depth: 0,
      }),
    ])

    const vehicleOptions = vehicles.docs.map((vehicle: any) => ({
      id: String(vehicle.id),
      name: vehicle.name,
      amount: vehicle.amount,
    })) as VehicleOption[]

    const selectedVehicleId = await resolveVehicleId(payload, String(weightBill.vehicle || ''))
    const selectedVehicle = vehicleOptions.find((vehicle) => vehicle.id === selectedVehicleId)
    const paymentStatus: '' | 'PAID' | 'CANCELLED' =
      weightBill.paymentStatus === 'PAID' || weightBill.paymentStatus === 'CANCELLED'
        ? weightBill.paymentStatus
        : ''

    let imagePreviewUrl = ''
    let fileName = 'Weight Bill'
    let proofOfReceiptMediaId: string | undefined

    if (typeof weightBill.proofOfReceipt === 'string' && weightBill.proofOfReceipt) {
      imagePreviewUrl = `/api/media/${weightBill.proofOfReceipt}`
      proofOfReceiptMediaId = String(weightBill.proofOfReceipt)

      const mediaDoc = await payload.findByID({
        collection: 'media',
        id: weightBill.proofOfReceipt,
        depth: 0,
      })

      fileName = mediaDoc.filename || fileName
    }

    return {
      success: true,
      data: {
        vehicles: vehicleOptions,
        record: {
          id: String(weightBill.id),
          fileName,
          proofOfReceiptFileName: fileName,
          proofOfReceiptMediaId,
          fileData: '',
          imagePreviewUrl,
          parsedResult: null,
          date: formatDateForInput(weightBill.date),
          customerName: weightBill.customerName || '',
          weightBillNumber: weightBill.weightBillNumber ?? undefined,
          vehicle: selectedVehicleId || '',
          amount: selectedVehicle?.amount ?? weightBill.amount ?? undefined,
          paymentStatus,
          analyzed: true,
        },
      },
    }
  } catch (error) {
    console.error('Get weight bill for edit error:', error)
    return { success: false, error: String(error) }
  }
}

export async function saveWeightBillManual(
  weightBillData: VerifiedData,
  isVerified: boolean = false,
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })
    const resolvedVehicleId = await resolveVehicleId(payload, weightBillData.vehicle)

    const existingBills = await payload.find({
      collection: 'weight-bills',
      where: {
        weightBillNumber: { equals: weightBillData.weightBillNumber },
      },
      limit: 1,
      depth: 0,
    })

    let weightBill
    const normalizedData = { ...weightBillData, vehicle: resolvedVehicleId, isVerified }

    if (existingBills.docs.length > 0) {
      weightBill = await payload.update({
        collection: 'weight-bills',
        id: existingBills.docs[0].id,
        data: normalizedData,
        depth: 0,
      })
    } else {
      weightBill = await payload.create({
        collection: 'weight-bills',
        data: normalizedData,
        depth: 0,
      })
    }

    return { success: true, data: weightBill }
  } catch (error) {
    console.error('Save weight bill manual error:', error)
    return { success: false, error: String(error) }
  }
}

export async function updateWeightBillById(
  weightBillId: string,
  weightBillData: VerifiedData,
  isVerified?: boolean,
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const payload = await getPayload({ config })
    const resolvedVehicleId = await resolveVehicleId(payload, weightBillData.vehicle)

    const updatedWeightBill = await payload.update({
      collection: 'weight-bills',
      id: weightBillId,
      data: {
        ...weightBillData,
        vehicle: resolvedVehicleId,
        proofOfReceipt: weightBillData.proofOfReceipt,
        ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
      },
      depth: 0,
    })

    return { success: true, data: updatedWeightBill }
  } catch (error) {
    console.error('Update weight bill by ID error:', error)
    return { success: false, error: String(error) }
  }
}
