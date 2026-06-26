import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Stack, ActionIcon, Title, Flex } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import { getFinancialAccountById } from '../../actions'
import {
  getAllTransactionsForFinancialAccount,
  getUserTransactionPreviewTableColumnsConfig,
} from '../../../records/transactions/actions'
import { buildTransactionReportData } from './reportData'
import { PrintButton } from './PrintButton'
import { DateRangeFilter } from './DateRangeFilter'
import { ShareButton } from './ShareButton'
import { type TransactionTypeFilterValue } from '@/app/(app)/app/financial-accounts/[id]/preview/TransactionTypeFilter'
import {
  DEFAULT_TRANSACTION_REPORT_COLUMNS,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from './columns'
import { parseReportSections } from './reportSections'
import styles from './page.module.scss'
import { TransactionReportDocument } from '@/app/(app)/app/financial-accounts/[id]/preview/components/TransactionReportDocument'
import { PreviewControlPanels } from './PreviewControlPanels'

const REPORT_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const parseReportColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return DEFAULT_TRANSACTION_REPORT_COLUMNS

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      REPORT_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
    )

  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : DEFAULT_TRANSACTION_REPORT_COLUMNS
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    logoUrl?: string
    from?: string
    to?: string
    cols?: string
    sb?: string
    tt?: string
    sections?: string
  }>
}

const parseTransactionTypeFilter = (value?: string): TransactionTypeFilterValue => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized === 'debit') return 'debit'
  if (normalized === 'credit') return 'credit'
  return 'all'
}

const parseDateInput = (value?: string, mode: 'start' | 'end' = 'start'): Date | null => {
  const normalized = String(value || '').trim()
  if (!normalized) return null

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
  const date = isDateOnly ? new Date(`${normalized}T00:00:00`) : new Date(normalized)
  if (Number.isNaN(date.getTime())) return null

  if (mode === 'end' && isDateOnly) {
    date.setHours(23, 59, 59, 999)
  }

  return date
}

const parseTransactionDate = (value?: string): Date | null => {
  const date = new Date(String(value || '').trim())
  if (Number.isNaN(date.getTime())) return null
  return date
}

const parseOptionalNumberInput = (value?: string): number | null => {
  const normalized = String(value || '').trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const toLocalDateOnly = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function FinancialAccountPreviewPage({ params, searchParams }: Props) {
  const { id } = await params
  const { logoUrl, from, to, cols, sb, tt, sections } = await searchParams

  const [accountResult, transactionsResult, previewColumnsResult] = await Promise.all([
    getFinancialAccountById(id),
    getAllTransactionsForFinancialAccount(id),
    getUserTransactionPreviewTableColumnsConfig(),
  ])

  const normalizedColsParam = String(cols || '').trim()
  const visibleColumns = normalizedColsParam
    ? parseReportColumnKeys(normalizedColsParam)
    : parseReportColumnKeys(previewColumnsResult.columns?.join(','))

  if (!accountResult.success || !accountResult.data) {
    redirect('/app/financial-accounts')
  }

  const account = accountResult.data
  const allTransactions = transactionsResult.success ? transactionsResult.data : []

  let fromDate = parseDateInput(from, 'start')
  let toDate = parseDateInput(to, 'end')
  const customStartingBalance = parseOptionalNumberInput(sb)
  const hasCustomStartingBalance = customStartingBalance !== null
  const transactionTypeFilter = parseTransactionTypeFilter(tt)
  const visibleReportSections = parseReportSections(sections)

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const hasDateRange = fromDate || toDate
  const accountTransactions = hasDateRange
    ? allTransactions.filter((item) => {
        const transactionDate = parseTransactionDate(item.transactionDate)
        if (!transactionDate) return false

        if (fromDate && transactionDate.getTime() < fromDate.getTime()) return false
        if (toDate && transactionDate.getTime() > toDate.getTime()) return false
        return true
      })
    : []

  const report = buildTransactionReportData({
    header: {
      title: account.name,
      logoUrl: account.primaryLogoUrl ?? null,
      referenceNumber: account.id,
      date: new Date().toISOString(),
      fromDate: fromDate ? toLocalDateOnly(fromDate) : null,
      toDate: toDate ? toLocalDateOnly(toDate) : null,
    },
    transactions: accountTransactions,
    allAccountTransactions: allTransactions,
    openingBalance: hasCustomStartingBalance
      ? customStartingBalance
      : typeof account.startingBalance === 'number'
        ? account.startingBalance
        : Number(account.startingBalance || 0),
    useCustomRangeOpeningBalance: hasCustomStartingBalance,
    range: {
      fromDate: fromDate?.toISOString() ?? null,
      toDate: toDate?.toISOString() ?? null,
    },
  })

  return (
    <Stack>
      <Flex gap="sm" justify="space-between" wrap={{ base: 'wrap', md: 'nowrap' }} align="start">
        <Flex gap="sm" align="start" wrap="nowrap">
          <Link href={`/app/financial-accounts/${account.id}`}>
            <ActionIcon
              variant="default"
              size="lg"
              radius="sm"
              aria-label="Back"
              style={{ flexShrink: 0 }}
            >
              <ArrowLeft size={16} />
            </ActionIcon>
          </Link>
          <Flex mih={32} align="center" gap="xs" wrap="nowrap">
            <Title order={5}>Transaction Report for {account.name}</Title>
          </Flex>
        </Flex>
        <Flex
          w={{ base: '100%', md: 'auto' }}
          gap="sm"
          justify="flex-end"
          style={{ flexShrink: 0 }}
        >
          <DateRangeFilter logoUrl={logoUrl} initialFrom={from} initialTo={to} />
          <PrintButton />
          <ShareButton />
        </Flex>
      </Flex>
      <PreviewControlPanels
        initialStartingBalance={sb}
        initialTransactionType={transactionTypeFilter}
        initialSections={visibleReportSections}
        initialColumns={visibleColumns}
      />
      <div className={styles['print-area__wrapper']}>
        <div className={styles['print-area']}>
          <TransactionReportDocument
            report={report}
            visibleColumns={visibleColumns}
            transactionTypeFilter={transactionTypeFilter}
            visibleReportSections={visibleReportSections}
          />
        </div>
      </div>
    </Stack>
  )
}
