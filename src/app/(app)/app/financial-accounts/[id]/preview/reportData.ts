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
  transactionDate: string
  createdAt: string
  updatedAt: string
  sourceBank: string
  destinationBank: string
  financialAccount: string
  status: string
  from: string
  to: string
  sender: string
  receiver: string
  amount: number | null
  fee: number | null
  type: string
  totalAmount: number | null
  currentBalance: number | null
  runningBalance: number | null
  description: string
  particulars: string
  isAllocatedFund?: boolean
  children?: TransactionReportTableRow[]
}

export type TransactionReportData = {
  header: TransactionReportHeaderData
  lineChartData: TransactionReportLinePoint[]
  barChartData: TransactionReportBarPoint[]
  rows: TransactionReportTableRow[]
}

type ReportRange = {
  fromDate?: string | null
  toDate?: string | null
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

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getTransactionImpact = (item: TransactionListItem): number => {
  if (item.transactionStatus !== 'completed') return 0

  const amount = toNumberOrZero(item.amount)
  const fee = Math.max(toNumberOrZero(item.transactionFee), 0)
  if (amount <= 0) return 0

  const total = amount + fee
  const type = normalizeType(item.transactionType)

  if (type === 'credit') return total
  if (type === 'debit') return -total
  return 0
}

const toBoundaryTimestamp = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
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
  allAccountParentTransactions?: TransactionListItem[]
  openingBalance?: number
  range?: ReportRange
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

  const parentTransactions = sortedTransactions.filter((item) => !item.parentTransaction)

  const fromTimestamp = toBoundaryTimestamp(args.range?.fromDate)
  const toTimestampBoundary = toBoundaryTimestamp(args.range?.toDate)
  const hasRangeFilter = fromTimestamp !== null || toTimestampBoundary !== null

  const runningBalanceByParentId = new Map<string, number | null>()

  if (hasRangeFilter) {
    const allAccountParents = sortTransactions(
      (args.allAccountParentTransactions || parentTransactions).filter(
        (item) => !item.parentTransaction,
      ),
    )

    const baseOpeningBalance =
      typeof args.openingBalance === 'number' && Number.isFinite(args.openingBalance)
        ? args.openingBalance
        : 0

    let openingBalance = baseOpeningBalance
    if (fromTimestamp !== null) {
      for (const item of allAccountParents) {
        const transactionTime = toBoundaryTimestamp(item.transactionDate)
        if (transactionTime === null || transactionTime >= fromTimestamp) continue
        openingBalance += getTransactionImpact(item)
      }
    }

    let runningBalance = openingBalance
    for (const item of parentTransactions) {
      if (item.transactionStatus === 'completed') {
        runningBalance += getTransactionImpact(item)
        runningBalanceByParentId.set(item.id, runningBalance)
      } else {
        runningBalanceByParentId.set(item.id, null)
      }
    }
  } else {
    for (const item of parentTransactions) {
      runningBalanceByParentId.set(
        item.id,
        typeof item.runningBalance === 'number' ? item.runningBalance : null,
      )
    }
  }

  const rows: TransactionReportTableRow[] = parentTransactions.map((item) => {
    const children = childrenByParentId.get(item.id) || []
    return {
      referenceNumber: normalizeString(item.referenceNumber),
      transactionDate: formatDate(item.transactionDate),
      createdAt: formatDate(item.createdAt),
      updatedAt: formatDate(item.updatedAt),
      sourceBank: normalizeString(item.sourceAccountName),
      destinationBank: normalizeString(item.destinationAccountName),
      financialAccount: normalizeString(item.financialAccountName),
      status: normalizeString(item.transactionStatus),
      from: normalizeString(item.from),
      to: normalizeString(item.to),
      sender: normalizeString(item.sender),
      receiver: normalizeString(item.receiver),
      amount: typeof item.amount === 'number' ? item.amount : null,
      fee: typeof item.transactionFee === 'number' ? item.transactionFee : null,
      type: normalizeType(item.transactionType),
      totalAmount:
        typeof item.amount === 'number' || typeof item.transactionFee === 'number'
          ? (typeof item.amount === 'number' ? item.amount : 0) +
            (typeof item.transactionFee === 'number' ? item.transactionFee : 0)
          : null,
      currentBalance: typeof item.currentBalance === 'number' ? item.currentBalance : null,
      runningBalance: runningBalanceByParentId.get(item.id) ?? null,
      description: normalizeString(item.description),
      particulars: normalizeString(item.particulars),
      isAllocatedFund: item.isAllocatedFund ?? false,
      children:
        children.length > 0
          ? children.map((child) => ({
              referenceNumber: normalizeString(child.referenceNumber),
              transactionDate: formatDate(child.transactionDate),
              createdAt: formatDate(child.createdAt),
              updatedAt: formatDate(child.updatedAt),
              sourceBank: normalizeString(child.sourceAccountName),
              destinationBank: normalizeString(child.destinationAccountName),
              financialAccount: normalizeString(child.financialAccountName),
              status: normalizeString(child.transactionStatus),
              from: normalizeString(child.from),
              to: normalizeString(child.to),
              sender: normalizeString(child.sender),
              receiver: normalizeString(child.receiver),
              amount: typeof child.amount === 'number' ? child.amount : null,
              fee: typeof child.transactionFee === 'number' ? child.transactionFee : null,
              type: normalizeType(child.transactionType),
              totalAmount:
                typeof child.amount === 'number' || typeof child.transactionFee === 'number'
                  ? (typeof child.amount === 'number' ? child.amount : 0) +
                    (typeof child.transactionFee === 'number' ? child.transactionFee : 0)
                  : null,
              currentBalance:
                typeof child.currentBalance === 'number' ? child.currentBalance : null,
              runningBalance:
                typeof child.runningBalance === 'number' ? child.runningBalance : null,
              description: normalizeString(child.description),
              particulars: normalizeString(child.particulars),
              isAllocatedFund: child.isAllocatedFund ?? false,
            }))
          : undefined,
    }
  })

  const barsByDate = new Map<string, { credit: number; debit: number }>()
  const lineByDate = new Map<string, number | null>()

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

    const computedBalance = runningBalanceByParentId.get(item.id)
    if (typeof computedBalance === 'number') {
      lineByDate.set(dateKey, computedBalance)
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
