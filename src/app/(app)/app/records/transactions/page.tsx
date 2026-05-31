'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Grid,
  Group,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Image,
  TextInput,
} from '@mantine/core'
import { CollapsibleImage } from './CollapsibleImage'
import { CircleCheck, Filter, Plus, Search, Settings } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/(app)/components/ui/DataTable'
import {
  getFinancialAccounts,
  getTransactions,
  getUserTransactionTableColumnsConfig,
  saveTransactionTableColumns,
  type FinancialAccountOption,
  type TransactionListItem,
} from './actions'
import {
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from '../../financial-accounts/[id]/preview/columns'
import { CONTAINER_BREAKPOINTS } from '@/constants/breakpoints'
import classes from '../page.module.scss'
import { useAuth } from '@/app/providers/Auth'
import { hasAppRoleReadAccess } from '@/app/(app)/utils/roleAccess'
import { DatePickerInput } from '@mantine/dates'

const TABLE_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const parseTableColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return DEFAULT_TABLE_COLUMNS

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      TABLE_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
    )

  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : DEFAULT_TABLE_COLUMNS
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
type ChildTableColumn = {
  key: TransactionReportColumnKey
  label: string
  render: (child: TransactionListItem) => React.ReactNode
}

const DEFAULT_TABLE_COLUMNS: TransactionReportColumnKey[] = [
  'referenceNumber',
  'transactionDate',
  'sourceAccount',
  'destinationAccount',
  'transactionType',
  'totalAmount',
  'runningBalance',
  'transactionStatus',
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

const computeAllocatedFundsFromChildren = (children: TransactionListItem[]): number =>
  children.reduce((sum, child) => {
    const amount =
      typeof child.amount === 'number' && Number.isFinite(child.amount) ? child.amount : 0
    const fee =
      typeof child.transactionFee === 'number' && Number.isFinite(child.transactionFee)
        ? child.transactionFee
        : 0
    return sum + amount + fee
  }, 0)

const toTimestamp = (value?: string): number | null => {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

const compareNumeric = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0)

const compareText = (a?: string, b?: string): number =>
  String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' })

const compareTransactions = (
  a: TransactionListItem,
  b: TransactionListItem,
  sortBy: SortBy,
  sortOrder: SortOrder,
): number => {
  const direction = sortOrder === 'asc' ? 1 : -1

  const amountA = typeof a.amount === 'number' ? a.amount : Number.NEGATIVE_INFINITY
  const amountB = typeof b.amount === 'number' ? b.amount : Number.NEGATIVE_INFINITY
  const txDateA = toTimestamp(a.transactionDate) ?? Number.NEGATIVE_INFINITY
  const txDateB = toTimestamp(b.transactionDate) ?? Number.NEGATIVE_INFINITY
  const createdA = toTimestamp(a.createdAt) ?? Number.NEGATIVE_INFINITY
  const createdB = toTimestamp(b.createdAt) ?? Number.NEGATIVE_INFINITY
  const updatedA = toTimestamp(a.updatedAt) ?? Number.NEGATIVE_INFINITY
  const updatedB = toTimestamp(b.updatedAt) ?? Number.NEGATIVE_INFINITY

  if (sortBy === 'amount') {
    const amountCmp = compareNumeric(amountA, amountB)
    if (amountCmp !== 0) return amountCmp * direction

    // Keep amount ties deterministic by newest transaction date, then creation metadata.
    const dateCmp = compareNumeric(txDateA, txDateB)
    if (dateCmp !== 0) return dateCmp * direction
  } else {
    const dateCmp = compareNumeric(txDateA, txDateB)
    if (dateCmp !== 0) return dateCmp * direction
  }

  const createdCmp = compareNumeric(createdA, createdB)
  if (createdCmp !== 0) return createdCmp * direction

  const updatedCmp = compareNumeric(updatedA, updatedB)
  if (updatedCmp !== 0) return updatedCmp * direction

  const referenceCmp = compareText(a.referenceNumber, b.referenceNumber)
  if (referenceCmp !== 0) return referenceCmp * direction

  return compareText(a.id, b.id) * direction
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
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [tableConfigOpen, setTableConfigOpen] = useState(false)
  const [filterFinancialAccount, setFilterFinancialAccount] = useState<string | null>(null)
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const [filterSourceAccounts, setFilterSourceAccounts] = useState<string[]>([])
  const [filterDestinationAccounts, setFilterDestinationAccounts] = useState<string[]>([])
  const [openMultiSelect, setOpenMultiSelect] = useState<string | null>(null)
  const [filterDateRange, setFilterDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ])
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [isSavingTableColumns, setIsSavingTableColumns] = useState(false)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
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
    const [transactionsResult, financialAccountsResult, savedColumnsResult] = await Promise.all([
      getTransactions(),
      getFinancialAccounts(),
      getUserTransactionTableColumnsConfig(),
    ])

    if (transactionsResult.success) {
      setItems(transactionsResult.data)
    } else {
      setFeedback({
        tone: 'error',
        message: transactionsResult.error ?? 'Failed to load transactions.',
      })
    }

    if (financialAccountsResult.success) {
      setFinancialAccounts(financialAccountsResult.data)
    } else if (!transactionsResult.success) {
      setFeedback({
        tone: 'error',
        message: financialAccountsResult.error ?? 'Failed to load financial accounts.',
      })
    }

    // Initialize table columns: URL params > saved config > defaults
    if (!tableColsParam && savedColumnsResult.success && savedColumnsResult.columns?.length) {
      const parsed = parseTableColumnKeys(savedColumnsResult.columns.join(','))
      setSelectedTableColumns(parsed)
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

    setFilterFinancialAccount(initialFinancialAccountFilter)
  }, [initialFinancialAccountFilter])

  useEffect(() => {
    if (filterFinancialAccount) return
    if (initialFinancialAccountFilter) return
    if (financialAccounts.length === 0) return

    const defaultAccount = financialAccounts.find(
      (account) => account.isDefault && Boolean(account.name),
    )

    if (defaultAccount?.name) {
      setFilterFinancialAccount(defaultAccount.name)
    }
  }, [filterFinancialAccount, financialAccounts, initialFinancialAccountFilter])

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
    setOpenMultiSelect(null)
  }

  const toggleFilterCollapse = () => {
    setFilterOpen((open) => {
      const next = !open
      if (next) setTableConfigOpen(false)
      return next
    })
  }

  const toggleTableConfigCollapse = () => {
    setTableConfigOpen((open) => {
      const next = !open
      if (next) setFilterOpen(false)
      return next
    })
  }

  const handleSaveTableColumns = async () => {
    setIsSavingTableColumns(true)
    const result = await saveTransactionTableColumns(selectedTableColumns)

    if (!result.success) {
      setFeedback({
        tone: 'error',
        message: result.error ?? 'Failed to save table columns configuration.',
      })
      setIsSavingTableColumns(false)
      return
    }

    setFeedback({
      tone: 'success',
      message: 'Table columns configuration saved.',
    })
    setIsSavingTableColumns(false)
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
          financialAccounts
            .map((account) => account.name)
            .filter((name): name is string => Boolean(name)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [financialAccounts],
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

  const selectedFinancialAccountCurrentBalance = useMemo(() => {
    if (!filterFinancialAccount) return null

    const selectedAccount = financialAccounts.find(
      (account) => account.name === filterFinancialAccount,
    )

    if (!selectedAccount || typeof selectedAccount.currentBalance !== 'number') {
      return '-'
    }

    return formatCurrency(selectedAccount.currentBalance)
  }, [filterFinancialAccount, financialAccounts])

  const activeFilterCount =
    filterTypes.length +
    filterStatuses.length +
    filterSourceAccounts.length +
    filterDestinationAccounts.length +
    (filterDateRange[0] || filterDateRange[1] ? 1 : 0)

  const displayed = useMemo(() => {
    const query = search.toLowerCase().trim()
    const allItemsById = new Map(items.map((item) => [item.id, item]))

    const filtered = items.filter((item) => {
      if (filterFinancialAccount) {
        let effectiveFinancialAccountName = item.financialAccountName

        // During text search, allow child rows without a direct financial account
        // to inherit the parent account for filtering and parent lifting.
        if (!effectiveFinancialAccountName && query && item.parentTransaction) {
          const parent = allItemsById.get(item.parentTransaction)
          effectiveFinancialAccountName = parent?.financialAccountName
        }

        if (effectiveFinancialAccountName !== filterFinancialAccount) {
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
        (item.referenceNumber ?? '').toLowerCase().includes(query) ||
        (item.financialAccountName ?? '').toLowerCase().includes(query) ||
        (item.sourceAccountName ?? '').toLowerCase().includes(query) ||
        (item.destinationAccountName ?? '').toLowerCase().includes(query) ||
        (item.transactionType ?? '').toLowerCase().includes(query) ||
        (item.transactionStatus ?? '').toLowerCase().includes(query)
      )
    })

    return filtered.sort((a, b) => compareTransactions(a, b, sortBy, sortOrder))
  }, [
    filterDateRange,
    filterDestinationAccounts,
    filterFinancialAccount,
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

    // Always build child groupings from the full dataset so expanding a visible
    // parent can still show its linked children even when child rows are filtered out.
    for (const item of items) {
      const parentId = item.parentTransaction || null
      if (!parentId) continue

      const existing = childrenByParentId.get(parentId) ?? []
      existing.push(item)
      childrenByParentId.set(parentId, existing)
    }

    for (const item of displayed) {
      const parentId = item.parentTransaction || null
      if (parentId) {
        if (allItemsById.has(parentId)) {
          visibleParentIds.add(parentId)
          // If allocatedFundType is 'returned', also show as standalone parent row
          if (item.allocatedFundType === 'returned') {
            visibleParentIds.add(item.id)
          }
        } else {
          visibleParentIds.add(item.id)
        }
      } else {
        visibleParentIds.add(item.id)
      }
    }

    const sortItems = (a: TransactionListItem, b: TransactionListItem) =>
      compareTransactions(a, b, sortBy, sortOrder)

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
      const totalAllocatedWithFees = computeAllocatedFundsFromChildren(row.children)
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
      receiptImage: {
        key: 'receiptImage',
        label: 'Receipt Image',
        render: (row) => {
          const url = row.parent.receiptImage?.url || null
          if (!url) return '-'
          return <CollapsibleImage src={url} alt="Receipt" width="100%" maxWidth="200" />
        },
      },
      transactionDate: {
        key: 'transactionDate',
        label: 'Transaction Date',
        render: (row) => formatDate(row.parent.transactionDate),
      },
      transactionType: {
        key: 'transactionType',
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
      transactionStatus: {
        key: 'transactionStatus',
        label: 'Status',
        render: (row) => {
          const { totalAllocatedWithFees, parentAmount } = getAllocation(row)
          const isForAllocation = row.children.length > 0 && totalAllocatedWithFees !== parentAmount

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
      sourceAccount: {
        key: 'sourceAccount',
        label: 'Source Bank',
        render: (row) => row.parent.sourceAccountName || '-',
      },
      destinationAccount: {
        key: 'destinationAccount',
        label: 'Destination Bank',
        render: (row) => row.parent.destinationAccountName || '-',
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
      sender: {
        key: 'sender',
        label: 'Sender',
        render: (row) => row.parent.sender || '-',
      },
      receiver: {
        key: 'receiver',
        label: 'Receiver',
        render: (row) => row.parent.receiver || '-',
      },
      amount: {
        key: 'amount',
        label: 'Amount',
        render: (row) => formatCurrency(row.parent.amount),
      },
      transactionFee: {
        key: 'transactionFee',
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
      isAllocatedFund: {
        key: 'isAllocatedFund',
        label: 'Allocated Fund',
        render: (row) => (row.parent.isAllocatedFund ? 'Yes' : 'No'),
      },
      allocatedFunds: {
        key: 'allocatedFunds',
        label: 'Allocated Funds',
        render: (row) => {
          const { totalAllocatedWithFees, parentAmount } = getAllocation(row)
          if (!row.parent.isAllocatedFund) return '-'
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

  const childTableColumns = useMemo<ChildTableColumn[]>(() => {
    const byKey: Partial<Record<TransactionReportColumnKey, ChildTableColumn>> = {
      referenceNumber: {
        key: 'referenceNumber',
        label: 'Reference #',
        render: (child) => (
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
        ),
      },
      receiptImage: {
        key: 'receiptImage',
        label: 'Receipt Image',
        render: (child) => {
          const url = child.receiptImage?.url || null
          if (!url) return '-'
          return <CollapsibleImage src={url} alt="Receipt" width={200} />
        },
      },
      transactionDate: {
        key: 'transactionDate',
        label: 'Date',
        render: (child) => formatDate(child.transactionDate),
      },
      transactionType: {
        key: 'transactionType',
        label: 'Type',
        render: (child) => {
          if (!child.transactionType) return '-'
          return (
            <Badge
              color={child.transactionType === 'debit' ? 'blue' : 'grape'}
              variant="light"
              tt="capitalize"
            >
              {child.transactionType}
            </Badge>
          )
        },
      },
      transactionStatus: {
        key: 'transactionStatus',
        label: 'Status',
        render: (child) => (
          <Badge
            color={child.transactionStatus === 'failed' ? 'red' : 'teal'}
            variant="light"
            tt="capitalize"
          >
            {child.transactionStatus || '-'}
          </Badge>
        ),
      },
      sourceAccount: {
        key: 'sourceAccount',
        label: 'Source Bank',
        render: (child) => child.sourceAccountName || '-',
      },
      destinationAccount: {
        key: 'destinationAccount',
        label: 'Destination Bank',
        render: (child) => child.destinationAccountName || '-',
      },
      financialAccount: {
        key: 'financialAccount',
        label: 'Financial Account',
        render: (child) => child.financialAccountName || '-',
      },
      from: {
        key: 'from',
        label: 'From',
        render: (child) => child.from || '-',
      },
      to: {
        key: 'to',
        label: 'To',
        render: (child) => child.to || '-',
      },
      sender: {
        key: 'sender',
        label: 'Sender',
        render: (child) => child.sender || '-',
      },
      receiver: {
        key: 'receiver',
        label: 'Receiver',
        render: (child) => child.receiver || '-',
      },
      amount: {
        key: 'amount',
        label: 'Amount',
        render: (child) => formatCurrency(child.amount),
      },
      transactionFee: {
        key: 'transactionFee',
        label: 'Fee',
        render: (child) => formatCurrency(child.transactionFee),
      },
      totalAmount: {
        key: 'totalAmount',
        label: 'Total Amount',
        render: (child) => formatTotalAmount(child.amount, child.transactionFee),
      },
      currentBalance: {
        key: 'currentBalance',
        label: 'Current Balance',
        render: (child) => formatCurrency(child.currentBalance),
      },
      runningBalance: {
        key: 'runningBalance',
        label: 'Running Balance',
        render: (child) => formatCurrency(child.runningBalance),
      },
      isAllocatedFund: {
        key: 'isAllocatedFund',
        label: 'Allocated Fund',
        render: (child) => (child.isAllocatedFund ? 'Yes' : 'No'),
      },
      allocatedFunds: {
        key: 'allocatedFunds',
        label: 'Allocated Funds',
        render: () => '-',
      },
      description: {
        key: 'description',
        label: 'Description',
        render: (child) => child.description || '-',
      },
      particulars: {
        key: 'particulars',
        label: 'Particulars',
        render: (child) => child.particulars || '-',
      },
    }

    const activeColumns =
      selectedTableColumns.length > 0 ? selectedTableColumns : DEFAULT_TABLE_COLUMNS

    return activeColumns
      .map((key) => byKey[key])
      .filter((column): column is ChildTableColumn => Boolean(column))
  }, [router, selectedTableColumns])

  return (
    <div className={classes.wrapper}>
      <Flex gap={{ base: 'xs', xs: 'xs', md: 'md' }} direction="column">
        <Group gap="xs" align="center">
          <TextInput
            placeholder="Search by description, accounts, type, or status..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
        </Group>
        <Flex gap={{ base: 'xs', xs: 'xs', md: 'sm' }} justify="space-between" wrap="wrap">
          <Flex
            w={{ base: '100%', md: 'auto' }}
            gap={{ base: 'xs', xs: 'xs', md: 'sm' }}
            wrap="wrap"
          >
            <Select
              w={{ base: '100%', md: 'auto' }}
              placeholder="Select financial account"
              data={financialAccountOptions}
              value={filterFinancialAccount}
              onChange={setFilterFinancialAccount}
              clearable
              searchable
              style={{ minWidth: 260 }}
              disabled={isLoading}
            />
            <Flex
              w={{ base: '100%', md: 'auto' }}
              gap={{ base: 'xs', xs: 'xs', md: 'sm' }}
              justify="space-evenly"
            >
              <Button
                w={{ base: '100%', md: 'auto' }}
                variant={sortBy === 'date' ? 'light' : 'default'}
                size="sm"
                onClick={() => toggleSort('date')}
                disabled={isLoading}
              >
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                w={{ base: '100%', md: 'auto' }}
                variant={sortBy === 'amount' ? 'light' : 'default'}
                size="sm"
                onClick={() => toggleSort('amount')}
                disabled={isLoading}
              >
                Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </Flex>
          </Flex>
          <Group w={{ base: '100%', xs: '100%', md: 'auto' }}>
            <Button
              w={{ base: '100%', xs: '100%', md: 'auto' }}
              variant="filled"
              size="sm"
              leftSection={<Plus size={14} />}
              onClick={() => router.push('/app/records/transactions/add')}
            >
              New transaction
            </Button>
          </Group>
        </Flex>
        {feedback && (
          <Alert
            mt="sm"
            variant="outline"
            icon={<CircleCheck size={16} />}
            withCloseButton
            onClose={() => setFeedback(null)}
            color={feedback.tone === 'success' ? 'green' : 'red'}
          >
            {feedback.message}
          </Alert>
        )}
        {!isLoading && (
          <Box>
            <Group justify="space-between" align="center">
              {selectedFinancialAccountCurrentBalance && (
                <Stack gap={0} align="flex-start">
                  <Text size="xs">Current balance</Text>
                  <Title order={3}>{selectedFinancialAccountCurrentBalance || '-'}</Title>
                </Stack>
              )}
              <Group>
                <ActionIcon
                  variant={filterOpen || activeFilterCount > 0 ? 'filled' : 'default'}
                  size={36}
                  aria-label="Toggle filters"
                  onClick={toggleFilterCollapse}
                >
                  <Filter size={16} />
                </ActionIcon>
                <ActionIcon
                  variant={tableConfigOpen ? 'filled' : 'default'}
                  size={36}
                  aria-label="Table configuration"
                  onClick={toggleTableConfigCollapse}
                >
                  <Settings size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Collapse expanded={filterOpen} transitionDuration={0}>
              <Stack
                gap="xs"
                p="sm"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-sm)',
                }}
              >
                <Grid
                  type="container"
                  breakpoints={CONTAINER_BREAKPOINTS}
                  grow
                  gap="sm"
                  justify="space-between"
                >
                  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                    <MultiSelect
                      label="Type"
                      placeholder="All types"
                      data={[
                        { value: 'debit', label: 'Debit' },
                        { value: 'credit', label: 'Credit' },
                      ]}
                      value={filterTypes}
                      onChange={(nextValues) => {
                        setFilterTypes(nextValues)
                        setOpenMultiSelect(null)
                      }}
                      dropdownOpened={openMultiSelect === 'type'}
                      onDropdownOpen={() => setOpenMultiSelect('type')}
                      onDropdownClose={() => setOpenMultiSelect(null)}
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                    <MultiSelect
                      label="Status"
                      placeholder="All statuses"
                      data={[
                        { value: 'completed', label: 'Completed' },
                        { value: 'failed', label: 'Failed' },
                      ]}
                      value={filterStatuses}
                      onChange={(nextValues) => {
                        setFilterStatuses(nextValues)
                        setOpenMultiSelect(null)
                      }}
                      dropdownOpened={openMultiSelect === 'status'}
                      onDropdownOpen={() => setOpenMultiSelect('status')}
                      onDropdownClose={() => setOpenMultiSelect(null)}
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                    <DatePickerInput
                      type="range"
                      label="Date Range"
                      placeholder="Pick date range"
                      value={filterDateRange}
                      onChange={setFilterDateRange}
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <MultiSelect
                      label="Source Account"
                      placeholder="All source accounts"
                      data={sourceAccountOptions}
                      value={filterSourceAccounts}
                      onChange={(nextValues) => {
                        setFilterSourceAccounts(nextValues)
                        setOpenMultiSelect(null)
                      }}
                      dropdownOpened={openMultiSelect === 'sourceAccount'}
                      onDropdownOpen={() => setOpenMultiSelect('sourceAccount')}
                      onDropdownClose={() => setOpenMultiSelect(null)}
                      clearable
                      searchable
                      styles={{
                        pillsList: {
                          flexWrap: 'nowrap',
                          overflowX: 'auto',
                        },
                      }}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <MultiSelect
                      label="Destination Account"
                      placeholder="All destination accounts"
                      data={destinationAccountOptions}
                      value={filterDestinationAccounts}
                      onChange={(nextValues) => {
                        setFilterDestinationAccounts(nextValues)
                        setOpenMultiSelect(null)
                      }}
                      dropdownOpened={openMultiSelect === 'destinationAccount'}
                      onDropdownOpen={() => setOpenMultiSelect('destinationAccount')}
                      onDropdownClose={() => setOpenMultiSelect(null)}
                      clearable
                      searchable
                      styles={{
                        pillsList: {
                          flexWrap: 'nowrap',
                          overflowX: 'auto',
                        },
                      }}
                    />
                  </Grid.Col>
                </Grid>
                {activeFilterCount > 0 && (
                  <Group justify="flex-end">
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => {
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
            <Collapse expanded={tableConfigOpen} transitionDuration={0}>
              <Stack
                gap="xs"
                p="sm"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-sm)',
                }}
              >
                <MultiSelect
                  label="Table Columns"
                  placeholder="Shown table columns"
                  data={TRANSACTION_REPORT_COLUMN_OPTIONS.map((column) => ({
                    value: column.value,
                    label: column.label,
                  }))}
                  value={selectedTableColumns}
                  onChange={handleTableColumnsChange}
                  dropdownOpened={openMultiSelect === 'tableColumns'}
                  onDropdownOpen={() => setOpenMultiSelect('tableColumns')}
                  onDropdownClose={() => setOpenMultiSelect(null)}
                  hidePickedOptions
                  searchable
                  clearable={false}
                  withPillsReorder
                  size="sm"
                  styles={{
                    root: { minWidth: 280 },
                    input: { minHeight: 36 },
                  }}
                />
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    size="xs"
                    onClick={handleSaveTableColumns}
                    loading={isSavingTableColumns}
                  >
                    Save
                  </Button>
                </Group>
              </Stack>
            </Collapse>
          </Box>
        )}

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
            const totalAllocated = computeAllocatedFundsFromChildren(row.children)
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
              <Stack gap="md" p="sm" className={classes['expanded-content']}>
                <Group gap="md" justify="space-between">
                  <Group>
                    <Text size="xs">Created: {formatDate(row.parent.createdAt)}</Text>
                    <Text size="xs">Last Updated: {formatDate(row.parent.updatedAt)}</Text>
                  </Group>
                  {row.children.length > 0 && (
                    <Text size="xs" fw={500} c={allocationColor}>
                      Allocated funds: {formatCurrency(totalAllocated)}/
                      {formatCurrency(parentAmount)}
                    </Text>
                  )}
                </Group>
                <div className={classes['detail-grid']}>
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

                  {row.children.length > 0 && (
                    <Flex direction="column" className={classes.detailItem}>
                      <Text size="xs" c="dimmed">
                        Allocated Fund
                      </Text>
                      <Text size="sm">{row.parent.isAllocatedFund ? 'Yes' : 'No'}</Text>
                    </Flex>
                  )}
                  <Flex
                    direction="column"
                    className={`${classes.detailItem} ${classes['detail-item--wide']}`}
                  >
                    <Text size="xs" c="dimmed">
                      Description
                    </Text>
                    <Text size="sm">{row.parent.description || '-'}</Text>
                  </Flex>
                  {row.parent.particulars ? (
                    <Flex
                      direction="column"
                      className={`${classes.detailItem} ${classes['detail-item--wide']}`}
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
                    </Group>
                    <Table w="100%" withTableBorder withColumnBorders striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          {childTableColumns.map((column) => (
                            <Table.Th key={column.key}>{column.label}</Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {row.children.map((child: TransactionListItem) => (
                          <Table.Tr key={child.id}>
                            {childTableColumns.map((column) => (
                              <Table.Td key={`${child.id}-${column.key}`}>
                                {column.render(child)}
                              </Table.Td>
                            ))}
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
      </Flex>
    </div>
  )
}
