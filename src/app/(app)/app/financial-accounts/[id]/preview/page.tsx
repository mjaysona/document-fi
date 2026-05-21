import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button, Stack, Group, ActionIcon, TextInput } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import { getFinancialAccountById } from '../../actions'
import { getTransactions } from '../../../records/transactions/actions'
import { buildTransactionReportData } from './reportData'
import { PrintButton } from './PrintButton'
import styles from './page.module.scss'
import { TransactionReportDocument } from '@/app/(app)/app/financial-accounts/[id]/preview/components/TransactionReportDocument'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ logoUrl?: string; from?: string; to?: string }>
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
  const { logoUrl, from, to } = await searchParams

  const [accountResult, transactionsResult] = await Promise.all([
    getFinancialAccountById(id),
    getTransactions(),
  ])

  if (!accountResult.success || !accountResult.data) {
    redirect('/app/financial-accounts')
  }

  const account = accountResult.data
  const allTransactions = transactionsResult.success ? transactionsResult.data : []

  let fromDate = parseDateInput(from, 'start')
  let toDate = parseDateInput(to, 'end')

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const accountTransactions = allTransactions
    .filter((item) => item.financialAccountId === id)
    .filter((item) => {
      if (!fromDate && !toDate) return true

      const transactionDate = parseTransactionDate(item.transactionDate)
      if (!transactionDate) return false

      if (fromDate && transactionDate.getTime() < fromDate.getTime()) return false
      if (toDate && transactionDate.getTime() > toDate.getTime()) return false
      return true
    })

  const queryWithoutDate = new URLSearchParams()
  if (logoUrl) queryWithoutDate.set('logoUrl', logoUrl)

  const clearDateHref = queryWithoutDate.toString()
    ? `/app/financial-accounts/${account.id}/preview?${queryWithoutDate.toString()}`
    : `/app/financial-accounts/${account.id}/preview`

  const report = buildTransactionReportData({
    header: {
      title: account.name,
      logoUrl: logoUrl ?? null,
      referenceNumber: account.id,
      date: new Date().toISOString(),
    },
    transactions: accountTransactions,
  })

  return (
    <Stack>
      <Group className={styles.toolbar}>
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

        <Group className={styles.toolbarRight}>
          <form method="get">
            {logoUrl ? <input type="hidden" name="logoUrl" value={logoUrl} /> : null}
            <Group align="end" gap="xs" wrap="nowrap">
              <TextInput type="date" name="from" label="From" defaultValue={from || ''} size="sm" />
              <TextInput type="date" name="to" label="To" defaultValue={to || ''} size="sm" />
              <Button type="submit" variant="default" size="sm">
                Apply
              </Button>
            </Group>
          </form>

          <Link href={clearDateHref}>
            <Button variant="subtle" size="sm">
              Clear date
            </Button>
          </Link>
          <PrintButton />
        </Group>
      </Group>

      <div className={styles.printAreaWrapper}>
        <div className={styles.printArea}>
          <TransactionReportDocument report={report} />
        </div>
      </div>
    </Stack>
  )
}
