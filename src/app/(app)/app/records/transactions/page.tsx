'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { CircleCheck, Filter, Plus, Search } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/(app)/components/ui/DataTable'
import { deleteTransaction, getTransactions, type TransactionListItem } from './actions'
import classes from '../page.module.scss'

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
}

type SortBy = 'date' | 'amount'
type SortOrder = 'asc' | 'desc'

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCurrency = (value?: number): string => {
  if (typeof value !== 'number') return '-'
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const toTimestamp = (value?: string): number | null => {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export default function TransactionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<TransactionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterFinancialAccounts, setFilterFinancialAccounts] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const [filterSourceAccounts, setFilterSourceAccounts] = useState<string[]>([])
  const [filterDestinationAccounts, setFilterDestinationAccounts] = useState<string[]>([])
  const [filterDateRange, setFilterDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const load = async () => {
    setIsLoading(true)
    const result = await getTransactions()
    if (result.success) {
      setItems(result.data)
    } else {
      setFeedback({ tone: 'error', message: result.error ?? 'Failed to load transactions.' })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const financialAccountOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.financialAccountName)
            .filter((name): name is string => Boolean(name)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [items],
  )

  const sourceAccountOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.sourceAccountName)
            .filter((name): name is string => Boolean(name)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [items],
  )

  const destinationAccountOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.destinationAccountName)
            .filter((name): name is string => Boolean(name)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [items],
  )

  const activeFilterCount =
    filterFinancialAccounts.length +
    filterTypes.length +
    filterStatuses.length +
    filterSourceAccounts.length +
    filterDestinationAccounts.length +
    (filterDateRange[0] || filterDateRange[1] ? 1 : 0)

  const displayed = useMemo(() => {
    const query = search.toLowerCase().trim()
    const filtered = items.filter((item) => {
      if (filterFinancialAccounts.length > 0) {
        if (
          !item.financialAccountName ||
          !filterFinancialAccounts.includes(item.financialAccountName)
        ) {
          return false
        }
      }

      if (filterTypes.length > 0) {
        if (!item.transactionType || !filterTypes.includes(item.transactionType)) {
          return false
        }
      }

      if (filterStatuses.length > 0) {
        if (!item.transactionStatus || !filterStatuses.includes(item.transactionStatus)) {
          return false
        }
      }

      if (filterSourceAccounts.length > 0) {
        if (!item.sourceAccountName || !filterSourceAccounts.includes(item.sourceAccountName)) {
          return false
        }
      }

      if (filterDestinationAccounts.length > 0) {
        if (
          !item.destinationAccountName ||
          !filterDestinationAccounts.includes(item.destinationAccountName)
        ) {
          return false
        }
      }

      const [startDateValue, endDateValue] = filterDateRange
      if (startDateValue || endDateValue) {
        const itemTs = toTimestamp(item.transactionDate)
        if (itemTs === null) return false

        if (startDateValue) {
          const startTs = new Date(startDateValue)
          startTs.setHours(0, 0, 0, 0)
          if (itemTs < startTs.getTime()) return false
        }

        if (endDateValue) {
          const endTs = new Date(endDateValue)
          endTs.setHours(23, 59, 59, 999)
          if (itemTs > endTs.getTime()) return false
        }
      }

      if (!query) return true

      return (
        item.description.toLowerCase().includes(query) ||
        (item.financialAccountName ?? '').toLowerCase().includes(query) ||
        (item.sourceAccountName ?? '').toLowerCase().includes(query) ||
        (item.destinationAccountName ?? '').toLowerCase().includes(query) ||
        (item.transactionType ?? '').toLowerCase().includes(query) ||
        (item.transactionStatus ?? '').toLowerCase().includes(query)
      )
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'amount') {
        const aVal = typeof a.amount === 'number' ? a.amount : -Infinity
        const bVal = typeof b.amount === 'number' ? b.amount : -Infinity
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortOrder === 'asc' ? cmp : -cmp
      }

      const aTs = a.transactionDate ? new Date(a.transactionDate).getTime() : -Infinity
      const bTs = b.transactionDate ? new Date(b.transactionDate).getTime() : -Infinity
      const cmp = aTs < bTs ? -1 : aTs > bTs ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [
    filterDateRange,
    filterDestinationAccounts,
    filterFinancialAccounts,
    filterSourceAccounts,
    filterStatuses,
    filterTypes,
    items,
    search,
    sortBy,
    sortOrder,
  ])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(field)
    setSortOrder('desc')
  }

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? displayed.map((item) => item.id) : [])
  }

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((itemId) => itemId !== id),
    )
  }

  const handleDeleteConfirm = async () => {
    if (deleteTargetIds.length === 0) return

    const targetIds = [...deleteTargetIds]
    const isBulk = targetIds.length > 1

    if (isBulk) {
      setIsBulkDeleting(true)
    } else {
      setDeletingId(targetIds[0])
    }

    setDeleteConfirmOpen(false)

    const results = await Promise.all(targetIds.map((id) => deleteTransaction(id)))
    const failed = results.find((result) => !result.success)

    if (!failed) {
      setItems((prev) => prev.filter((item) => !targetIds.includes(item.id)))
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)))
      setFeedback({
        tone: 'success',
        message:
          targetIds.length === 1
            ? 'Transaction deleted.'
            : `${targetIds.length} transaction(s) deleted.`,
      })
    } else {
      setFeedback({ tone: 'error', message: failed.error ?? 'Failed to delete transaction(s).' })
    }

    setDeletingId(null)
    setIsBulkDeleting(false)
    setDeleteTargetIds([])
  }

  const columns: DataTableColumn<TransactionListItem>[] = [
    {
      key: 'transactionDate',
      label: 'Date',
      render: (row) => (
        <span
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => router.push(`/app/records/transactions/${row.id}/edit`)}
        >
          {formatDate(row.transactionDate)}
        </span>
      ),
    },
    {
      key: 'financialAccountName',
      label: 'Financial Account',
      render: (row) => row.financialAccountName || '-',
    },
    {
      key: 'sourceDestination',
      label: 'Source to Destination',
      render: (row) => {
        const source = row.sourceAccountName || '-'
        const destination = row.destinationAccountName || '-'
        if (source === '-' && destination === '-') return '-'
        return `${source} to ${destination}`
      },
    },
    {
      key: 'transactionType',
      label: 'Type',
      render: (row) => {
        if (!row.transactionType) return '-'
        return (
          <Badge
            color={row.transactionType === 'debit' ? 'blue' : 'grape'}
            variant="light"
            tt="capitalize"
          >
            {row.transactionType}
          </Badge>
        )
      },
    },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'transactionFee', label: 'Fee', render: (row) => formatCurrency(row.transactionFee) },
    {
      key: 'runningBalance',
      label: 'Running Balance',
      render: (row) => formatCurrency(row.runningBalance),
    },
    {
      key: 'transactionStatus',
      label: 'Status',
      render: (row) => (
        <Badge
          color={row.transactionStatus === 'failed' ? 'red' : 'teal'}
          variant="light"
          tt="capitalize"
        >
          {row.transactionStatus || '-'}
        </Badge>
      ),
    },
  ]

  const singleDeleteLoading =
    deleteTargetIds.length === 1 && deletingId === deleteTargetIds[0] && !isBulkDeleting

  const deleteLabel =
    deleteTargetIds.length <= 1
      ? 'Delete this transaction? This cannot be undone.'
      : `Delete ${deleteTargetIds.length} selected transaction(s)? This cannot be undone.`

  return (
    <div className={classes.wrapper}>
      <div style={{ marginBottom: 24 }}>
        <Group mb="md" gap="xs" align="center">
          <TextInput
            placeholder="Search by description, accounts, type, or status..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant={filterOpen || activeFilterCount > 0 ? 'filled' : 'default'}
            size={36}
            aria-label="Toggle filters"
            onClick={() => setFilterOpen((open) => !open)}
          >
            <Filter size={16} />
          </ActionIcon>
          <Button
            variant={sortBy === 'date' ? 'light' : 'default'}
            size="sm"
            onClick={() => toggleSort('date')}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'amount' ? 'light' : 'default'}
            size="sm"
            onClick={() => toggleSort('amount')}
          >
            Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </Group>

        <Collapse in={filterOpen}>
          <Stack
            gap="sm"
            mb="md"
            p="sm"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          >
            <Group grow gap="sm" align="flex-end">
              <MultiSelect
                label="Financial Account"
                placeholder="All financial accounts"
                data={financialAccountOptions}
                value={filterFinancialAccounts}
                onChange={setFilterFinancialAccounts}
                clearable
                searchable
              />
              <MultiSelect
                label="Type"
                placeholder="All types"
                data={[
                  { value: 'debit', label: 'Debit' },
                  { value: 'credit', label: 'Credit' },
                ]}
                value={filterTypes}
                onChange={setFilterTypes}
                clearable
              />
              <MultiSelect
                label="Status"
                placeholder="All statuses"
                data={[
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
                value={filterStatuses}
                onChange={setFilterStatuses}
                clearable
              />
            </Group>
            <Group grow gap="sm" align="flex-end">
              <MultiSelect
                label="Source Account"
                placeholder="All source accounts"
                data={sourceAccountOptions}
                value={filterSourceAccounts}
                onChange={setFilterSourceAccounts}
                clearable
                searchable
              />
              <MultiSelect
                label="Destination Account"
                placeholder="All destination accounts"
                data={destinationAccountOptions}
                value={filterDestinationAccounts}
                onChange={setFilterDestinationAccounts}
                clearable
                searchable
              />
              <DatePickerInput
                type="range"
                label="Date Range"
                placeholder="Pick date range"
                value={filterDateRange}
                onChange={setFilterDateRange}
                clearable
              />
            </Group>
            {activeFilterCount > 0 && (
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setFilterFinancialAccounts([])
                    setFilterTypes([])
                    setFilterStatuses([])
                    setFilterSourceAccounts([])
                    setFilterDestinationAccounts([])
                    setFilterDateRange([null, null])
                  }}
                >
                  Clear filters ({activeFilterCount})
                </Button>
              </Group>
            )}
          </Stack>
        </Collapse>
        <Group justify="space-between">
          <Button
            variant="light"
            color="red"
            size="sm"
            disabled={selectedIds.length === 0}
            loading={isBulkDeleting}
            onClick={() => {
              if (selectedIds.length === 0) return
              setDeleteTargetIds(selectedIds)
              setDeleteConfirmOpen(true)
            }}
          >
            Delete selected ({selectedIds.length})
          </Button>
          <Button
            variant="filled"
            size="sm"
            leftSection={<Plus size={14} />}
            onClick={() => router.push('/app/records/transactions/add')}
          >
            New
          </Button>
        </Group>

        {feedback && (
          <Alert
            mt="sm"
            variant="light"
            icon={<CircleCheck size={16} />}
            withCloseButton
            onClose={() => setFeedback(null)}
            color={feedback.tone === 'success' ? 'green' : 'red'}
          >
            {feedback.message}
          </Alert>
        )}
      </div>

      <DataTable
        columns={columns}
        data={displayed}
        isLoading={isLoading}
        loadingText="Loading transactions..."
        emptyText="No transactions found."
        selectedIds={selectedIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectRow={handleToggleSelectRow}
      />

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeleteTargetIds([])
        }}
        title="Confirm deletion"
        centered
      >
        <Text size="sm" mb="lg">
          {deleteLabel}
        </Text>
        <Group justify="end" gap="sm">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeleteTargetIds([])
            }}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteConfirm}
            loading={isBulkDeleting || singleDeleteLoading}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
