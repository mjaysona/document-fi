export const TRANSACTION_REPORT_COLUMN_OPTIONS = [
  { value: 'referenceNumber', label: 'Reference #' },
  { value: 'transactionDate', label: 'Transaction Date' },
  { value: 'transactionType', label: 'Type' },
  { value: 'transactionStatus', label: 'Status' },
  { value: 'sourceAccount', label: 'Source Bank' },
  { value: 'destinationAccount', label: 'Destination Bank' },
  { value: 'financialAccount', label: 'Financial Account' },
  { value: 'transactionPurpose', label: 'Transaction Purpose' },
  { value: 'from', label: 'From' },
  { value: 'to', label: 'To' },
  { value: 'sender', label: 'Sender' },
  { value: 'receiver', label: 'Receiver' },
  { value: 'amount', label: 'Amount' },
  { value: 'transactionFee', label: 'Fee' },
  { value: 'totalAmount', label: 'Total Amount' },
  { value: 'currentBalance', label: 'Current Balance' },
  { value: 'runningBalance', label: 'Running Balance' },
  { value: 'isAllocatedFund', label: 'Allocated Fund' },
  { value: 'isForAllocation', label: 'For Allocation' },
  { value: 'allocatedFunds', label: 'Allocated Funds' },
  { value: 'description', label: 'Description' },
  { value: 'particulars', label: 'Particulars' },
  { value: 'receiptImage', label: 'Receipt Image' },
  { value: 'lastUpdated', label: 'Last Updated' },
] as const

export type TransactionReportColumnKey = (typeof TRANSACTION_REPORT_COLUMN_OPTIONS)[number]['value']

export const DEFAULT_TRANSACTION_REPORT_COLUMNS: TransactionReportColumnKey[] = [
  'referenceNumber',
  'transactionDate',
  'sourceAccount',
  'destinationAccount',
  'transactionType',
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
