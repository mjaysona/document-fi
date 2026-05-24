import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Stack, Group, ActionIcon, Title } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import { getFinancialAccountById } from '../../actions'
import {
  getTransactions,
  getUserTransactionPreviewTableColumnsConfig,
} from '../../../records/transactions/actions'
import { buildTransactionReportData } from './reportData'
import { PrintButton } from './PrintButton'
import { DateRangeFilter } from './DateRangeFilter'
import { ReportColumnsFilter } from './ReportColumnsFilter'
import {
  DEFAULT_TRANSACTION_REPORT_COLUMNS,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from './columns'
import styles from './page.module.scss'
import { TransactionReportDocument } from '@/app/(app)/app/financial-accounts/[id]/preview/components/TransactionReportDocument'

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
  searchParams: Promise<{ logoUrl?: string; from?: string; to?: string; cols?: string }>
}

const parseDateInput = (value?: string, mode: 'start' | 'end' = 'start'): Date | null => {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null

  const date = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  if (mode === 'end') {
    date.setHours(23, 59, 59, 999)
  }

  return date
}

const parseTransactionDate = (value?: string): Date | null => {
  const date = new Date(String(value || '').trim())
  if (Number.isNaN(date.getTime())) return null
  return date
}

export default async function FinancialAccountPreviewPage({ params, searchParams }: Props) {
  const { id } = await params
  const { logoUrl, from, to, cols } = await searchParams

  const [accountResult, transactionsResult, previewColumnsResult] = await Promise.all([
    getFinancialAccountById(id),
    getTransactions(),
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
  const allAccountParentTransactions = allTransactions.filter(
    (item) => item.financialAccountId === id && !item.parentTransaction,
  )

  let fromDate = parseDateInput(from, 'start')
  let toDate = parseDateInput(to, 'end')

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const hasDateRange = fromDate || toDate
  const accountTransactions = hasDateRange
    ? (() => {
        const parentTransactions = allTransactions
          .filter((item) => item.financialAccountId === id && !item.parentTransaction)
          .filter((item) => {
            const transactionDate = parseTransactionDate(item.transactionDate)
            if (!transactionDate) return false

            if (fromDate && transactionDate.getTime() < fromDate.getTime()) return false
            if (toDate && transactionDate.getTime() > toDate.getTime()) return false
            return true
          })

        const parentIds = new Set(parentTransactions.map((t) => t.id))

        // Include all child transactions of filtered parents
        const childTransactions = allTransactions.filter(
          (item) => item.parentTransaction && parentIds.has(item.parentTransaction),
        )

        return [...parentTransactions, ...childTransactions]
      })()
    : []

  const report = buildTransactionReportData({
    header: {
      title: account.name,
      logoUrl: logoUrl ?? null,
      referenceNumber: account.id,
      date: new Date().toISOString(),
      fromDate: fromDate?.toISOString() ?? null,
      toDate: toDate?.toISOString() ?? null,
    },
    transactions: accountTransactions,
    allAccountParentTransactions,
    openingBalance:
      typeof account.startingBalance === 'number'
        ? account.startingBalance
        : Number(account.startingBalance || 0),
    range: {
      fromDate: fromDate?.toISOString() ?? null,
      toDate: toDate?.toISOString() ?? null,
    },
  })

  return (
    <Stack>
      <Group className={styles.toolbar}>
        <Group gap="sm" align="center">
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
          <Title order={5}>Transaction Report for {account.name}</Title>
        </Group>

        <Group className={styles.toolbarRight}>
          <DateRangeFilter logoUrl={logoUrl} initialFrom={from} initialTo={to} />
          <PrintButton />
        </Group>
      </Group>
      <ReportColumnsFilter initialColumns={visibleColumns} />
      <div className={styles.printAreaWrapper}>
        <div className={styles.printArea}>
          <TransactionReportDocument report={report} visibleColumns={visibleColumns} />
        </div>
      </div>
    </Stack>
  )
}
