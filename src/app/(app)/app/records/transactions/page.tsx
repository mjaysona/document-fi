'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Flex,
  Group,
  MultiSelect,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { CircleCheck, Filter, Plus, Search } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/(app)/components/ui/DataTable'
import { getTransactions, type TransactionListItem } from './actions'
import {
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from '../../financial-accounts/[id]/preview/columns'
import classes from '../page.module.scss'
import { useAuth } from '@/app/providers/Auth'
import { hasAppRoleReadAccess } from '@/app/(app)/utils/roleAccess'

const TABLE_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const parseTableColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return []

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      TABLE_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
    )

  return Array.from(new Set(parsed))
}

const serializeTableColumnKeys = (keys: string[]): string => {
  const valid = keys.filter((item): item is TransactionReportColumnKey =>
    TABLE_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
  )

  return Array.from(new Set(valid)).join(',')
}

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
}

type SortBy = 'date' | 'amount'
type SortOrder = 'asc' | 'desc'
type TransactionParentRow = { parent: TransactionListItem; children: TransactionListItem[] }

const DEFAULT_TABLE_COLUMNS: TransactionReportColumnKey[] = [
  'referenceNumber',
  'transactionDate',
  'sourceBank',
  'destinationBank',
  'currentBalance',
  'type',
  'totalAmount',
  'runningBalance',
  'status',
]

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

const formatTotalAmount = (amount?: number, fee?: number): string => {
  const hasAmount = typeof amount === 'number'
  const hasFee = typeof fee === 'number'
  if (!hasAmount && !hasFee) return '-'

  const total = (hasAmount ? amount : 0) + (hasFee ? fee : 0)
  return formatCurrency(total)
}

const toTimestamp = (value?: string): number | null => {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  // Only allow users with an app role that has read access to transactions
  const hasReadAccess = hasAppRoleReadAccess(user?.userRoles, 'transactions')

  // Redirect on client if no access, but do not call router.replace during render
  useEffect(() => {
    if (!hasReadAccess) {
      router.replace('/app/no-access')
    }
  }, [hasReadAccess, router])
  if (!hasReadAccess) return null
  const searchParams = useSearchParams()
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
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [draggingColumnKey, setDraggingColumnKey] = useState<TransactionReportColumnKey | null>(
    null,
  )
  const hasAppliedInitialQueryFilters = useRef(false)
  const tableColsParam = searchParams.get('tableCols')
  const [selectedTableColumns, setSelectedTableColumns] = useState<TransactionReportColumnKey[]>(
    parseTableColumnKeys(tableColsParam),
  )

  const initialFinancialAccountFilter = useMemo(
    () => searchParams.get('financialAccount')?.trim() || '',
    [searchParams],
  )

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

  useEffect(() => {
    if (hasAppliedInitialQueryFilters.current) return
    hasAppliedInitialQueryFilters.current = true

    if (!initialFinancialAccountFilter) return

    setFilterFinancialAccounts([initialFinancialAccountFilter])
  }, [initialFinancialAccountFilter])

  const pushTableColumnsToUrl = (nextColumns: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tableCols', serializeTableColumnKeys(nextColumns))

    const query = params.toString()
    router.push(query ? `/app/records/transactions?${query}` : '/app/records/transactions')
  }

  const handleTableColumnsChange = (nextColumns: string[]) => {
    const parsed = parseTableColumnKeys(nextColumns.join(','))
    setSelectedTableColumns(parsed)
    pushTableColumnsToUrl(parsed)
  }

  const reorderSelectedColumns = (
    draggedKey: TransactionReportColumnKey,
    targetKey: TransactionReportColumnKey,
  ) => {
    if (draggedKey === targetKey) return

    const fromIndex = selectedTableColumns.indexOf(draggedKey)
    const toIndex = selectedTableColumns.indexOf(targetKey)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...selectedTableColumns]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)

    setSelectedTableColumns(next)
    pushTableColumnsToUrl(next)
  }

  const selectedTableColumnOptions = useMemo(() => {
    const labelMap = new Map(
      TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => [option.value, option.label]),
    )
    return selectedTableColumns.map((key) => ({ key, label: labelMap.get(key) || key }))
  }, [selectedTableColumns])

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

  const parentRows = useMemo<TransactionParentRow[]>(() => {
    const allItemsById = new Map(items.map((item) => [item.id, item]))
    const childrenByParentId = new Map<string, TransactionListItem[]>()
    const visibleParentIds = new Set<string>()

    for (const item of displayed) {
      const parentId = item.parentTransaction || null
      if (parentId) {
        if (allItemsById.has(parentId)) {
          const existing = childrenByParentId.get(parentId) ?? []
          existing.push(item)
          childrenByParentId.set(parentId, existing)
          visibleParentIds.add(parentId)
        } else {
          visibleParentIds.add(item.id)
        }
      } else {
        visibleParentIds.add(item.id)
      }
    }

    const sortItems = (a: TransactionListItem, b: TransactionListItem) => {
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
    }

    return Array.from(visibleParentIds)
      .map((parentId) => allItemsById.get(parentId))
      .filter((item): item is TransactionListItem => Boolean(item))
      .sort(sortItems)
      .map((parent) => ({
        parent,
        children: [...(childrenByParentId.get(parent.id) ?? [])].sort(sortItems),
      }))
  }, [displayed, items, sortBy, sortOrder])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(field)
    setSortOrder('desc')
  }

  const columns = useMemo<DataTableColumn<TransactionParentRow>[]>(() => {
    const getAllocation = (row: TransactionParentRow) => {
      const totalAllocatedWithFees = row.children.reduce(
        (sum, child) => sum + ((child.amount || 0) + (child.transactionFee || 0)),
        0,
      )
      const parentAmount = row.parent.amount || 0
      return { totalAllocatedWithFees, parentAmount }
    }

    const byKey: Record<TransactionReportColumnKey, DataTableColumn<TransactionParentRow>> = {
      referenceNumber: {
        key: 'referenceNumber',
        label: 'Reference #',
        render: (row) => (
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={(event) => {
              event.stopPropagation()
              router.push(`/app/records/transactions/${row.parent.id}/edit`)
            }}
          >
            {row.parent.referenceNumber || '-'}
          </span>
        ),
      },
      transactionDate: {
        key: 'transactionDate',
        label: 'Transaction Date',
        render: (row) => formatDate(row.parent.transactionDate),
      },
      createdAt: {
        key: 'createdAt',
        label: 'Created',
        render: (row) => formatDate(row.parent.createdAt),
      },
      updatedAt: {
        key: 'updatedAt',
        label: 'Last Updated',
        render: (row) => formatDate(row.parent.updatedAt),
      },
      type: {
        key: 'type',
        label: 'Type',
        render: (row) => {
          if (!row.parent.transactionType) return '-'
          return (
            <Badge
              color={row.parent.transactionType === 'debit' ? 'blue' : 'grape'}
              variant="light"
              tt="capitalize"
            >
              {row.parent.transactionType}
            </Badge>
          )
        },
      },
      status: {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const { totalAllocatedWithFees, parentAmount } = getAllocation(row)
          const isForAllocation =
            row.parent.isFundAllocation && totalAllocatedWithFees !== parentAmount

          if (isForAllocation) {
            return (
              <Badge color="yellow" variant="light" tt="capitalize">
                For allocation
              </Badge>
            )
          }

          return (
            <Badge
              color={row.parent.transactionStatus === 'failed' ? 'red' : 'teal'}
              variant="light"
              tt="capitalize"
            >
              {row.parent.transactionStatus || '-'}
            </Badge>
          )
        },
      },
      sourceBank: {
        key: 'sourceBank',
        label: 'Source Bank',
        render: (row) => row.parent.sourceAccountName || '-',
      },
      destinationBank: {
        key: 'destinationBank',
        label: 'Destination Bank',
        render: (row) => row.parent.destinationAccountName || '-',
      },
      fromWithSourceBank: {
        key: 'fromWithSourceBank',
        label: 'From + Source Bank',
        render: (row) => {
          const from = row.parent.from || '-'
          const source = row.parent.sourceAccountName || '-'
          return `${from} (${source})`
        },
      },
      toWithDestinationBank: {
        key: 'toWithDestinationBank',
        label: 'To + Destination Bank',
        render: (row) => {
          const to = row.parent.to || '-'
          const destination = row.parent.destinationAccountName || '-'
          return `${to} (${destination})`
        },
      },
      financialAccount: {
        key: 'financialAccount',
        label: 'Financial Account',
        render: (row) => row.parent.financialAccountName || '-',
      },
      from: {
        key: 'from',
        label: 'From',
        render: (row) => row.parent.from || '-',
      },
      to: {
        key: 'to',
        label: 'To',
        render: (row) => row.parent.to || '-',
      },
      amount: {
        key: 'amount',
        label: 'Amount',
        render: (row) => formatCurrency(row.parent.amount),
      },
      fee: {
        key: 'fee',
        label: 'Fee',
        render: (row) => formatCurrency(row.parent.transactionFee),
      },
      totalAmount: {
        key: 'totalAmount',
        label: 'Total Amount',
        render: (row) => formatTotalAmount(row.parent.amount, row.parent.transactionFee),
      },
      currentBalance: {
        key: 'currentBalance',
        label: 'Current Balance',
        render: (row) => formatCurrency(row.parent.currentBalance),
      },
      runningBalance: {
        key: 'runningBalance',
        label: 'Running Balance',
        render: (row) => formatCurrency(row.parent.runningBalance),
      },
      fundAllocation: {
        key: 'fundAllocation',
        label: 'Fund Allocation',
        render: (row) => (row.parent.isFundAllocation ? 'Yes' : 'No'),
      },
      allocatedFunds: {
        key: 'allocatedFunds',
        label: 'Allocated Funds',
        render: (row) => {
          const { totalAllocatedWithFees, parentAmount } = getAllocation(row)
          if (!row.parent.isFundAllocation) return '-'
          return `${formatCurrency(totalAllocatedWithFees)} / ${formatCurrency(parentAmount)}`
        },
      },
      description: {
        key: 'description',
        label: 'Description',
        render: (row) => row.parent.description || '-',
      },
      particulars: {
        key: 'particulars',
        label: 'Particulars',
        render: (row) => row.parent.particulars || '-',
      },
    }

    const activeColumns =
      selectedTableColumns.length > 0 ? selectedTableColumns : DEFAULT_TABLE_COLUMNS

    return activeColumns.map((key) => byKey[key]).filter(Boolean)
  }, [router, selectedTableColumns])

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
            <MultiSelect
              label="Table Columns"
              placeholder="Shown table columns"
              data={TRANSACTION_REPORT_COLUMN_OPTIONS.map((column) => ({
                value: column.value,
                label: column.label,
              }))}
              value={selectedTableColumns}
              onChange={handleTableColumnsChange}
              hidePickedOptions
              searchable
              clearable={false}
              size="sm"
              styles={{
                root: { minWidth: 280 },
                input: { minHeight: 36 },
              }}
            />
            <Text size="sm">Column Order</Text>
            <Group gap="xs" align="center" wrap="wrap">
              {selectedTableColumnOptions.map((column) => (
                <Badge
                  key={column.key}
                  draggable
                  onDragStart={() => setDraggingColumnKey(column.key)}
                  onDragOver={(event) => {
                    event.preventDefault()
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!draggingColumnKey) return
                    reorderSelectedColumns(draggingColumnKey, column.key)
                    setDraggingColumnKey(null)
                  }}
                  onDragEnd={() => setDraggingColumnKey(null)}
                  style={{
                    cursor: 'grab',
                    opacity: draggingColumnKey === column.key ? 0.5 : 1,
                    border:
                      draggingColumnKey === column.key
                        ? '2px dashed var(--mantine-color-blue-5)'
                        : undefined,
                  }}
                  variant="light"
                >
                  {column.label}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Collapse>
        <Group justify="flex-end">
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
        data={parentRows}
        isLoading={isLoading}
        loadingText="Loading transactions..."
        emptyText="No transactions found."
        getRowKey={(row) => row.parent.id}
        onRowClick={(row) => {
          setExpandedRows((current) =>
            current.includes(row.parent.id)
              ? current.filter((id) => id !== row.parent.id)
              : [...current, row.parent.id],
          )
        }}
        isRowExpanded={(row) => expandedRows.includes(row.parent.id)}
        renderExpandedRow={(row: TransactionParentRow): React.ReactNode => {
          const totalAllocated = row.children.reduce(
            (sum, child) => sum + ((child.amount || 0) + (child.transactionFee || 0)),
            0,
          )
          const parentAmount = row.parent.amount || 0
          const allocationStatus =
            totalAllocated === parentAmount
              ? 'complete'
              : totalAllocated > parentAmount
                ? 'exceeded'
                : 'partial'
          const allocationColor =
            allocationStatus === 'complete'
              ? 'green'
              : allocationStatus === 'exceeded'
                ? 'red'
                : 'orange'

          return (
            <Stack gap="md" p="sm" className={classes.expandedContent}>
              <Group gap="md" justify="space-between">
                <Group>
                  <Text size="xs">Created: {formatDate(row.parent.createdAt)}</Text>
                  <Text size="xs">Last Updated: {formatDate(row.parent.updatedAt)}</Text>
                </Group>
                {row.parent.isFundAllocation && (
                  <Text size="xs" fw={500} c={allocationColor}>
                    Allocated funds: {formatCurrency(totalAllocated)}/{formatCurrency(parentAmount)}
                  </Text>
                )}
              </Group>
              <div className={classes.detailGrid}>
                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Reference #
                  </Text>
                  <Text size="sm">{row.parent.referenceNumber || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Transaction Date
                  </Text>
                  <Text size="sm">{formatDate(row.parent.transactionDate)}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Type
                  </Text>
                  <Text size="sm" tt="capitalize">
                    {row.parent.transactionType || '-'}
                  </Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Status
                  </Text>
                  <Text size="sm" tt="capitalize">
                    {row.parent.transactionStatus || '-'}
                  </Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Source Bank
                  </Text>
                  <Text size="sm">{row.parent.sourceAccountName || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Destination Bank
                  </Text>
                  <Text size="sm">{row.parent.destinationAccountName || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Financial Account
                  </Text>
                  <Text size="sm">{row.parent.financialAccountName || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    From
                  </Text>
                  <Text size="sm">{row.parent.from || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    To
                  </Text>
                  <Text size="sm">{row.parent.to || '-'}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Amount
                  </Text>
                  <Text size="sm">{formatCurrency(row.parent.amount)}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Fee
                  </Text>
                  <Text size="sm">{formatCurrency(row.parent.transactionFee)}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Total Amount
                  </Text>
                  <Text size="sm">
                    {formatTotalAmount(row.parent.amount, row.parent.transactionFee)}
                  </Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Current Balance
                  </Text>
                  <Text size="sm">{formatCurrency(row.parent.currentBalance)}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Running Balance
                  </Text>
                  <Text size="sm">{formatCurrency(row.parent.runningBalance)}</Text>
                </Flex>

                <Flex direction="column" className={classes.detailItem}>
                  <Text size="xs" c="dimmed">
                    Fund Allocation
                  </Text>
                  <Text size="sm">{row.parent.isFundAllocation ? 'Yes' : 'No'}</Text>
                </Flex>
                <Flex
                  direction="column"
                  className={`${classes.detailItem} ${classes.detailItemWide}`}
                >
                  <Text size="xs" c="dimmed">
                    Description
                  </Text>
                  <Text size="sm">{row.parent.description || '-'}</Text>
                </Flex>
                {row.parent.particulars ? (
                  <Flex
                    direction="column"
                    className={`${classes.detailItem} ${classes.detailItemWide}`}
                  >
                    <Text size="xs" c="dimmed">
                      Particulars
                    </Text>
                    <Text size="sm">{row.parent.particulars}</Text>
                  </Flex>
                ) : null}
              </div>

              {row.children.length > 0 && (
                <>
                  <Group justify="space-between" align="center">
                    <Text fw={600} size="sm" mt="xs">
                      Child transactions
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/app/records/transactions/${row.parent.id}/allocate`)
                      }}
                    >
                      Allocate funds
                    </Button>
                  </Group>
                  <Table withTableBorder withColumnBorders striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Reference #</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Source to Destination</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Fee</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {row.children.map((child: TransactionListItem) => (
                        <Table.Tr key={child.id}>
                          <Table.Td>
                            <span
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                              onClick={(event) => {
                                event.stopPropagation()
                                router.push(`/app/records/transactions/${child.id}/edit`)
                              }}
                            >
                              {child.referenceNumber || '-'}
                            </span>
                          </Table.Td>
                          <Table.Td>{formatDate(child.transactionDate)}</Table.Td>
                          <Table.Td>
                            {(() => {
                              const source = child.sourceAccountName || '-'
                              const destination = child.destinationAccountName || '-'
                              if (source === '-' && destination === '-') return '-'
                              return `${source} to ${destination}`
                            })()}
                          </Table.Td>
                          <Table.Td>{formatCurrency(child.amount)}</Table.Td>
                          <Table.Td>{formatCurrency(child.transactionFee)}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={child.transactionStatus === 'failed' ? 'red' : 'teal'}
                              variant="light"
                              tt="capitalize"
                            >
                              {child.transactionStatus || '-'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}
            </Stack>
          )
        }}
      />
    </div>
  )
}
