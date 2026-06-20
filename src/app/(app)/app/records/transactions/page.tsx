'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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
  Text,
  Title,
  TextInput,
} from '@mantine/core'
import { CollapsibleImage } from './CollapsibleImage'
import { CircleCheck, CircleX, Filter, Plus, RefreshCw, Search, Settings } from 'lucide-react'
import {
  DataTable,
  type DataTableColumn,
  type DataTablePaginationState,
} from '@/app/(app)/components/ui/DataTable'
import {
  getBanks,
  getFinancialAccounts,
  getTransactionsPage,
  getUserTransactionTableColumnsConfig,
  saveTransactionTableColumns,
  type BankOption,
  type FinancialAccountOption,
  type TransactionStatus,
  type TransactionType,
  type TransactionListSortBy,
  type TransactionListSortOrder,
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
import { useMediaQuery } from '@mantine/hooks'

const TABLE_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const normalizeTableColumnKey = (value: string): TransactionReportColumnKey | null => {
  return TABLE_COLUMN_KEY_SET.has(value as TransactionReportColumnKey)
    ? (value as TransactionReportColumnKey)
    : null
}

const parseTableColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return DEFAULT_TABLE_COLUMNS

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .map((item) => normalizeTableColumnKey(item))
    .filter((item): item is TransactionReportColumnKey => Boolean(item))

  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : DEFAULT_TABLE_COLUMNS
}

const serializeTableColumnKeys = (keys: string[]): string => {
  const valid = keys
    .map((item) => normalizeTableColumnKey(item))
    .filter((item): item is TransactionReportColumnKey => Boolean(item))

  return Array.from(new Set(valid)).join(',')
}

const parseClientPageParam = (value?: string | null): number => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

const parseCsvParam = (value?: string | null): string[] => {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
}

type SortBy = TransactionListSortBy
type SortOrder = TransactionListSortOrder
type TransactionParentRow = { parent: TransactionListItem }

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

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
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
  const initialSearch = searchParams.get('search')?.trim() || ''
  const initialSortBy = searchParams.get('sortBy')
  const initialSortOrder = searchParams.get('sortOrder')
  const initialFilterFinancialAccount = searchParams.get('financialAccount')?.trim() || ''
  const initialFilterTypes = parseCsvParam(searchParams.get('types')).filter(
    (value): value is TransactionType => value === 'debit' || value === 'credit',
  )
  const initialFilterStatuses = parseCsvParam(searchParams.get('statuses')).filter(
    (value): value is TransactionStatus => value === 'completed' || value === 'failed',
  )
  const initialFilterSourceAccounts = parseCsvParam(searchParams.get('sourceAccounts'))
  const initialFilterDestinationAccounts = parseCsvParam(searchParams.get('destinationAccounts'))
  const initialStartDate = searchParams.get('startDate')?.trim() || null
  const initialEndDate = searchParams.get('endDate')?.trim() || null
  const isDesktop = useMediaQuery('(min-width: 48em)')

  const responsivePillsListStyle = useMemo(
    () =>
      isDesktop
        ? {
            flexWrap: 'nowrap' as const,
            overflowX: 'auto' as const,
          }
        : {
            flexWrap: 'wrap' as const,
            overflowX: 'visible' as const,
          },
    [isDesktop],
  )

  const [items, setItems] = useState<TransactionListItem[]>([])
  const [banks, setBanks] = useState<BankOption[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountOption[]>([])
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [filterOpen, setFilterOpen] = useState(false)
  const [tableConfigOpen, setTableConfigOpen] = useState(false)
  const [filterFinancialAccount, setFilterFinancialAccount] = useState<string | null>(
    initialFilterFinancialAccount || null,
  )
  const [filterTypes, setFilterTypes] = useState<string[]>(initialFilterTypes)
  const [filterStatuses, setFilterStatuses] = useState<string[]>(initialFilterStatuses)
  const [filterSourceAccounts, setFilterSourceAccounts] = useState<string[]>(
    initialFilterSourceAccounts,
  )
  const [filterDestinationAccounts, setFilterDestinationAccounts] = useState<string[]>(
    initialFilterDestinationAccounts,
  )
  const [openMultiSelect, setOpenMultiSelect] = useState<string | null>(null)
  const [datePickerRange, setDatePickerRange] = useState<[string | null, string | null]>([
    initialStartDate,
    initialEndDate,
  ])
  const [filterDateRange, setFilterDateRange] = useState<[string | null, string | null]>([
    initialStartDate,
    initialEndDate,
  ])
  const [sortBy, setSortBy] = useState<SortBy>(
    initialSortBy === 'amount' || initialSortBy === 'updated' || initialSortBy === 'date'
      ? initialSortBy
      : 'date',
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialSortOrder === 'asc' || initialSortOrder === 'desc' ? initialSortOrder : 'desc',
  )
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [isSavingTableColumns, setIsSavingTableColumns] = useState(false)
  const [pagination, setPagination] = useState<DataTablePaginationState | null>(null)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const hasAppliedInitialQueryFilters = useRef(false)
  const previousResetSignatureRef = useRef<string | null>(null)
  const tableColsParam = searchParams.get('tableCols')
  const pageParam = searchParams.get('page')
  const [selectedTableColumns, setSelectedTableColumns] = useState<TransactionReportColumnKey[]>(
    parseTableColumnKeys(tableColsParam),
  )
  const [clientPage, setClientPage] = useState<number>(parseClientPageParam(pageParam))

  const initialFinancialAccountFilter = useMemo(
    () => searchParams.get('financialAccount')?.trim() || '',
    [searchParams],
  )

  const financialAccountsQuery = useQuery({
    queryKey: ['financial-accounts-options'],
    queryFn: () => getFinancialAccounts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    let isMounted = true

    const loadInitial = async () => {
      const [banksResult, savedColumnsResult] = await Promise.all([
        getBanks(),
        getUserTransactionTableColumnsConfig(),
      ])

      if (!isMounted) return

      if (banksResult.success) {
        setBanks(banksResult.data)
      }

      // Initialize table columns: URL params > saved config > defaults
      if (!tableColsParam && savedColumnsResult.success && savedColumnsResult.columns?.length) {
        const parsed = parseTableColumnKeys(savedColumnsResult.columns.join(','))
        setSelectedTableColumns(parsed)
      }

      setIsBootstrapping(false)
    }

    void loadInitial()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const result = financialAccountsQuery.data
    if (!result) return

    if (result.success) {
      setFinancialAccounts(result.data)
      return
    }

    setFinancialAccounts([])
    setFeedback({
      tone: 'error',
      message: result.error ?? 'Failed to load financial accounts.',
    })
  }, [financialAccountsQuery.data])

  useEffect(() => {
    if (hasAppliedInitialQueryFilters.current) return
    if (financialAccounts.length === 0) return

    hasAppliedInitialQueryFilters.current = true

    if (!initialFinancialAccountFilter) return

    const matchingAccount = financialAccounts.find(
      (account) =>
        account.id === initialFinancialAccountFilter ||
        account.name === initialFinancialAccountFilter,
    )

    if (matchingAccount) {
      setFilterFinancialAccount(matchingAccount.id)
    }
  }, [financialAccounts, initialFinancialAccountFilter])

  useEffect(() => {
    setClientPage(parseClientPageParam(searchParams.get('page')))
  }, [searchParams])

  useEffect(() => {
    if (filterFinancialAccount) return
    if (initialFinancialAccountFilter) return
    if (financialAccounts.length === 0) return

    const defaultAccount = financialAccounts.find((account) => account.isDefault)

    if (defaultAccount?.id) {
      setFilterFinancialAccount(defaultAccount.id)
    }
  }, [filterFinancialAccount, financialAccounts, initialFinancialAccountFilter])

  const pageResetSignature = useMemo(
    () =>
      JSON.stringify({
        filterDateRange,
        filterDestinationAccounts: [...filterDestinationAccounts].sort(),
        filterFinancialAccount,
        filterSourceAccounts: [...filterSourceAccounts].sort(),
        filterStatuses: [...filterStatuses].sort(),
        filterTypes: [...filterTypes].sort(),
        sortBy,
        sortOrder,
      }),
    [
      filterDateRange,
      filterDestinationAccounts,
      filterFinancialAccount,
      filterSourceAccounts,
      filterStatuses,
      filterTypes,
      sortBy,
      sortOrder,
    ],
  )

  useEffect(() => {
    if (previousResetSignatureRef.current === null) {
      previousResetSignatureRef.current = pageResetSignature
      return
    }

    if (previousResetSignatureRef.current === pageResetSignature) {
      return
    }

    previousResetSignatureRef.current = pageResetSignature

    if (clientPage === 1) return

    setClientPage(1)
  }, [clientPage, pageResetSignature])

  const transactionsQueryParams = useMemo(
    () => ({
      page: clientPage,
      pageSize: 10,
      search: debouncedSearch,
      financialAccountId: filterFinancialAccount || null,
      transactionTypes: [...filterTypes]
        .filter((value): value is TransactionType => value === 'debit' || value === 'credit')
        .sort(),
      transactionStatuses: [...filterStatuses]
        .filter((value): value is TransactionStatus => value === 'completed' || value === 'failed')
        .sort(),
      sourceAccountIds: [...filterSourceAccounts].sort(),
      destinationAccountIds: [...filterDestinationAccounts].sort(),
      startDate: filterDateRange[0],
      endDate: filterDateRange[1],
      sortBy,
      sortOrder,
    }),
    [
      clientPage,
      debouncedSearch,
      filterDateRange,
      filterDestinationAccounts,
      filterFinancialAccount,
      filterSourceAccounts,
      filterStatuses,
      filterTypes,
      sortBy,
      sortOrder,
    ],
  )

  const transactionsQuery = useQuery({
    queryKey: ['transactions-page', transactionsQueryParams],
    queryFn: () => getTransactionsPage(transactionsQueryParams),
    enabled: !isBootstrapping,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    const result = transactionsQuery.data
    if (!result) return

    if (result.success) {
      setItems(result.data)
      setPagination(result.pagination || null)
      if (result.pagination && result.pagination.page !== clientPage) {
        setClientPage(result.pagination.page)
      }
      return
    }

    setItems([])
    setPagination({
      page: 1,
      pageSize: 10,
      totalDocs: 0,
      totalPages: 1,
    })
    setFeedback({
      tone: 'error',
      message: result.error ?? 'Failed to load transactions.',
    })
  }, [clientPage, transactionsQuery.data])

  const hasQueryData = typeof transactionsQuery.data !== 'undefined'
  const isLoading = !hasQueryData && (isBootstrapping || transactionsQuery.isLoading)

  useEffect(() => {
    if (isBootstrapping) return

    const params = new URLSearchParams(searchParams.toString())

    const normalizedSearch = search.trim()
    if (normalizedSearch) params.set('search', normalizedSearch)
    else params.delete('search')

    if (clientPage > 1) params.set('page', String(clientPage))
    else params.delete('page')

    const serializedColumns = serializeTableColumnKeys(selectedTableColumns)
    if (serializedColumns) params.set('tableCols', serializedColumns)
    else params.delete('tableCols')

    if (filterFinancialAccount) params.set('financialAccount', filterFinancialAccount)
    else params.delete('financialAccount')

    const typeValues = [...filterTypes]
      .filter((value): value is TransactionType => value === 'debit' || value === 'credit')
      .sort()
    if (typeValues.length > 0) params.set('types', typeValues.join(','))
    else params.delete('types')

    const statusValues = [...filterStatuses]
      .filter((value): value is TransactionStatus => value === 'completed' || value === 'failed')
      .sort()
    if (statusValues.length > 0) params.set('statuses', statusValues.join(','))
    else params.delete('statuses')

    const sourceValues = [...filterSourceAccounts].filter(Boolean).sort()
    if (sourceValues.length > 0) params.set('sourceAccounts', sourceValues.join(','))
    else params.delete('sourceAccounts')

    const destinationValues = [...filterDestinationAccounts].filter(Boolean).sort()
    if (destinationValues.length > 0) params.set('destinationAccounts', destinationValues.join(','))
    else params.delete('destinationAccounts')

    if (filterDateRange[0]) params.set('startDate', filterDateRange[0])
    else params.delete('startDate')

    if (filterDateRange[1]) params.set('endDate', filterDateRange[1])
    else params.delete('endDate')

    if (sortBy !== 'date') params.set('sortBy', sortBy)
    else params.delete('sortBy')

    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    else params.delete('sortOrder')

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    router.replace(
      nextQuery ? `/app/records/transactions?${nextQuery}` : '/app/records/transactions',
    )
  }, [
    clientPage,
    filterDateRange,
    filterDestinationAccounts,
    filterFinancialAccount,
    filterSourceAccounts,
    filterStatuses,
    filterTypes,
    isBootstrapping,
    router,
    search,
    searchParams,
    selectedTableColumns,
    sortBy,
    sortOrder,
  ])

  const handleClientPageChange = (nextPage: number) => {
    setClientPage(nextPage)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (clientPage !== 1) {
      setClientPage(1)
    }
  }

  const handleDateRangeChange = (nextRange: [string | null, string | null]) => {
    setDatePickerRange(nextRange)

    const [startDate, endDate] = nextRange
    if (!startDate && !endDate) {
      setFilterDateRange([null, null])
      return
    }

    if (startDate && endDate) {
      setFilterDateRange(nextRange)
    }
  }

  const handleTableColumnsChange = (nextColumns: string[]) => {
    const parsed = parseTableColumnKeys(nextColumns.join(','))
    setSelectedTableColumns(parsed)
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
      financialAccounts
        .map((account) => ({
          value: account.id,
          label: account.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [financialAccounts],
  )

  const sourceAccountOptions = useMemo(
    () =>
      banks
        .map((bank) => ({
          value: bank.id,
          label:
            bank.name && bank.shortName
              ? `${bank.name} (${bank.shortName})`
              : bank.name || bank.shortName || bank.code || bank.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [banks],
  )

  const destinationAccountOptions = useMemo(
    () =>
      banks
        .map((bank) => ({
          value: bank.id,
          label:
            bank.name && bank.shortName
              ? `${bank.name} (${bank.shortName})`
              : bank.name || bank.shortName || bank.code || bank.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [banks],
  )

  const selectedFinancialAccountCurrentBalance = useMemo(() => {
    if (!filterFinancialAccount) return null

    const selectedAccount = financialAccounts.find(
      (account) => account.id === filterFinancialAccount,
    )

    if (!selectedAccount || typeof selectedAccount.currentBalance !== 'number') {
      return '-'
    }

    return formatCurrency(selectedAccount.currentBalance)
  }, [filterFinancialAccount, financialAccounts])

  const selectedFinancialAccountAllocationPool = useMemo(() => {
    if (!filterFinancialAccount) return null

    const selectedAccount = financialAccounts.find(
      (account) => account.id === filterFinancialAccount,
    )

    if (!selectedAccount || typeof selectedAccount.allocationFunds !== 'number') {
      return '-'
    }

    return formatCurrency(selectedAccount.allocationFunds)
  }, [filterFinancialAccount, financialAccounts])

  const selectedFinancialAccountUnallocatedFunds = useMemo(() => {
    if (!filterFinancialAccount) return null

    const selectedAccount = financialAccounts.find(
      (account) => account.id === filterFinancialAccount,
    )

    if (
      !selectedAccount ||
      typeof selectedAccount.allocationFunds !== 'number' ||
      typeof selectedAccount.allocatedFunds !== 'number'
    ) {
      return '-'
    }

    const remainingFunds = selectedAccount.allocationFunds - selectedAccount.allocatedFunds
    return formatCurrency(remainingFunds)
  }, [filterFinancialAccount, financialAccounts])

  const selectedFinancialAccountAllocatedFunds = useMemo(() => {
    if (!filterFinancialAccount) return null

    const selectedAccount = financialAccounts.find(
      (account) => account.id === filterFinancialAccount,
    )

    if (!selectedAccount || typeof selectedAccount.allocatedFunds !== 'number') {
      return '-'
    }

    return formatCurrency(selectedAccount.allocatedFunds)
  }, [filterFinancialAccount, financialAccounts])

  const activeFilterCount =
    filterTypes.length +
    filterStatuses.length +
    filterSourceAccounts.length +
    filterDestinationAccounts.length +
    (filterDateRange[0] || filterDateRange[1] ? 1 : 0)

  const parentRows = useMemo<TransactionParentRow[]>(() => {
    return items.map((parent) => ({ parent }))
  }, [items])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(field)
    setSortOrder('desc')
  }

  const columns = useMemo<DataTableColumn<TransactionParentRow>[]>(() => {
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
        label: 'Receipt image',
        render: (row) => {
          const url = row.parent.receiptImage?.url || null
          if (!url) return '-'
          return <CollapsibleImage src={url} alt="Receipt" width="100%" maxWidth="200" />
        },
      },
      transactionDate: {
        key: 'transactionDate',
        label: 'Transaction date',
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
        render: (row) => (
          <Badge
            color={row.parent.transactionStatus === 'failed' ? 'red' : 'teal'}
            variant="light"
            tt="capitalize"
          >
            {row.parent.transactionStatus || '-'}
          </Badge>
        ),
      },
      sourceAccount: {
        key: 'sourceAccount',
        label: 'Source bank',
        render: (row) => row.parent.sourceAccountName || '-',
      },
      destinationAccount: {
        key: 'destinationAccount',
        label: 'Destination bank',
        render: (row) => row.parent.destinationAccountName || '-',
      },
      financialAccount: {
        key: 'financialAccount',
        label: 'Financial account',
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
        label: 'Total amount',
        render: (row) => formatTotalAmount(row.parent.amount, row.parent.transactionFee),
      },
      currentBalance: {
        key: 'currentBalance',
        label: 'Current balance',
        render: (row) => formatCurrency(row.parent.currentBalance),
      },
      runningBalance: {
        key: 'runningBalance',
        label: 'Running balance',
        render: (row) => formatCurrency(row.parent.runningBalance),
      },
      isAllocatedFund: {
        key: 'isAllocatedFund',
        label: 'Allocated fund',
        render: (row) =>
          row.parent.isAllocatedFund ? (
            <CircleCheck size={16} color="green" />
          ) : (
            <CircleX size={16} color="gray" />
          ),
      },
      isForAllocation: {
        key: 'isForAllocation',
        label: 'For allocation',
        render: (row) =>
          row.parent.isForAllocation ? (
            <CircleCheck size={16} color="green" />
          ) : (
            <CircleX size={16} color="gray" />
          ),
      },
      allocatedFunds: {
        key: 'allocatedFunds',
        label: 'Allocated funds',
        render: (row) => {
          if (!row.parent.isAllocatedFund) return '-'
          return formatCurrency(row.parent.allocatedFunds)
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
      lastUpdated: {
        key: 'lastUpdated',
        label: 'Last updated',
        render: (row) => formatDateTime(row.parent.lastUpdated),
      },
    }

    const activeColumns =
      selectedTableColumns.length > 0 ? selectedTableColumns : DEFAULT_TABLE_COLUMNS

    return activeColumns.map((key) => byKey[key]).filter(Boolean)
  }, [router, selectedTableColumns])

  return (
    <div className={classes.wrapper}>
      <Flex gap={{ base: 'xs', xs: 'xs', md: 'md' }} direction="column">
        <Group gap="xs" align="center">
          <TextInput
            placeholder="Search by reference, description, particulars, from, or to..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
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
              <Button
                w={{ base: '100%', md: 'auto' }}
                variant={sortBy === 'updated' ? 'light' : 'default'}
                size="sm"
                onClick={() => toggleSort('updated')}
                disabled={isLoading}
              >
                Last updated {sortBy === 'updated' && (sortOrder === 'asc' ? '↑' : '↓')}
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
        <Group justify="space-between" align="center">
          <Flex gap={{ base: 'xs', sm: 'xl' }} wrap="wrap">
            {selectedFinancialAccountCurrentBalance && (
              <Stack gap={0} align="flex-start">
                <Text size="xs">Current balance</Text>
                <Title order={3}>{selectedFinancialAccountCurrentBalance || '-'}</Title>
              </Stack>
            )}
            {/* <Stack gap={0} align="flex-start">
                  <Text size="xs">Unallocated funds</Text>
                  <Title order={3}>{selectedFinancialAccountUnallocatedFunds || '-'}</Title>
                  <Text size="xs" c="dimmed">
                    Allocated {selectedFinancialAccountAllocatedFunds || '-'} | Pool{' '}
                    {selectedFinancialAccountAllocationPool || '-'}
                  </Text>
                </Stack> */}
          </Flex>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="default"
              size={36}
              aria-label="Refresh data"
              onClick={() => transactionsQuery.refetch()}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
            </ActionIcon>
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
        {!isLoading && (filterOpen || tableConfigOpen) && (
          <Box>
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
                      value={datePickerRange}
                      onChange={handleDateRangeChange}
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <MultiSelect
                      label="Source account"
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
                        pillsList: responsivePillsListStyle,
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
                        pillsList: responsivePillsListStyle,
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
                        setDatePickerRange([null, null])
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
                  borderRadius: 'var(--mantine-radius-md)',
                }}
              >
                <Flex
                  justify="flex-end"
                  align="end"
                  gap="sm"
                  direction={{ base: 'column', sm: 'row' }}
                >
                  <MultiSelect
                    flex={6}
                    label="Table columns"
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
                      root: { minWidth: 100 },
                      input: { minHeight: 36 },
                      pillsList: responsivePillsListStyle,
                    }}
                  />
                  <Box w={{ base: '100%', sm: 'auto' }}>
                    <Button
                      variant="default"
                      fullWidth
                      onClick={handleSaveTableColumns}
                      loading={isSavingTableColumns}
                    >
                      Save
                    </Button>
                  </Box>
                </Flex>
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
          pagination={pagination ?? undefined}
          onPageChange={handleClientPageChange}
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
            return (
              <Stack gap="md" p="sm" className={classes['expanded-content']}>
                <Group gap="md" justify="space-between">
                  <Group>
                    <Text size="xs">Created: {formatDate(row.parent.createdAt)}</Text>
                    <Text size="xs">Updated: {formatDate(row.parent.lastUpdated)}</Text>
                  </Group>
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
                      Transaction date
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
                      From
                    </Text>
                    <Text size="sm">{row.parent.from || '-'}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Source bank
                    </Text>
                    <Text size="sm">{row.parent.sourceAccountName || '-'}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      To
                    </Text>
                    <Text size="sm">{row.parent.to || '-'}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Destination bank
                    </Text>
                    <Text size="sm">{row.parent.destinationAccountName || '-'}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Financial account
                    </Text>
                    <Text size="sm">{row.parent.financialAccountName || '-'}</Text>
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
                      Total amount
                    </Text>
                    <Text size="sm">
                      {formatTotalAmount(row.parent.amount, row.parent.transactionFee)}
                    </Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Current balance
                    </Text>
                    <Text size="sm">{formatCurrency(row.parent.currentBalance)}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Running balance
                    </Text>
                    <Text size="sm">{formatCurrency(row.parent.runningBalance)}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Allocated fund
                    </Text>
                    <Text size="sm">{row.parent.isAllocatedFund ? 'Yes' : 'No'}</Text>
                  </Flex>

                  <Flex direction="column" className={classes.detailItem}>
                    <Text size="xs" c="dimmed">
                      Allocated funds
                    </Text>
                    <Text size="sm">{formatCurrency(row.parent.allocatedFunds)}</Text>
                  </Flex>
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
              </Stack>
            )
          }}
        />
      </Flex>
    </div>
  )
}
