'use server'

import { getPayload } from 'payload'
import config from '~/payload.config'

export interface WeightBillsQuery {
  search?: string
  sortBy?: 'name' | 'date' | 'lastModified'
  sortOrder?: 'asc' | 'desc'
  page?: number
}

const PAGE_SIZE = 10

export async function getWeightBills(query: WeightBillsQuery = {}) {
  try {
    const { search = '', sortBy = 'date', sortOrder = 'desc', page = 1 } = query
    const normalizedSearch = search.trim().toLowerCase()

    const payload = await getPayload({ config })

    // Map sortBy to actual field names
    let sort = 'updatedAt'
    if (sortBy === 'name') {
      sort = 'customerName'
    } else if (sortBy === 'date') {
      sort = 'date'
    } else if (sortBy === 'lastModified') {
      sort = 'updatedAt'
    }

    const result = await payload.find({
      collection: 'weight-bills',
      sort: sortOrder === 'asc' ? sort : `-${sort}`,
      limit: normalizedSearch ? 10000 : PAGE_SIZE,
      page: normalizedSearch ? 1 : page,
      depth: 0,
    })

    const vehiclesById = new Map<string, string>()

    const vehiclesResult = await payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
    })

    for (const vehicle of vehiclesResult.docs as any[]) {
      vehiclesById.set(String(vehicle.id), vehicle.name || '')
    }

    const transformedDocs = result.docs.map((bill: any) => {
      const resolvedVehicle =
        typeof bill.vehicle === 'string' ? vehiclesById.get(bill.vehicle) || bill.vehicle : ''

      return {
        ...bill,
        vehicle: resolvedVehicle,
      }
    })

    const docs = normalizedSearch
      ? transformedDocs.filter((bill: any) => {
          const customerName = String(bill.customerName || '').toLowerCase()
          const vehicleName = String(bill.vehicle || '').toLowerCase()

          return customerName.includes(normalizedSearch) || vehicleName.includes(normalizedSearch)
        })
      : transformedDocs

    const totalDocs = normalizedSearch ? docs.length : result.totalDocs
    const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const pagedDocs = normalizedSearch
      ? docs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
      : docs

    return {
      success: true,
      data: pagedDocs,
      pagination: {
        page: safePage,
        pageSize: PAGE_SIZE,
        totalDocs,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    }
  } catch (error) {
    console.error('Failed to fetch weight bills:', error)
    return {
      success: false,
      error: 'Failed to fetch weight bills',
    }
  }
}

export async function exportWeightBillsToCSV(query: WeightBillsQuery = {}) {
  try {
    const { search = '', sortBy = 'date', sortOrder = 'desc' } = query
    const normalizedSearch = search.trim().toLowerCase()

    const payload = await getPayload({ config })

    // Map sortBy to actual field names
    let sort = 'updatedAt'
    if (sortBy === 'name') {
      sort = 'customerName'
    } else if (sortBy === 'date') {
      sort = 'date'
    } else if (sortBy === 'lastModified') {
      sort = 'updatedAt'
    }

    // Fetch all bills without pagination for export
    const result = await payload.find({
      collection: 'weight-bills',
      sort: sortOrder === 'asc' ? sort : `-${sort}`,
      limit: 10000, // Large limit for export
      depth: 0,
    })

    const vehiclesById = new Map<string, string>()

    const vehiclesResult = await payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
    })

    for (const vehicle of vehiclesResult.docs as any[]) {
      vehiclesById.set(String(vehicle.id), vehicle.name || '')
    }

    const transformedDocs = result.docs
      .map((bill: any) => ({
        ...bill,
        vehicle:
          typeof bill.vehicle === 'string' ? vehiclesById.get(bill.vehicle) || bill.vehicle : '',
      }))
      .filter((bill: any) => {
        if (!normalizedSearch) return true

        const customerName = String(bill.customerName || '').toLowerCase()
        const vehicleName = String(bill.vehicle || '').toLowerCase()

        return customerName.includes(normalizedSearch) || vehicleName.includes(normalizedSearch)
      })

    // Convert to CSV format
    const headers = [
      'Bill #',
      'Date',
      'Customer Name',
      'Vehicle',
      'Amount',
      'Payment Status',
      'Verified',
    ]
    const rows = transformedDocs.map((bill: any) => [
      bill.weightBillNumber || '',
      bill.date ? new Date(bill.date).toLocaleDateString() : '',
      bill.customerName || '',
      bill.vehicle || '',
      bill.amount || '',
      bill.paymentStatus || '',
      bill.isVerified ? 'Yes' : 'No',
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return {
      success: true,
      data: csvContent,
      filename: `weight-bills-${new Date().toISOString().split('T')[0]}.csv`,
    }
  } catch (error) {
    console.error('Failed to export weight bills:', error)
    return {
      success: false,
      error: 'Failed to export weight bills',
    }
  }
}

export async function deleteWeightBill(id: string) {
  try {
    const payload = await getPayload({ config })

    const weightBill = await payload.findByID({
      collection: 'weight-bills',
      id,
      depth: 0,
    })

    const proofOfReceiptId =
      typeof weightBill.proofOfReceipt === 'string'
        ? weightBill.proofOfReceipt
        : weightBill.proofOfReceipt && typeof weightBill.proofOfReceipt === 'object'
          ? String((weightBill.proofOfReceipt as { id?: string }).id || '')
          : ''

    await payload.delete({
      collection: 'weight-bills',
      id,
      depth: 0,
    })

    if (proofOfReceiptId) {
      await payload.delete({
        collection: 'media',
        id: proofOfReceiptId,
        depth: 0,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete weight bill:', error)
    return {
      success: false,
      error: 'Failed to delete weight bill',
    }
  }
}

export async function deleteWeightBills(ids: string[]) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'No records selected for deletion',
      }
    }

    const payload = await getPayload({ config })

    for (const id of ids) {
      const weightBill = await payload.findByID({
        collection: 'weight-bills',
        id,
        depth: 0,
      })

      const proofOfReceiptId =
        typeof weightBill.proofOfReceipt === 'string'
          ? weightBill.proofOfReceipt
          : weightBill.proofOfReceipt && typeof weightBill.proofOfReceipt === 'object'
            ? String((weightBill.proofOfReceipt as { id?: string }).id || '')
            : ''

      await payload.delete({
        collection: 'weight-bills',
        id,
        depth: 0,
      })

      if (proofOfReceiptId) {
        await payload.delete({
          collection: 'media',
          id: proofOfReceiptId,
          depth: 0,
        })
      }
    }

    return {
      success: true,
      count: ids.length,
    }
  } catch (error) {
    console.error('Failed to delete selected weight bills:', error)
    return {
      success: false,
      error: 'Failed to delete selected weight bills',
    }
  }
}
