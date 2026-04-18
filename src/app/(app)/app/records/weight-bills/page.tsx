'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Group,
  Table,
  TextInput,
  Select,
  Card,
  Pagination,
  Flex,
  Text,
} from '@mantine/core'
import { Search, Download } from 'lucide-react'
import {
  deleteWeightBill,
  getWeightBills,
  exportWeightBillsToCSV,
  type WeightBillsQuery,
} from './actions'
import classes from '../page.module.scss'

interface WeightBill {
  id: string
  weightBillNumber: number
  date: string
  customerName: string
  vehicle: string
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
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
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
    loadWeightBills({ search, sortBy, sortOrder, page })
  }, [search, sortBy, sortOrder, page])

  const handleEdit = (billId: string) => {
    router.push(`/app/records/edit?id=${billId}`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportWeightBillsToCSV({ search, sortBy, sortOrder })
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
    const isConfirmed = window.confirm('Delete this weight bill? This cannot be undone.')
    if (!isConfirmed) return

    setDeletingId(billId)
    try {
      const result = await deleteWeightBill(billId)
      if (!result.success) {
        console.error('Failed to delete weight bill:', result.error)
        return
      }

      await loadWeightBills({ search, sortBy, sortOrder, page })
    } catch (error) {
      console.error('Failed to delete weight bill:', error)
    } finally {
      setDeletingId(null)
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

  const rows = weightBills.map((bill) => (
    <Table.Tr key={bill.id}>
      <Table.Td>{bill.weightBillNumber}</Table.Td>
      <Table.Td>{bill.date ? new Date(bill.date).toLocaleDateString() : '-'}</Table.Td>
      <Table.Td>{bill.customerName}</Table.Td>
      <Table.Td>{bill.vehicle}</Table.Td>
      <Table.Td>₱{bill.amount?.toFixed(2) || '0.00'}</Table.Td>
      <Table.Td>{bill.paymentStatus || '-'}</Table.Td>
      <Table.Td>{bill.isVerified ? '✓' : '✗'}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button variant="light" size="sm" onClick={() => handleEdit(bill.id)}>
            Edit
          </Button>
          <Button
            variant="light"
            color="red"
            size="sm"
            onClick={() => handleDelete(bill.id)}
            loading={deletingId === bill.id}
            disabled={deletingId !== null && deletingId !== bill.id}
          >
            Delete
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <div className={classes.wrapper}>
      <div style={{ marginBottom: 24 }}>
        <TextInput
          placeholder="Search by vehicle or name..."
          leftSection={<Search size={16} />}
          value={searchInput}
          onChange={(e) => handleSearchInput(e.currentTarget.value)}
          mb="md"
        />

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
                <Table.Th>Bill #</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Customer Name</Table.Th>
                <Table.Th>Vehicle</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Payment Status</Table.Th>
                <Table.Th>Verified</Table.Th>
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
    </div>
  )
}
