'use client'

import { useEffect, useState, useRef } from 'react'
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
import { Search } from 'lucide-react'
import { getWeightBills, type WeightBillsQuery } from './actions'
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
  const [weightBills, setWeightBills] = useState<WeightBill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
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
    loadWeightBills({ search, sortBy, sortOrder, page })
  }, [search, sortBy, sortOrder, page])

  const handleEdit = (billId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit bill:', billId)
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
        <Button variant="light" size="sm" onClick={() => handleEdit(bill.id)}>
          Edit
        </Button>
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
