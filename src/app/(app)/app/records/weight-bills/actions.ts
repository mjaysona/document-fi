'use server'

import { getPayload } from 'payload'
import config from '~/payload.config'

export interface WeightBillsQuery {
  search?: string
  sortBy?: 'name' | 'date' | 'lastModified'
  sortOrder?: 'asc' | 'desc'
  page?: number
  filterVehicles?: string[]
  filterPaymentStatus?: string[]
  filterVerificationStatus?: string[]
}

const PAGE_SIZE = 10

export async function getWeightBills(query: WeightBillsQuery = {}) {
  try {
    const {
      search = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      filterVehicles = [],
      filterPaymentStatus = [],
      filterVerificationStatus = [],
    } = query
    const normalizedSearch = search.trim().toLowerCase()
    const hasFilter =
      filterVehicles.length > 0 ||
      filterPaymentStatus.length > 0 ||
      filterVerificationStatus.length > 0
    const hasSearchOrFilter = Boolean(normalizedSearch) || hasFilter

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
      limit: hasSearchOrFilter ? 10000 : PAGE_SIZE,
      page: hasSearchOrFilter ? 1 : page,
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

    const usersById = new Map<string, string>()
    const userIds = new Set<string>()

    for (const bill of result.docs as any[]) {
      const submittedById =
        typeof bill.submittedBy === 'string'
          ? bill.submittedBy
          : bill.submittedBy && typeof bill.submittedBy === 'object'
            ? String((bill.submittedBy as { id?: string | number }).id || '')
            : ''
      const verifiedById =
        typeof bill.verifiedBy === 'string'
          ? bill.verifiedBy
          : bill.verifiedBy && typeof bill.verifiedBy === 'object'
            ? String((bill.verifiedBy as { id?: string | number }).id || '')
            : ''

      if (submittedById) userIds.add(submittedById)
      if (verifiedById) userIds.add(verifiedById)
    }

    if (userIds.size > 0) {
      const usersResult = await payload.find({
        collection: 'users',
        where: {
          id: {
            in: Array.from(userIds),
          },
        },
        limit: userIds.size,
        depth: 0,
      })

      for (const user of usersResult.docs as any[]) {
        const displayName = user.name || user.email || String(user.id)
        usersById.set(String(user.id), displayName)
      }
    }

    const transformedDocs = result.docs.map((bill: any) => {
      const resolvedVehicle =
        typeof bill.vehicle === 'string' ? vehiclesById.get(bill.vehicle) || bill.vehicle : ''

      const submittedById =
        typeof bill.submittedBy === 'string'
          ? bill.submittedBy
          : bill.submittedBy && typeof bill.submittedBy === 'object'
            ? String((bill.submittedBy as { id?: string | number }).id || '')
            : ''
      const verifiedById =
        typeof bill.verifiedBy === 'string'
          ? bill.verifiedBy
          : bill.verifiedBy && typeof bill.verifiedBy === 'object'
            ? String((bill.verifiedBy as { id?: string | number }).id || '')
            : ''

      return {
        ...bill,
        vehicle: resolvedVehicle,
        submittedBy: submittedById ? usersById.get(submittedById) || submittedById : '',
        verifiedBy: verifiedById ? usersById.get(verifiedById) || verifiedById : '',
      }
    })

    const docs = hasSearchOrFilter
      ? transformedDocs.filter((bill: any) => {
          if (normalizedSearch) {
            const customerName = String(bill.customerName || '').toLowerCase()
            const vehicleName = String(bill.vehicle || '').toLowerCase()
            const billNumber = String(bill.weightBillNumber || '').toLowerCase()
            if (
              !customerName.includes(normalizedSearch) &&
              !vehicleName.includes(normalizedSearch) &&
              !billNumber.includes(normalizedSearch)
            ) {
              return false
            }
          }
          if (filterVehicles.length > 0 && !filterVehicles.includes(bill.vehicle)) return false
          if (
            filterPaymentStatus.length > 0 &&
            !filterPaymentStatus.includes(bill.paymentStatus || '')
          )
            return false
          if (filterVerificationStatus.length > 0) {
            const status = bill.isVerified ? 'verified' : 'unverified'
            if (!filterVerificationStatus.includes(status)) return false
          }
          return true
        })
      : transformedDocs

    const totalDocs = hasSearchOrFilter ? docs.length : result.totalDocs
    const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const pagedDocs = hasSearchOrFilter
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
    const {
      search = '',
      sortBy = 'date',
      sortOrder = 'desc',
      filterVehicles = [],
      filterPaymentStatus = [],
      filterVerificationStatus = [],
    } = query
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
        if (normalizedSearch) {
          const customerName = String(bill.customerName || '').toLowerCase()
          const vehicleName = String(bill.vehicle || '').toLowerCase()
          const billNumber = String(bill.weightBillNumber || '').toLowerCase()
          if (
            !customerName.includes(normalizedSearch) &&
            !vehicleName.includes(normalizedSearch) &&
            !billNumber.includes(normalizedSearch)
          ) {
            return false
          }
        }
        if (filterVehicles.length > 0 && !filterVehicles.includes(bill.vehicle)) return false
        if (
          filterPaymentStatus.length > 0 &&
          !filterPaymentStatus.includes(bill.paymentStatus || '')
        )
          return false
        if (filterVerificationStatus.length > 0) {
          const status = bill.isVerified ? 'verified' : 'unverified'
          if (!filterVerificationStatus.includes(status)) return false
        }
        return true
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

export async function getVehicleOptions() {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'vehicles',
      sort: 'name',
      limit: 1000,
      depth: 0,
    })
    return {
      success: true,
      data: (result.docs as any[]).map((v) => ({
        value: v.name as string,
        label: v.name as string,
      })),
    }
  } catch (error) {
    console.error('Failed to fetch vehicle options:', error)
    return { success: false, error: String(error), data: [] as { value: string; label: string }[] }
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
