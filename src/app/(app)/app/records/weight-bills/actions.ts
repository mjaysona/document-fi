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

    const payload = await getPayload({ config })

    // Build where clause for search
    let where: any = undefined
    if (search) {
      where = {
        or: [
          {
            customerName: {
              contains: search,
            },
          },
          {
            vehicle: {
              contains: search,
            },
          },
        ],
      }
    }

    // Map sortBy to actual field names
    let sort = 'updatedAt'
    if (sortBy === 'name') {
      sort = 'customerName'
    } else if (sortBy === 'date') {
      sort = 'date'
    } else if (sortBy === 'lastModified') {
      sort = 'updatedAt'
    }

    const skip = (page - 1) * PAGE_SIZE

    const result = await payload.find({
      collection: 'weight-bills',
      where,
      sort: sortOrder === 'asc' ? sort : `-${sort}`,
      limit: PAGE_SIZE,
      skip,
    })

    return {
      success: true,
      data: result.docs,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalDocs: result.totalDocs,
        totalPages: Math.ceil(result.totalDocs / PAGE_SIZE),
        hasNextPage: page < Math.ceil(result.totalDocs / PAGE_SIZE),
        hasPrevPage: page > 1,
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

    const payload = await getPayload({ config })

    // Build where clause for search
    let where: any = undefined
    if (search) {
      where = {
        or: [
          {
            customerName: {
              contains: search,
            },
          },
          {
            vehicle: {
              contains: search,
            },
          },
        ],
      }
    }

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
      where,
      sort: sortOrder === 'asc' ? sort : `-${sort}`,
      limit: 10000, // Large limit for export
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
    const rows = result.docs.map((bill: any) => [
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
