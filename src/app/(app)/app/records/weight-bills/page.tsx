'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Group,
  MultiSelect,
  Table,
  TextInput,
  Pagination,
  Flex,
  Text,
  Modal,
  Stack,
} from '@mantine/core'
import { Filter, Search, Download, Pencil, Trash2, CircleCheck, Upload } from 'lucide-react'
import {
  deleteWeightBill,
  deleteWeightBills,
  getWeightBills,
  exportWeightBillsToCSV,
  getVehicleOptions,
  parseAndCompareImportedRows,
  applyImportDecisions,
  syncWeightBillsToGoogleSheet,
  type WeightBillsQuery,
  type ImportRowComparison,
} from './actions'
import classes from '../page.module.scss'

interface WeightBill {
  id: string
  weightBillNumber: number
  date: string
  customerName: string
  vehicle: string
  submittedBy?: string
  verifiedBy?: string
  amount: number
  paymentStatus?: 'PAID' | 'CANCELLED'
  isVerified: boolean
  updatedAt: string
}

type SortBy = 'name' | 'date' | 'lastModified'
type SortOrder = 'asc' | 'desc'

interface PaginationData {
  page: number
  pageSize: number
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type FeedbackState = {
  tone: 'success' | 'error' | 'info'
  message: string
}

const DEBOUNCE_DELAY = 500

const formatDateForDisplay = (dateValue: string | undefined): string => {
  if (!dateValue) return '-'
  const normalized = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue
  return normalized || '-'
}

const formatTextForDisplay = (value: unknown): string => {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized.toLowerCase() === 'undefined') return '-'
  return normalized
}

const formatAmountForDisplay = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) return '-'
  return `₱${amount.toFixed(2)}`
}

export default function WeightBillsPage() {
  const router = useRouter()
  const [weightBills, setWeightBills] = useState<WeightBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isApplyingImport, setIsApplyingImport] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterVehicles, setFilterVehicles] = useState<string[]>([])
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string[]>([])
  const [filterVerificationStatus, setFilterVerificationStatus] = useState<string[]>([])
  const [vehicleOptions, setVehicleOptions] = useState<{ value: string; label: string }[]>([])
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [importMode, setImportMode] = useState(false)
  const [importedRows, setImportedRows] = useState<ImportRowComparison[]>([])
  const [importDecisions, setImportDecisions] = useState<Record<number, 'accepted' | 'rejected'>>(
    {},
  )
  const [importResult, setImportResult] = useState<{
    createdCount: number
    updatedCount: number
    createdRows: number[]
    updatedRows: number[]
  } | null>(null)
  const [importModeSortBy, setImportModeSortBy] = useState<SortBy>('date')
  const [importModeSortOrder, setImportModeSortOrder] = useState<SortOrder>('desc')
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadWeightBills = async (query: WeightBillsQuery) => {
    setIsLoading(true)
    try {
      const result = await getWeightBills(query)
      if (result.success) {
        setWeightBills(result.data as WeightBill[])
        if ('pagination' in result && result.pagination) {
          setPagination(result.pagination)
        }
      }
    } catch (error) {
      console.error('Failed to load weight bills:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWeightBills({
      search,
      sortBy,
      sortOrder,
      page,
      filterVehicles,
      filterPaymentStatus,
      filterVerificationStatus,
    })
  }, [
    search,
    sortBy,
    sortOrder,
    page,
    filterVehicles,
    filterPaymentStatus,
    filterVerificationStatus,
  ])

  useEffect(() => {
    getVehicleOptions().then((result) => {
      if (result.success && result.data) {
        setVehicleOptions(result.data)
      }
    })
  }, [])

  const handleEdit = (billId: string) => {
    router.push(`/app/records/weight-bills/edit?id=${billId}`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportWeightBillsToCSV({
        search,
        sortBy,
        sortOrder,
        filterVehicles,
        filterPaymentStatus,
        filterVerificationStatus,
      })
      if (result.success && result.data && result.filename) {
        const isBase64 = Boolean((result as any).isBase64)
        const mimeType = (result as any).mimeType || 'text/csv;charset=utf-8;'

        const blob = isBase64
          ? (() => {
              const binary = atob(result.data)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i)
              }
              return new Blob([bytes], { type: mimeType })
            })()
          : new Blob([result.data], { type: mimeType })

        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', result.filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to export weight bills:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSync = async () => {
    setFeedback(null)
    setIsSyncing(true)
    try {
      const result = await syncWeightBillsToGoogleSheet()

      if (!result.success) {
        setFeedback({
          tone: 'error',
          message: result.message || 'Google Sheet sync failed.',
        })
        return
      }

      const rowCount = result.summary?.rowCount
      const details = typeof rowCount === 'number' ? ` (${rowCount} row(s) written)` : ''
      setFeedback({
        tone: 'success',
        message: `${result.message}${details}`,
      })
    } catch (error) {
      console.error('Failed to sync weight bills from Google Sheet:', error)
      setFeedback({ tone: 'error', message: 'Google Sheet sync failed.' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    setFeedback(null)
    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await parseAndCompareImportedRows(formData)

      if (!result.success) {
        setFeedback({
          tone: 'error',
          message: result.error || 'Failed to parse spreadsheet.',
        })
        return
      }

      if (result.rows.length === 0) {
        setFeedback({
          tone: result.errors.length > 0 ? 'info' : 'success',
          message:
            result.errors.length > 0
              ? `No importable rows found. ${result.errors.length} error(s).`
              : 'Spreadsheet is empty.',
        })
        return
      }

      if (result.totalNew === 0 && result.totalChanged === 0) {
        setImportMode(false)
        setImportedRows([])
        setImportDecisions({})
        setImportResult(null)
        setFeedback({
          tone: 'success',
          message: 'No changes to show. Data and imported Excel file are synced.',
        })
        return
      }

      // Enter import mode
      setImportedRows(result.rows)
      setImportDecisions({})
      setImportResult(null)
      setImportMode(true)
      const duplicateWarnings = result.errors.filter((error) =>
        error.startsWith('Duplicate Weight Bill # found and removed'),
      )
      setFeedback({
        tone: 'info',
        message: `Import preview ready: ${result.totalNew} new, ${result.totalChanged} changed, ${result.totalUnchanged} unchanged.${duplicateWarnings.length > 0 ? ` ${duplicateWarnings.join(' ')}` : ''}`,
      })
    } catch (error) {
      console.error('Failed to parse spreadsheet:', error)
      setFeedback({ tone: 'error', message: 'Spreadsheet import failed.' })
    } finally {
      setIsImporting(false)
    }
  }

  const handleApplyImport = async () => {
    if (Object.keys(importDecisions).length === 0) {
      setFeedback({ tone: 'error', message: 'No changes accepted or rejected.' })
      return
    }

    const acceptedCount = Object.values(importDecisions).filter(
      (decision) => decision === 'accepted',
    ).length

    if (acceptedCount === 0) {
      setImportResult(null)
      setImportMode(false)
      setImportedRows([])
      setImportDecisions({})
      setFeedback({ tone: 'info', message: 'No changes were applied.' })
      return
    }

    setIsApplyingImport(true)
    try {
      const result = await applyImportDecisions({
        rows: importedRows,
        decisions: importDecisions,
      })

      if (!result.success) {
        setFeedback({
          tone: 'error',
          message: result.error || 'Failed to apply import.',
        })
        return
      }

      // Determine which rows were created vs updated
      const createdRows: number[] = []
      const updatedRows: number[] = []

      for (const row of importedRows) {
        const decision = importDecisions[row.weightBillNumber]
        if (decision === 'accepted') {
          if (row.status === 'new') {
            createdRows.push(row.weightBillNumber)
          } else if (row.status === 'changed') {
            updatedRows.push(row.weightBillNumber)
          }
        }
      }

      setImportResult({
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        createdRows,
        updatedRows,
      })

      // Exit import mode immediately and show results in normal table view
      setImportMode(false)
      setImportedRows([])
      setImportDecisions({})

      setFeedback({
        tone: 'success',
        message: `Changes applied: ${result.createdCount} created, ${result.updatedCount} updated.`,
      })

      // Reload data to show the newly created/updated records
      await loadWeightBills({
        search,
        sortBy,
        sortOrder,
        page,
        filterVehicles,
        filterPaymentStatus,
        filterVerificationStatus,
      })
    } catch (error) {
      console.error('Failed to apply import:', error)
      setFeedback({ tone: 'error', message: 'Failed to apply import.' })
    } finally {
      setIsApplyingImport(false)
    }
  }

  const handleCancelImport = () => {
    setImportMode(false)
    setImportedRows([])
    setImportDecisions({})
    setFeedback(null)
  }

  const toggleImportDecision = (billNumber: number, decision: 'accepted' | 'rejected') => {
    setImportDecisions((prev) => {
      const newDecisions = { ...prev }
      if (newDecisions[billNumber] === decision) {
        delete newDecisions[billNumber]
      } else {
        newDecisions[billNumber] = decision
      }
      return newDecisions
    })
  }

  const acceptAllImportedRows = () => {
    const newDecisions: Record<number, 'accepted' | 'rejected'> = {}
    for (const row of importedRows) {
      if (row.status === 'unchanged') continue
      newDecisions[row.weightBillNumber] = 'accepted'
    }
    setImportDecisions(newDecisions)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleDelete = async (billId: string) => {
    setDeleteTargetIds([billId])
    setDeleteConfirmOpen(true)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return

    setDeleteTargetIds(selectedIds)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (deleteTargetIds.length === 0) return

    setDeleteConfirmOpen(false)

    if (deleteTargetIds.length === 1) {
      const billId = deleteTargetIds[0]
      setDeletingId(billId)
      try {
        const result = await deleteWeightBill(billId)
        if (!result.success) {
          console.error('Failed to delete weight bill:', result.error)
          return
        }

        await loadWeightBills({
          search,
          sortBy,
          sortOrder,
          page,
          filterVehicles,
          filterPaymentStatus,
          filterVerificationStatus,
        })
        setSelectedIds((prev) => prev.filter((id) => id !== billId))
      } catch (error) {
        console.error('Failed to delete weight bill:', error)
      } finally {
        setDeletingId(null)
        setDeleteTargetIds([])
      }
      return
    }

    setIsBulkDeleting(true)
    try {
      const result = await deleteWeightBills(deleteTargetIds)
      if (!result.success) {
        console.error('Failed to delete selected weight bills:', result.error)
        return
      }

      setSelectedIds([])
      await loadWeightBills({
        search,
        sortBy,
        sortOrder,
        page,
        filterVehicles,
        filterPaymentStatus,
        filterVerificationStatus,
      })
    } catch (error) {
      console.error('Failed to delete selected weight bills:', error)
    } finally {
      setIsBulkDeleting(false)
      setDeleteTargetIds([])
    }
  }

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1) // Reset to first page when changing sort
  }

  const toggleImportModeSort = (field: SortBy) => {
    if (importModeSortBy === field) {
      setImportModeSortOrder(importModeSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setImportModeSortBy(field)
      setImportModeSortOrder('desc')
    }
  }

  const handleSearchInput = (value: string) => {
    setSearchInput(value)

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1) // Reset to first page when searching
    }, DEBOUNCE_DELAY)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => weightBills.some((bill) => bill.id === id)))
  }, [weightBills])

  const displayBills = weightBills

  const visibleIds = displayBills.map((bill) => bill.id)
  const activeFilterCount =
    filterVehicles.length + filterPaymentStatus.length + filterVerificationStatus.length
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id))

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(visibleIds)
      return
    }

    setSelectedIds([])
  }

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev
        return [...prev, id]
      }

      return prev.filter((selectedId) => selectedId !== id)
    })
  }

  const rows = displayBills.map((bill) => (
    <Table.Tr
      key={bill.id}
      bg={selectedIds.includes(bill.id) ? 'var(--mantine-color-blue-light)' : undefined}
    >
      <Table.Td>
        <Checkbox
          aria-label={`Select weight bill ${bill.weightBillNumber}`}
          checked={selectedIds.includes(bill.id)}
          onChange={(event) => handleToggleSelectRow(bill.id, event.currentTarget.checked)}
        />
      </Table.Td>
      <Table.Td>{bill.weightBillNumber}</Table.Td>
      <Table.Td>{formatDateForDisplay(bill.date)}</Table.Td>
      <Table.Td>{formatTextForDisplay(bill.customerName)}</Table.Td>
      <Table.Td>{formatTextForDisplay(bill.vehicle)}</Table.Td>
      <Table.Td>{bill.submittedBy || '-'}</Table.Td>
      <Table.Td>{bill.verifiedBy || '-'}</Table.Td>
      <Table.Td>{formatAmountForDisplay(bill.amount)}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          {(bill.paymentStatus === 'PAID' || bill.paymentStatus === 'CANCELLED') && (
            <Badge color={bill.paymentStatus === 'PAID' ? 'green' : 'red'} variant="light">
              {bill.paymentStatus}
            </Badge>
          )}
          {bill.isVerified && (
            <Badge color={bill.isVerified ? 'green' : 'red'} variant="light">
              VERIFIED
            </Badge>
          )}

          {importResult &&
            (importResult.createdRows.includes(bill.weightBillNumber) ? (
              <Badge color="green" variant="filled" size="sm">
                ✓ Created
              </Badge>
            ) : importResult.updatedRows.includes(bill.weightBillNumber) ? (
              <Badge color="blue" variant="filled" size="sm">
                ✓ Updated
              </Badge>
            ) : null)}
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(bill.id)}>
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDelete(bill.id)}
            loading={deletingId === bill.id}
            disabled={isBulkDeleting || (deletingId !== null && deletingId !== bill.id)}
            aria-label={`Delete weight bill ${bill.weightBillNumber}`}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <div className={classes.wrapper}>
      <div style={{ marginBottom: 24 }}>
        <Group mb="md" gap="xs" align="flex-end">
          <TextInput
            placeholder="Search by bill #, vehicle, or name..."
            leftSection={<Search size={16} />}
            value={searchInput}
            onChange={(e) => handleSearchInput(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant={filterOpen || activeFilterCount > 0 ? 'filled' : 'default'}
            size={36}
            aria-label="Toggle filters"
            onClick={() => setFilterOpen((o) => !o)}
          >
            <Filter size={16} />
          </ActionIcon>
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
                label="Vehicle"
                placeholder="All vehicles"
                data={vehicleOptions}
                value={filterVehicles}
                onChange={(val) => {
                  setFilterVehicles(val)
                  setPage(1)
                }}
                clearable
                searchable
              />
              <MultiSelect
                label="Payment Status"
                placeholder="All statuses"
                data={[
                  { value: 'PAID', label: 'PAID' },
                  { value: 'CANCELLED', label: 'CANCELLED' },
                ]}
                value={filterPaymentStatus}
                onChange={(val) => {
                  setFilterPaymentStatus(val)
                  setPage(1)
                }}
                clearable
              />
              <MultiSelect
                label="Verification Status"
                placeholder="All"
                data={[
                  { value: 'verified', label: 'Verified' },
                  { value: 'unverified', label: 'Unverified' },
                ]}
                value={filterVerificationStatus}
                onChange={(val) => {
                  setFilterVerificationStatus(val)
                  setPage(1)
                }}
                clearable
              />
            </Group>
            {activeFilterCount > 0 && (
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setFilterVehicles([])
                    setFilterPaymentStatus([])
                    setFilterVerificationStatus([])
                    setPage(1)
                  }}
                >
                  Clear filters ({activeFilterCount})
                </Button>
              </Group>
            )}
          </Stack>
        </Collapse>

        <Group justify="flex-start" gap="xs">
          {importMode ? (
            <>
              <Text fw={500} c="blue">
                Import Mode: {Object.keys(importDecisions).length} decision(s)
              </Text>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Sort by:</span>
              <Button
                variant={importModeSortBy === 'name' ? 'filled' : 'default'}
                size="sm"
                onClick={() => toggleImportModeSort('name')}
              >
                Name {importModeSortBy === 'name' && (importModeSortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={importModeSortBy === 'date' ? 'filled' : 'default'}
                size="sm"
                onClick={() => toggleImportModeSort('date')}
              >
                Date {importModeSortBy === 'date' && (importModeSortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button variant="light" color="green" size="sm" onClick={acceptAllImportedRows}>
                Accept All
              </Button>
              <Button
                variant="filled"
                color="green"
                size="sm"
                onClick={handleApplyImport}
                loading={isApplyingImport}
                disabled={Object.keys(importDecisions).length === 0}
              >
                Apply Changes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCancelImport}
                disabled={isApplyingImport}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Sort by:</span>
              <Button
                variant={sortBy === 'name' ? 'filled' : 'default'}
                size="sm"
                onClick={() => toggleSort('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'date' ? 'filled' : 'default'}
                size="sm"
                onClick={() => toggleSort('date')}
              >
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'lastModified' ? 'filled' : 'default'}
                size="sm"
                onClick={() => toggleSort('lastModified')}
              >
                Last Modified {sortBy === 'lastModified' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              {importResult && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    color="gray"
                    onClick={() => {
                      setImportResult(null)
                    }}
                  >
                    Clear Import Results
                  </Button>
                </>
              )}
              <Button
                variant="light"
                color="red"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || deletingId !== null}
                loading={isBulkDeleting}
              >
                Delete selected ({selectedIds.length})
              </Button>
              {/* <Button
                variant="default"
                size="sm"
                onClick={handleSync}
                loading={isSyncing}
                disabled={isImporting}
              >
                Sync Google Sheet
              </Button> */}
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImportFileSelected}
              />
              <Button
                variant="default"
                size="sm"
                leftSection={<Upload size={16} />}
                onClick={handleImportClick}
                loading={isImporting}
                disabled={isSyncing}
              >
                Import Spreadsheet
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<Download size={16} />}
                onClick={handleExport}
                loading={isExporting}
              >
                Export to Spreadsheet
              </Button>
            </>
          )}
        </Group>

        {feedback && (
          <Alert
            mt="sm"
            variant="light"
            icon={<CircleCheck size={16} />}
            withCloseButton
            onClose={() => setFeedback(null)}
            color={
              feedback.tone === 'success' ? 'green' : feedback.tone === 'error' ? 'red' : 'yellow'
            }
          >
            {feedback.message}
          </Alert>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading weight bills...</div>
      ) : importMode ? (
        <>
          {/* Create sorted list for import mode table */}
          {(() => {
            // Build from actionable import rows so Import Mode is not limited by current DB page.
            const allRows: Array<{
              type: 'existing' | 'new'
              importedRow: ImportRowComparison
            }> = importedRows
              .filter((row) => row.status === 'new' || row.status === 'changed')
              .map((importedRow) => ({
                type: importedRow.status === 'new' ? 'new' : 'existing',
                importedRow,
              }))

            // Sort by selected field
            const sortedRows = [...allRows].sort((a, b) => {
              let aValue: string | number = ''
              let bValue: string | number = ''

              if (importModeSortBy === 'date') {
                aValue = a.importedRow.new.date || ''
                bValue = b.importedRow.new.date || ''
              } else if (importModeSortBy === 'name') {
                aValue = a.importedRow.new.customerName || ''
                bValue = b.importedRow.new.customerName || ''
              }

              if (aValue < bValue) return importModeSortOrder === 'asc' ? -1 : 1
              if (aValue > bValue) return importModeSortOrder === 'asc' ? 1 : -1
              return 0
            })

            return (
              <div style={{ overflowX: 'auto' }}>
                <Table striped={false} highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Bill #</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Customer Name</Table.Th>
                      <Table.Th>Vehicle</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedRows.map((row, rowIndex) => {
                      const importedRow = row.importedRow
                      const decision = importDecisions[importedRow.weightBillNumber]

                      // Imported record: show with diffs and chips
                      const rowBg =
                        importedRow.status === 'new' ? 'rgba(34, 139, 34, 0.1)' : undefined

                      return (
                        <Table.Tr
                          key={`${row.type}-${importedRow.weightBillNumber}-${importedRow.status}-${rowIndex}`}
                          bg={rowBg}
                        >
                          <Table.Td fw={500}>{importedRow.weightBillNumber}</Table.Td>
                          <Table.Td>
                            {importedRow.status === 'changed' &&
                            importedRow.changes?.some((c) => c.field === 'date') ? (
                              <div>
                                <span style={{ color: '#b00020', textDecoration: 'line-through' }}>
                                  {formatDateForDisplay(importedRow.old?.date)}
                                </span>
                                <div>{formatDateForDisplay(importedRow.new.date)}</div>
                              </div>
                            ) : (
                              formatDateForDisplay(importedRow.new.date)
                            )}
                          </Table.Td>
                          <Table.Td>
                            {importedRow.status === 'changed' &&
                            importedRow.changes?.some((c) => c.field === 'customerName') ? (
                              <div>
                                <span style={{ color: '#b00020', textDecoration: 'line-through' }}>
                                  {formatTextForDisplay(importedRow.old?.customerName)}
                                </span>
                                <div>{formatTextForDisplay(importedRow.new.customerName)}</div>
                              </div>
                            ) : (
                              formatTextForDisplay(importedRow.new.customerName)
                            )}
                          </Table.Td>
                          <Table.Td>
                            {importedRow.status === 'changed' &&
                            importedRow.changes?.some((c) => c.field === 'vehicle') ? (
                              <div>
                                <span style={{ color: '#b00020', textDecoration: 'line-through' }}>
                                  {formatTextForDisplay(importedRow.old?.vehicle)}
                                </span>
                                <div>{formatTextForDisplay(importedRow.new.vehicle)}</div>
                              </div>
                            ) : (
                              formatTextForDisplay(importedRow.new.vehicle)
                            )}
                          </Table.Td>
                          <Table.Td>
                            {importedRow.status === 'changed' &&
                            importedRow.changes?.some((c) => c.field === 'amount') ? (
                              <div>
                                <span style={{ color: '#b00020', textDecoration: 'line-through' }}>
                                  {formatAmountForDisplay(importedRow.old?.amount)}
                                </span>
                                <div>{formatAmountForDisplay(importedRow.new.amount)}</div>
                              </div>
                            ) : (
                              formatAmountForDisplay(importedRow.new.amount)
                            )}
                          </Table.Td>
                          <Table.Td>
                            {importedRow.status === 'changed' &&
                            importedRow.changes?.some((c) => c.field === 'paymentStatus') ? (
                              <div>
                                {(importedRow.old?.paymentStatus === 'PAID' ||
                                  importedRow.old?.paymentStatus === 'CANCELLED') && (
                                  <div style={{ marginBottom: 4 }}>
                                    <Badge
                                      color={
                                        importedRow.old?.paymentStatus === 'PAID' ? 'green' : 'red'
                                      }
                                      variant="light"
                                      size="xs"
                                      styles={{
                                        label: {
                                          textDecoration: 'line-through',
                                        },
                                      }}
                                    >
                                      {importedRow.old?.paymentStatus}
                                    </Badge>
                                  </div>
                                )}
                                {(importedRow.new.paymentStatus === 'PAID' ||
                                  importedRow.new.paymentStatus === 'CANCELLED') && (
                                  <div>
                                    <Badge
                                      color={
                                        importedRow.new.paymentStatus === 'PAID' ? 'green' : 'red'
                                      }
                                      variant="light"
                                      size="sm"
                                    >
                                      {importedRow.new.paymentStatus}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ) : importedRow.new.paymentStatus === 'PAID' ||
                              importedRow.new.paymentStatus === 'CANCELLED' ? (
                              <Badge
                                color={importedRow.new.paymentStatus === 'PAID' ? 'green' : 'red'}
                                variant="light"
                                size="sm"
                              >
                                {importedRow.new.paymentStatus}
                              </Badge>
                            ) : (
                              <Text size="sm" c="dimmed">
                                -
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {importResult ? (
                              // Show result indicator instead of chips
                              <Badge
                                color={
                                  importResult.createdRows.includes(importedRow.weightBillNumber)
                                    ? 'green'
                                    : importResult.updatedRows.includes(
                                          importedRow.weightBillNumber,
                                        )
                                      ? 'blue'
                                      : 'gray'
                                }
                                variant="filled"
                                size="sm"
                              >
                                {importResult.createdRows.includes(importedRow.weightBillNumber)
                                  ? '✓ Created'
                                  : importResult.updatedRows.includes(importedRow.weightBillNumber)
                                    ? '✓ Updated'
                                    : 'Rejected'}
                              </Badge>
                            ) : importedRow.status === 'unchanged' ? (
                              <Text size="sm" c="dimmed">
                                Unchanged
                              </Text>
                            ) : (
                              <Group gap={4} wrap="nowrap">
                                <Chip
                                  variant="light"
                                  color={decision === 'accepted' ? 'green' : 'default'}
                                  checked={decision === 'accepted'}
                                  onChange={() =>
                                    toggleImportDecision(importedRow.weightBillNumber, 'accepted')
                                  }
                                >
                                  Accept
                                </Chip>
                              </Group>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            )
          })()}
        </>
      ) : weightBills.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>No weight bills found.</div>
      ) : (
        <>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    onChange={(event) => handleToggleSelectAll(event.currentTarget.checked)}
                  />
                </Table.Th>
                <Table.Th>Bill #</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Customer Name</Table.Th>
                <Table.Th>Vehicle</Table.Th>
                <Table.Th>Submitted By</Table.Th>
                <Table.Th>Verified By</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <Flex justify="space-between" align="center" mt="lg">
              <Text size="sm">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalDocs)} of{' '}
                {pagination.totalDocs} records
              </Text>
              <Pagination
                value={pagination.page}
                onChange={setPage}
                total={pagination.totalPages}
                withEdges
              />
            </Flex>
          )}
        </>
      )}

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
          {deleteTargetIds.length > 1
            ? `Delete ${deleteTargetIds.length} selected weight bills? This cannot be undone.`
            : 'Delete this weight bill? This cannot be undone.'}
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
            onClick={handleConfirmDelete}
            loading={deletingId !== null || isBulkDeleting}
            disabled={deletingId !== null || isBulkDeleting}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
