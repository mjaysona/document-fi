import * as XLSX from 'xlsx'

export const REQUIRED_IMPORT_TEMPLATE_HEADERS = [
  'Date',
  'Customer',
  'Weight Bill #',
  'Vehicle',
] as const

export const OPTIONAL_IMPORT_TEMPLATE_HEADERS = ['Amount', 'Remarks'] as const

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date'],
  customerName: ['customer', 'customer name'],
  weightBillNumber: ['weight bill #', 'bill #', 'weight bill number', 'weightbillnumber'],
  vehicle: ['vehicle'],
  amount: ['amount'],
  paymentStatus: ['payment status', 'status'],
  isVerified: ['verified', 'is verified'],
  remarks: ['remarks', 'remark'],
}

export type ParsedSpreadsheetWeightBill = {
  rowNumber: number
  weightBillNumber: number
  date: string | undefined
  customerName: string
  vehicle: string
  amount?: number
  paymentStatus?: 'PAID' | 'CANCELLED'
  isVerified: boolean
}

export type SpreadsheetImportParseResult =
  | {
      success: true
      rows: ParsedSpreadsheetWeightBill[]
      rowErrors: string[]
      normalizedHeaders: string[]
    }
  | {
      success: false
      error: string
      normalizedHeaders: string[]
    }

const normalizeHeader = (value: unknown): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const trimmed = String(value || '').trim()
  if (!trimmed) return undefined

  const normalized = trimmed.replace(/,/g, '').replace(/[^0-9.-]/g, '')
  if (!normalized) return undefined

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return undefined

  return parsed
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDate = (value: unknown): string | undefined => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return formatLocalDate(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsedCode = XLSX.SSF.parse_date_code(value)
    if (!parsedCode) return undefined

    const month = String(parsedCode.m).padStart(2, '0')
    const day = String(parsedCode.d).padStart(2, '0')
    return `${parsedCode.y}-${month}-${day}`
  }

  const trimmed = String(value || '').trim()
  if (!trimmed) return undefined

  const mmddyyyyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/)
  if (mmddyyyyMatch) {
    const [, monthRaw, dayRaw, yearRaw] = mmddyyyyMatch
    const month = Number(monthRaw)
    const day = Number(dayRaw)
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw)

    const parsed = new Date(year, month - 1, day)
    if (
      Number.isFinite(parsed.getTime()) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return formatLocalDate(parsed)
    }
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed)
    if (Number.isFinite(serial)) {
      const parsedCode = XLSX.SSF.parse_date_code(serial)
      if (parsedCode) {
        const month = String(parsedCode.m).padStart(2, '0')
        const day = String(parsedCode.d).padStart(2, '0')
        return `${parsedCode.y}-${month}-${day}`
      }
    }
  }

  const parsed = new Date(trimmed)
  if (!Number.isFinite(parsed.getTime())) {
    return undefined
  }

  return formatLocalDate(parsed)
}

const parsePaymentStatus = (value: unknown): 'PAID' | undefined => {
  const trimmed = String(value || '')
    .trim()
    .toUpperCase()
  if (!trimmed) return undefined

  if (trimmed === 'PAID') return 'PAID'

  return undefined
}

const parseVerified = (value: unknown): boolean => {
  const trimmed = String(value || '')
    .trim()
    .toLowerCase()

  if (!trimmed) return false

  return (
    trimmed === 'true' ||
    trimmed === 'yes' ||
    trimmed === 'y' ||
    trimmed === '1' ||
    trimmed === 'verified'
  )
}

const buildHeaderIndexMap = (headers: string[]): Record<string, number> | null => {
  const normalizedAliasesByKey = Object.entries(HEADER_ALIASES).reduce<Record<string, string[]>>(
    (acc, [key, aliases]) => {
      acc[key] = aliases.map((alias) => normalizeHeader(alias))
      return acc
    },
    {},
  )

  const headerIndexMap: Record<string, number> = {}

  for (const [canonicalKey, aliases] of Object.entries(normalizedAliasesByKey)) {
    const index = headers.findIndex((header) => aliases.includes(header))
    if (index >= 0) {
      headerIndexMap[canonicalKey] = index
    }
  }

  const missingRequired = ['weightBillNumber', 'date', 'customerName', 'vehicle'].filter(
    (required) => headerIndexMap[required] === undefined,
  )

  if (missingRequired.length > 0) {
    return null
  }

  return headerIndexMap
}

export const parseWeightBillSpreadsheet = (
  fileBuffer: Buffer,
  fileName: string,
): SpreadsheetImportParseResult => {
  const headerRowIndex = 3

  let workbook: XLSX.WorkBook

  try {
    workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    })
  } catch {
    return {
      success: false,
      error: 'Unable to parse the spreadsheet file. Please upload a valid CSV or XLSX file.',
      normalizedHeaders: [],
    }
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return {
      success: false,
      error: 'The spreadsheet is empty. Please upload a file with header and data rows.',
      normalizedHeaders: [],
    }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  const headerRow = (grid[headerRowIndex] || []).map((cell) => String(cell || '').trim())
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header))

  if (normalizedHeaders.length === 0 || normalizedHeaders.every((header) => !header)) {
    return {
      success: false,
      error: 'Missing header row. Use the import template headers before uploading.',
      normalizedHeaders,
    }
  }

  const headerIndexMap = buildHeaderIndexMap(normalizedHeaders)
  if (!headerIndexMap) {
    return {
      success: false,
      error: `Invalid template headers in ${fileName}. Required headers: ${REQUIRED_IMPORT_TEMPLATE_HEADERS.join(', ')}`,
      normalizedHeaders,
    }
  }

  const rows: ParsedSpreadsheetWeightBill[] = []
  const rowErrors: string[] = []

  for (let rowIndex = headerRowIndex + 1; rowIndex < grid.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1
    const cells = grid[rowIndex] || []

    const hasAnyValue = cells.some((cell) => String(cell || '').trim().length > 0)
    if (!hasAnyValue) continue

    const weightBillNumberRaw = cells[headerIndexMap.weightBillNumber]
    const dateRaw = cells[headerIndexMap.date]
    const customerNameRaw = cells[headerIndexMap.customerName]
    const vehicleRaw = cells[headerIndexMap.vehicle]
    const amountRaw = headerIndexMap.amount !== undefined ? cells[headerIndexMap.amount] : undefined
    const remarksRaw =
      headerIndexMap.remarks !== undefined ? cells[headerIndexMap.remarks] : undefined
    const isVerifiedRaw =
      headerIndexMap.isVerified !== undefined ? cells[headerIndexMap.isVerified] : undefined

    const weightBillNumber = parseNumber(weightBillNumberRaw)
    const date = parseDate(dateRaw)
    const customerName = String(customerNameRaw || '').trim()
    const vehicle = String(vehicleRaw || '').trim()
    const amount = parseNumber(amountRaw)
    const remarks = String(remarksRaw || '').trim()
    const paymentStatusFromRemarks = parsePaymentStatus(remarks)
    const isCancelledCustomer = customerName.toUpperCase() === 'CANCELLED'
    const paymentStatus: 'PAID' | 'CANCELLED' | undefined = paymentStatusFromRemarks
      ? 'PAID'
      : !remarks && isCancelledCustomer
        ? 'CANCELLED'
        : undefined
    const normalizedCustomerName = paymentStatus === 'CANCELLED' ? '' : customerName
    const isVerified = parseVerified(isVerifiedRaw)

    if (!weightBillNumber || weightBillNumber <= 0) {
      rowErrors.push(`Row ${rowNumber}: invalid Weight Bill #.`)
      continue
    }

    if (remarks && !paymentStatusFromRemarks) {
      rowErrors.push(`Row ${rowNumber}: Remarks must be PAID or empty.`)
      continue
    }

    rows.push({
      rowNumber,
      weightBillNumber,
      date,
      customerName: normalizedCustomerName,
      vehicle,
      amount,
      paymentStatus,
      isVerified,
    })
  }

  const latestRowsByWeightBillNumber = new Map<number, ParsedSpreadsheetWeightBill>()
  const duplicateWeightBillNumbers = new Set<number>()

  for (const row of rows) {
    if (latestRowsByWeightBillNumber.has(row.weightBillNumber)) {
      duplicateWeightBillNumbers.add(row.weightBillNumber)
    }
    // Keep the latest occurrence in the file.
    latestRowsByWeightBillNumber.set(row.weightBillNumber, row)
  }

  const deduplicatedRows = Array.from(latestRowsByWeightBillNumber.values()).sort(
    (a, b) => a.rowNumber - b.rowNumber,
  )

  if (duplicateWeightBillNumbers.size > 0) {
    const duplicateList = Array.from(duplicateWeightBillNumbers)
      .sort((a, b) => a - b)
      .join(', ')
    rowErrors.push(`Duplicate Weight Bill # found and removed (kept latest row): ${duplicateList}.`)
  }

  return {
    success: true,
    rows: deduplicatedRows,
    rowErrors,
    normalizedHeaders,
  }
}
