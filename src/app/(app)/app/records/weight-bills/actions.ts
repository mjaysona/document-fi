'use server'

import { auth } from '@/app/(app)/lib/auth'
import { updateGoogleSheetFromWeightBillsService } from '@/lib/googleSheetWeightBillSync'
import { parseWeightBillSpreadsheet, REQUIRED_IMPORT_TEMPLATE_HEADERS } from './spreadsheetImport'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import * as XLSX from 'xlsx'
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

type ImportVehicle = {
  id: string
  name: string
  amount?: number
}

const normalizeDateForComparison = (dateValue: unknown): string => {
  if (typeof dateValue === 'string') {
    // If already ISO date, extract just YYYY-MM-DD
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0]
    }
    // Otherwise assume it's already YYYY-MM-DD
    return dateValue.trim()
  }
  return ''
}

const formatDateForExport = (dateValue: unknown): string => {
  const value = String(dateValue || '').trim()
  if (!value) return ''

  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''

  return parsed.toISOString().split('T')[0] || ''
}

const normalizeLookupKey = (value: string): string => value.trim().toLowerCase()

const buildVehicleLookup = (
  vehicles: any[],
): {
  byId: Map<string, ImportVehicle>
  byName: Map<string, ImportVehicle>
} => {
  const byId = new Map<string, ImportVehicle>()
  const byName = new Map<string, ImportVehicle>()

  for (const vehicle of vehicles) {
    const item: ImportVehicle = {
      id: String(vehicle.id),
      name: String(vehicle.name || ''),
      amount: typeof vehicle.amount === 'number' ? vehicle.amount : undefined,
    }

    byId.set(item.id, item)
    if (item.name) {
      byName.set(normalizeLookupKey(item.name), item)
    }
  }

  return { byId, byName }
}

const resolveVehicleForImport = (
  value: string,
  lookups: { byId: Map<string, ImportVehicle>; byName: Map<string, ImportVehicle> },
): ImportVehicle | undefined => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return undefined

  return lookups.byId.get(trimmed) || lookups.byName.get(normalizeLookupKey(trimmed))
}

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

    const headers = [
      'Weight Bill #',
      'Date',
      'Customer Name',
      'Vehicle',
      'Amount',
      'Payment Status',
    ]

    const rows = transformedDocs.map((bill: any) => [
      bill.weightBillNumber || '',
      formatDateForExport(bill.date),
      bill.customerName || '',
      bill.vehicle || '',
      bill.amount ?? '',
      bill.paymentStatus || '',
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Highlight unverified rows to match Google Sheet sync semantics.
    for (let rowIndex = 0; rowIndex < transformedDocs.length; rowIndex += 1) {
      const bill = transformedDocs[rowIndex]
      if (bill.isVerified !== false) continue

      const sheetRow = rowIndex + 2
      for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: sheetRow - 1, c: colIndex })
        if (!worksheet[cellRef]) {
          worksheet[cellRef] = { t: 's', v: '' }
        }

        ;(worksheet[cellRef] as any).s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'F28C8C' },
            bgColor: { rgb: 'F28C8C' },
          },
        }
      }
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WeightBills')
    const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer

    return {
      success: true,
      data: workbookBuffer.toString('base64'),
      filename: `weight-bills-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      isBase64: true,
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

export async function syncWeightBillsToGoogleSheet() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return {
        success: false,
        status: 'error' as const,
        message: 'Unauthorized',
      }
    }

    const payload = await getPayload({ config })
    return await updateGoogleSheetFromWeightBillsService(payload)
  } catch (error) {
    const payload = await getPayload({ config })
    payload.logger.error({ msg: 'Weight bill sync action failed unexpectedly.', err: error })

    return {
      success: false,
      status: 'error' as const,
      message: 'Failed to run Google Sheet sync.',
    }
  }
}

export type ImportRowComparison = {
  status: 'new' | 'changed' | 'unchanged'
  weightBillNumber: number
  new: {
    date: string
    customerName: string
    vehicle: string
    amount: number
    paymentStatus?: string
  }
  old?: {
    date: string
    customerName: string
    vehicle: string
    amount: number
    paymentStatus?: string
  }
  changes?: {
    field: string
    oldValue: string
    newValue: string
  }[]
}

export type ParseAndCompareImportResult =
  | {
      success: true
      rows: ImportRowComparison[]
      totalNew: number
      totalChanged: number
      totalUnchanged: number
      errors: string[]
    }
  | {
      success: false
      error: string
      requiredHeaders?: string[]
    }

export async function parseAndCompareImportedRows(
  formData: FormData,
): Promise<ParseAndCompareImportResult> {
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return {
      success: false,
      error: 'Please upload a CSV or XLSX file.',
      requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS],
    }
  }

  const fileName = file.name || 'spreadsheet'
  const lowerFileName = fileName.toLowerCase()

  if (
    !lowerFileName.endsWith('.csv') &&
    !lowerFileName.endsWith('.xlsx') &&
    !lowerFileName.endsWith('.xls')
  ) {
    return {
      success: false,
      error: 'Unsupported file type. Upload a .csv, .xlsx, or .xls file.',
      requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS],
    }
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS],
      }
    }

    const payload = await getPayload({ config })
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseWeightBillSpreadsheet(fileBuffer, fileName)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error,
        requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS],
      }
    }

    if (parsed.rows.length === 0) {
      return {
        success: true,
        rows: [],
        totalNew: 0,
        totalChanged: 0,
        totalUnchanged: 0,
        errors: parsed.rowErrors,
      }
    }

    // Fetch existing records and vehicles
    const uniqueNumbers = Array.from(new Set(parsed.rows.map((row) => row.weightBillNumber)))
    const existing = await payload.find({
      collection: 'weight-bills',
      where: {
        weightBillNumber: {
          in: uniqueNumbers,
        },
      },
      limit: uniqueNumbers.length || 1,
      depth: 0,
    })

    const vehicles = await payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
    })

    const vehicleLookup = buildVehicleLookup(vehicles.docs as any[])
    const existingByNumber = new Map<number, any>()
    const vehiclesById = new Map<string, string>()

    for (const vehicle of vehicles.docs as any[]) {
      vehiclesById.set(String(vehicle.id), vehicle.name || '')
    }

    for (const doc of existing.docs as any[]) {
      existingByNumber.set(doc.weightBillNumber, doc)
    }

    const rows: ImportRowComparison[] = []
    const errors: string[] = [...parsed.rowErrors]
    let totalNew = 0
    let totalChanged = 0
    let totalUnchanged = 0

    for (const row of parsed.rows) {
      const vehicle = resolveVehicleForImport(row.vehicle, vehicleLookup)
      if (!vehicle) {
        errors.push(`Row ${row.rowNumber}: vehicle "${row.vehicle}" was not found.`)
        continue
      }

      const newData = {
        date: row.date,
        customerName: row.customerName,
        vehicle: vehicle.name,
        amount: row.amount ?? vehicle.amount ?? 0,
        paymentStatus: row.paymentStatus,
      }

      const existingRecord = existingByNumber.get(row.weightBillNumber)

      if (!existingRecord) {
        totalNew += 1
        rows.push({
          status: 'new',
          weightBillNumber: row.weightBillNumber,
          new: newData,
        })
        continue
      }

      // Compare with existing record
      const oldData = {
        date: normalizeDateForComparison(existingRecord.date),
        customerName: existingRecord.customerName,
        vehicle: vehiclesById.get(String(existingRecord.vehicle)) || String(existingRecord.vehicle),
        amount: existingRecord.amount ?? 0,
        paymentStatus: existingRecord.paymentStatus,
      }

      const changes: { field: string; oldValue: string; newValue: string }[] = []

      if (oldData.date !== newData.date)
        changes.push({
          field: 'date',
          oldValue: oldData.date,
          newValue: newData.date,
        })
      if (oldData.customerName !== newData.customerName)
        changes.push({
          field: 'customerName',
          oldValue: oldData.customerName,
          newValue: newData.customerName,
        })
      if (oldData.vehicle !== newData.vehicle)
        changes.push({
          field: 'vehicle',
          oldValue: oldData.vehicle,
          newValue: newData.vehicle,
        })
      if (oldData.amount !== newData.amount)
        changes.push({
          field: 'amount',
          oldValue: String(oldData.amount),
          newValue: String(newData.amount),
        })
      if (oldData.paymentStatus !== newData.paymentStatus)
        changes.push({
          field: 'paymentStatus',
          oldValue: oldData.paymentStatus || '',
          newValue: newData.paymentStatus || '',
        })

      if (changes.length === 0) {
        totalUnchanged += 1
        rows.push({
          status: 'unchanged',
          weightBillNumber: row.weightBillNumber,
          new: newData,
          old: oldData,
          changes: [],
        })
      } else {
        totalChanged += 1
        rows.push({
          status: 'changed',
          weightBillNumber: row.weightBillNumber,
          new: newData,
          old: oldData,
          changes,
        })
      }
    }

    return {
      success: true,
      rows,
      totalNew,
      totalChanged,
      totalUnchanged,
      errors,
    }
  } catch (error) {
    const payload = await getPayload({ config })
    payload.logger.error({ msg: 'Parse and compare import failed.', err: error })

    return {
      success: false,
      error: 'Failed to parse and compare spreadsheet.',
      requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS],
    }
  }
}

export async function applyImportDecisions(data: {
  rows: ImportRowComparison[]
  decisions: Record<number, 'accepted' | 'rejected'>
}): Promise<{ success: boolean; createdCount: number; updatedCount: number; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        error: 'Unauthorized',
      }
    }

    const payload = await getPayload({ config })
    const currentUserId = String(session.user.id)
    let createdCount = 0
    let updatedCount = 0

    // Build vehicle lookup for resolving vehicle names to IDs
    const vehicles = await payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
    })
    const vehiclesByName = new Map<string, string>()
    for (const vehicle of vehicles.docs as any[]) {
      vehiclesByName.set((vehicle.name || '').toLowerCase().trim(), String(vehicle.id))
    }

    for (const row of data.rows) {
      const decision = data.decisions[row.weightBillNumber]
      if (decision !== 'accepted') continue

      const vehicleId = vehiclesByName.get(row.new.vehicle.toLowerCase().trim())
      if (!vehicleId) {
        payload.logger.warn({
          msg: `Vehicle "${row.new.vehicle}" not found for bill ${row.weightBillNumber}`,
        })
        continue
      }

      try {
        if (row.status === 'new') {
          await payload.create({
            collection: 'weight-bills',
            data: {
              weightBillNumber: row.weightBillNumber,
              date: row.new.date,
              customerName: row.new.customerName,
              vehicle: vehicleId,
              amount: row.new.amount,
              paymentStatus:
                (row.new.paymentStatus as 'PAID' | 'CANCELLED' | undefined) || undefined,
              isVerified: false,
              submittedBy: currentUserId,
            },
            depth: 0,
          })
          createdCount += 1
        } else if (row.status === 'changed') {
          // Find the existing record by weight bill number
          const existing = await payload.find({
            collection: 'weight-bills',
            where: {
              weightBillNumber: {
                equals: row.weightBillNumber,
              },
            },
            limit: 1,
            depth: 0,
          })

          if (existing.docs.length > 0) {
            const recordId = String(existing.docs[0].id)
            await payload.update({
              collection: 'weight-bills',
              id: recordId,
              data: {
                date: row.new.date,
                customerName: row.new.customerName,
                vehicle: vehicleId,
                amount: row.new.amount,
                paymentStatus:
                  (row.new.paymentStatus as 'PAID' | 'CANCELLED' | undefined) || undefined,
              },
              depth: 0,
            })
            updatedCount += 1
          }
        }
      } catch (error) {
        payload.logger.error({
          msg: `Failed to apply import decision for bill ${row.weightBillNumber}`,
          err: error,
        })
      }
    }

    return {
      success: true,
      createdCount,
      updatedCount,
    }
  } catch (error) {
    const payload = await getPayload({ config })
    payload.logger.error({ msg: 'Apply import decisions failed.', err: error })

    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      error: 'Failed to apply import decisions.',
    }
  }
}

export async function importWeightBillsFromSpreadsheet(formData: FormData) {
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return {
      success: false,
      status: 'error' as const,
      error: 'Please upload a CSV or XLSX file.',
      template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
    }
  }

  const fileName = file.name || 'spreadsheet'
  const lowerFileName = fileName.toLowerCase()

  if (
    !lowerFileName.endsWith('.csv') &&
    !lowerFileName.endsWith('.xlsx') &&
    !lowerFileName.endsWith('.xls')
  ) {
    return {
      success: false,
      status: 'error' as const,
      error: 'Unsupported file type. Upload a .csv, .xlsx, or .xls file.',
      template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
    }
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return {
        success: false,
        status: 'error' as const,
        error: 'Unauthorized',
        template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
      }
    }

    const payload = await getPayload({ config })
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseWeightBillSpreadsheet(fileBuffer, fileName)

    if (!parsed.success) {
      payload.logger.warn({
        msg: 'Weight bill import rejected due to invalid spreadsheet template.',
      })

      return {
        success: false,
        status: 'error' as const,
        error: parsed.error,
        template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
      }
    }

    const currentUserId = String(session.user.id)
    const existingNumbers = new Set<number>()
    const seenInFile = new Set<number>()
    const duplicateNumbers: number[] = []
    const invalidRows: string[] = [...parsed.rowErrors]
    const creationErrors: string[] = []
    let createdCount = 0

    if (parsed.rows.length === 0) {
      return {
        success: true,
        status: parsed.rowErrors.length > 0 ? ('partial' as const) : ('success' as const),
        message: 'No importable rows were found in the spreadsheet.',
        summary: {
          totalRows: 0,
          createdCount: 0,
          duplicateCount: 0,
          invalidRowCount: parsed.rowErrors.length,
          failedCreateCount: 0,
        },
        invalidRows: parsed.rowErrors,
        template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
      }
    }

    const uniqueNumbers = Array.from(new Set(parsed.rows.map((row) => row.weightBillNumber)))
    const existing = await payload.find({
      collection: 'weight-bills',
      where: {
        weightBillNumber: {
          in: uniqueNumbers,
        },
      },
      limit: uniqueNumbers.length || 1,
      depth: 0,
    })

    for (const doc of existing.docs as any[]) {
      const numberValue = Number(doc.weightBillNumber)
      if (Number.isFinite(numberValue)) {
        existingNumbers.add(numberValue)
      }
    }

    const vehicles = await payload.find({
      collection: 'vehicles',
      limit: 1000,
      depth: 0,
    })
    const vehicleLookup = buildVehicleLookup(vehicles.docs as any[])

    for (const row of parsed.rows) {
      if (seenInFile.has(row.weightBillNumber) || existingNumbers.has(row.weightBillNumber)) {
        duplicateNumbers.push(row.weightBillNumber)
        seenInFile.add(row.weightBillNumber)
        continue
      }

      seenInFile.add(row.weightBillNumber)

      const vehicle = resolveVehicleForImport(row.vehicle, vehicleLookup)
      if (!vehicle) {
        invalidRows.push(`Row ${row.rowNumber}: vehicle \"${row.vehicle}\" was not found.`)
        continue
      }

      try {
        await payload.create({
          collection: 'weight-bills',
          data: {
            weightBillNumber: row.weightBillNumber,
            date: row.date,
            customerName: row.customerName,
            vehicle: vehicle.id,
            amount: row.amount ?? vehicle.amount ?? 0,
            paymentStatus: row.paymentStatus,
            isVerified: row.isVerified,
            submittedBy: currentUserId,
            ...(row.isVerified ? { verifiedBy: currentUserId } : {}),
          },
          depth: 0,
        })

        createdCount += 1
      } catch (error) {
        creationErrors.push(`Row ${row.rowNumber}: failed to create weight bill.`)
        payload.logger.error({ msg: 'Weight bill row creation failed during import.', err: error })
      }
    }

    const hasIssues =
      duplicateNumbers.length > 0 || invalidRows.length > 0 || creationErrors.length > 0

    return {
      success: true,
      status: hasIssues ? ('partial' as const) : ('success' as const),
      message: hasIssues
        ? 'Spreadsheet import completed with skips or validation issues.'
        : 'Spreadsheet import completed successfully.',
      summary: {
        totalRows: parsed.rows.length,
        createdCount,
        duplicateCount: duplicateNumbers.length,
        invalidRowCount: invalidRows.length,
        failedCreateCount: creationErrors.length,
      },
      duplicateNumbers,
      invalidRows,
      creationErrors,
      template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
    }
  } catch (error) {
    const payload = await getPayload({ config })
    payload.logger.error({ msg: 'Weight bill spreadsheet import failed.', err: error })

    return {
      success: false,
      status: 'error' as const,
      error: 'Failed to import spreadsheet.',
      template: { requiredHeaders: [...REQUIRED_IMPORT_TEMPLATE_HEADERS] },
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
        collection: 'weight-bill-receipts',
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
          collection: 'weight-bill-receipts',
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
