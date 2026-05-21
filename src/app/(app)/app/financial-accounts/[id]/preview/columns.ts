export const TRANSACTION_REPORT_COLUMN_OPTIONS = [
  { value: 'referenceNumber', label: 'Reference #' },
  { value: 'transactionDate', label: 'Transaction Date' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
  { value: 'sourceBank', label: 'Source Bank' },
  { value: 'destinationBank', label: 'Destination Bank' },
  { value: 'fromWithSourceBank', label: 'From + Source Bank' },
  { value: 'toWithDestinationBank', label: 'To + Destination Bank' },
  { value: 'financialAccount', label: 'Financial Account' },
  { value: 'from', label: 'From' },
  { value: 'to', label: 'To' },
  { value: 'amount', label: 'Amount' },
  { value: 'fee', label: 'Fee' },
  { value: 'totalAmount', label: 'Total Amount' },
  { value: 'currentBalance', label: 'Current Balance' },
  { value: 'runningBalance', label: 'Running Balance' },
  { value: 'fundAllocation', label: 'Fund Allocation' },
  { value: 'allocatedFunds', label: 'Allocated Funds' },
  { value: 'description', label: 'Description' },
  { value: 'particulars', label: 'Particulars' },
] as const

export type TransactionReportColumnKey = (typeof TRANSACTION_REPORT_COLUMN_OPTIONS)[number]['value']

export const DEFAULT_TRANSACTION_REPORT_COLUMNS: TransactionReportColumnKey[] = [
  'referenceNumber',
  'transactionDate',
  'sourceBank',
  'destinationBank',
  'type',
  'totalAmount',
  'runningBalance',
]

const TRANSACTION_REPORT_COLUMN_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

export const parseReportColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return DEFAULT_TRANSACTION_REPORT_COLUMNS

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      TRANSACTION_REPORT_COLUMN_SET.has(item as TransactionReportColumnKey),
    )

  if (parsed.length === 0) return DEFAULT_TRANSACTION_REPORT_COLUMNS

  // Preserve order from options list for stable table headers.
  return TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value).filter((key) =>
    parsed.includes(key),
  )
}

export const serializeReportColumnKeys = (keys: string[]): string => {
  const valid = keys.filter((item): item is TransactionReportColumnKey =>
    TRANSACTION_REPORT_COLUMN_SET.has(item as TransactionReportColumnKey),
  )

  if (valid.length === 0) {
    return DEFAULT_TRANSACTION_REPORT_COLUMNS.join(',')
  }

  return TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value)
    .filter((value) => valid.includes(value))
    .join(',')
}
