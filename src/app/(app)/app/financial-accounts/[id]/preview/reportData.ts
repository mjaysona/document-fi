import type { TransactionListItem } from '../../../records/transactions/actions'

export type TransactionReportHeaderData = {
  title: string
  logoUrl?: string | null
  referenceNumber?: string | null
  date?: string | null
  fromDate?: string | null
  toDate?: string | null
}

export type TransactionReportLinePoint = {
  date: string
  runningBalance: number | null
}

export type TransactionReportBarPoint = {
  date: string
  credit: number
  debit: number
}

export type TransactionReportTableRow = {
  referenceNumber: string
  date: string
  sourceBank: string
  destinationBank: string
  type: string
  totalAmount: number | null
  runningBalance: number | null
  isFundAllocation?: boolean
  children?: TransactionReportTableRow[]
}

export type TransactionReportData = {
  header: TransactionReportHeaderData
  lineChartData: TransactionReportLinePoint[]
  barChartData: TransactionReportBarPoint[]
  rows: TransactionReportTableRow[]
}

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const toDateKey = (value?: string): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toTimestamp = (value?: string): number => {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY
  return parsed
}

const normalizeType = (value?: string): string => {
  const type = String(value || '')
    .toLowerCase()
    .trim()
  if (type === 'credit') return 'credit'
  if (type === 'debit') return 'debit'
  return '-'
}

const normalizeString = (value?: string): string => {
  const normalized = String(value || '').trim()
  return normalized || '-'
}

const sortTransactions = (transactions: TransactionListItem[]): TransactionListItem[] => {
  return [...transactions].sort((a, b) => {
    const byDate = toTimestamp(a.transactionDate) - toTimestamp(b.transactionDate)
    if (byDate !== 0) return byDate

    const byCreatedAt = toTimestamp(a.createdAt) - toTimestamp(b.createdAt)
    if (byCreatedAt !== 0) return byCreatedAt

    return a.id.localeCompare(b.id)
  })
}

export function buildTransactionReportData(args: {
  header: TransactionReportHeaderData
  transactions: TransactionListItem[]
}): TransactionReportData {
  const sortedTransactions = sortTransactions(args.transactions)
  const childrenByParentId = new Map<string, TransactionListItem[]>()

  // Group children by parent ID
  for (const item of sortedTransactions) {
    if (item.parentTransaction) {
      const parentId = item.parentTransaction
      if (!childrenByParentId.has(parentId)) {
        childrenByParentId.set(parentId, [])
      }
      childrenByParentId.get(parentId)!.push(item)
    }
  }

  const rows: TransactionReportTableRow[] = sortedTransactions
    .filter((item) => !item.parentTransaction) // Only include parent transactions
    .map((item) => {
      const children = childrenByParentId.get(item.id) || []
      return {
        referenceNumber: normalizeString(item.referenceNumber),
        date: formatDate(item.transactionDate),
        sourceBank: normalizeString(item.sourceAccountCode),
        destinationBank: normalizeString(item.destinationAccountCode),
        type: normalizeType(item.transactionType),
        totalAmount:
          typeof item.amount === 'number' || typeof item.transactionFee === 'number'
            ? (typeof item.amount === 'number' ? item.amount : 0) +
              (typeof item.transactionFee === 'number' ? item.transactionFee : 0)
            : null,
        runningBalance: typeof item.runningBalance === 'number' ? item.runningBalance : null,
        isFundAllocation: item.isFundAllocation ?? false,
        children:
          item.isFundAllocation && children.length > 0
            ? children.map((child) => ({
                referenceNumber: normalizeString(child.referenceNumber),
                date: formatDate(child.transactionDate),
                sourceBank: normalizeString(child.sourceAccountCode),
                destinationBank: normalizeString(child.destinationAccountCode),
                type: normalizeType(child.transactionType),
                totalAmount:
                  typeof child.amount === 'number' || typeof child.transactionFee === 'number'
                    ? (typeof child.amount === 'number' ? child.amount : 0) +
                      (typeof child.transactionFee === 'number' ? child.transactionFee : 0)
                    : null,
                runningBalance:
                  typeof child.runningBalance === 'number' ? child.runningBalance : null,
              }))
            : undefined,
      }
    })

  const barsByDate = new Map<string, { credit: number; debit: number }>()
  const lineByDate = new Map<string, number | null>()

  // Only include parent transactions in chart data
  const parentTransactions = sortedTransactions.filter((item) => !item.parentTransaction)

  for (const item of parentTransactions) {
    const dateKey = toDateKey(item.transactionDate)
    if (!dateKey) continue

    const bar = barsByDate.get(dateKey) ?? { credit: 0, debit: 0 }
    const amount = typeof item.amount === 'number' ? item.amount : 0
    const type = normalizeType(item.transactionType)

    if (type === 'credit') {
      bar.credit += amount
    } else if (type === 'debit') {
      bar.debit += amount
    }

    barsByDate.set(dateKey, bar)

    if (typeof item.runningBalance === 'number') {
      // Running balance policy: use stored values only, no computed fallback.
      lineByDate.set(dateKey, item.runningBalance)
    } else if (!lineByDate.has(dateKey)) {
      lineByDate.set(dateKey, null)
    }
  }

  const sortedKeys = Array.from(new Set([...barsByDate.keys(), ...lineByDate.keys()])).sort(
    (a, b) => a.localeCompare(b),
  )

  const barChartData: TransactionReportBarPoint[] = sortedKeys.map((date) => {
    const bar = barsByDate.get(date) ?? { credit: 0, debit: 0 }
    return {
      date,
      credit: bar.credit,
      debit: bar.debit,
    }
  })

  const lineChartData: TransactionReportLinePoint[] = sortedKeys.map((date) => ({
    date,
    runningBalance: lineByDate.get(date) ?? null,
  }))

  return {
    header: args.header,
    lineChartData,
    barChartData,
    rows,
  }
}
