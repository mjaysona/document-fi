'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
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
import { Filter, Search, Download, Pencil, Trash2 } from 'lucide-react'
import {
  deleteWeightBill,
  deleteWeightBills,
  getWeightBills,
  exportWeightBillsToCSV,
  getVehicleOptions,
  type WeightBillsQuery,
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

const DEBOUNCE_DELAY = 500

export default function WeightBillsPage() {
  const router = useRouter()
  const [weightBills, setWeightBills] = useState<WeightBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadWeightBills = async (query: WeightBillsQuery) => {
    console.log('test:::')
    setIsLoading(true)
    try {
      const result = await getWeightBills(query)

      console.log('result:::', result)
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
        // Create blob and download
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
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

  const visibleIds = weightBills.map((bill) => bill.id)
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

  const rows = weightBills.map((bill) => (
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
      <Table.Td>{bill.date ? new Date(bill.date).toLocaleDateString() : '-'}</Table.Td>
      <Table.Td>{bill.customerName}</Table.Td>
      <Table.Td>{bill.vehicle}</Table.Td>
      <Table.Td>{bill.submittedBy || '-'}</Table.Td>
      <Table.Td>{bill.verifiedBy || '-'}</Table.Td>
      <Table.Td>₱{bill.amount?.toFixed(2) || '0.00'}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Badge
            color={
              bill.paymentStatus === 'PAID'
                ? 'green'
                : bill.paymentStatus === 'CANCELLED'
                  ? 'red'
                  : 'gray'
            }
            variant="light"
          >
            {bill.paymentStatus || 'No payment status'}
          </Badge>
          <Badge color={bill.isVerified ? 'green' : 'red'} variant="light">
            {bill.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
          </Badge>
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
          <Button
            variant="default"
            size="sm"
            leftSection={<Download size={16} />}
            onClick={handleExport}
            loading={isExporting}
            ml="auto"
          >
            Export to CSV
          </Button>
        </Group>
      </div>

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading weight bills...</div>
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
