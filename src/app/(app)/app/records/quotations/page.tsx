'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { CircleCheck, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { getQuotes, deleteQuote, deleteQuotes, type QuoteListItem } from './actions'
import { DataTable, type DataTableColumn } from '@/app/(app)/components/ui/DataTable'
import classes from '../page.module.scss'

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
}

type SortBy = 'name' | 'createdAt'
type SortOrder = 'asc' | 'desc'

const DEBOUNCE_DELAY = 300

const formatDate = (value: string): string => {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function QuotationsPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const result = await getQuotes()
      if (result.success) {
        setQuotes(result.data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(value.toLowerCase().trim()), DEBOUNCE_DELAY)
  }

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    setDeletingId(deleteTargetId)
    setDeleteConfirmOpen(false)
    const result = await deleteQuote(deleteTargetId)
    if (result.success) {
      setQuotes((prev) => prev.filter((q) => q.id !== deleteTargetId))
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetId))
      setFeedback({ tone: 'success', message: 'Quote deleted.' })
    } else {
      setFeedback({ tone: 'error', message: result.error ?? 'Failed to delete quote.' })
    }
    setDeletingId(null)
    setDeleteTargetId(null)
  }

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return
    setIsBulkDeleting(true)
    setBulkDeleteConfirmOpen(false)
    const result = await deleteQuotes(selectedIds)
    if (result.success) {
      setQuotes((prev) => prev.filter((q) => !selectedIds.includes(q.id)))
      setSelectedIds([])
      setFeedback({ tone: 'success', message: `${selectedIds.length} quote(s) deleted.` })
    } else {
      setFeedback({ tone: 'error', message: result.error ?? 'Failed to delete quotes.' })
    }
    setIsBulkDeleting(false)
  }

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? displayed.map((q) => q.id) : [])
  }

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
    )
  }

  // Client-side filter + sort (no pagination needed at MVP scale)
  const displayed = quotes
    .filter((q) => {
      if (!search) return true
      return (
        q.name.toLowerCase().includes(search) ||
        (q.clientName ?? '').toLowerCase().includes(search) ||
        (q.clientEmail ?? '').toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      const aVal = sortBy === 'name' ? a.name : a.createdAt
      const bVal = sortBy === 'name' ? b.name : b.createdAt
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })

  const columns: DataTableColumn<QuoteListItem>[] = [
    { key: 'name', label: 'Name' },
    { key: 'clientName', label: 'Client', render: (row) => row.clientName || '-' },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      width: 120,
      render: (row) => (
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            size="sm"
            title="Preview"
            onClick={() => router.push(`/app/records/quotations/${row.id}/preview`)}
          >
            <Eye size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            title="Edit"
            onClick={() => router.push(`/app/records/quotations/${row.id}/edit`)}
          >
            <Pencil size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            title="Delete"
            loading={deletingId === row.id}
            onClick={() => handleDeleteClick(row.id)}
          >
            <Trash2 size={14} />
          </ActionIcon>
        </Group>
      ),
    },
  ]

  return (
    <div className={classes.wrapper}>
      <div style={{ marginBottom: 24 }}>
        <Group mb="md" gap="xs" align="center">
          <TextInput
            placeholder="Search by name or client…"
            leftSection={<Search size={16} />}
            value={searchInput}
            onChange={(e) => handleSearchInput(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant={sortBy === 'name' ? 'light' : 'default'}
            size="sm"
            onClick={() => toggleSort('name')}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'createdAt' ? 'light' : 'default'}
            size="sm"
            onClick={() => toggleSort('createdAt')}
          >
            Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </Group>
        <Group justify="space-between">
          <Button
            variant="light"
            color="red"
            size="sm"
            onClick={() => setBulkDeleteConfirmOpen(true)}
            disabled={selectedIds.length === 0}
            loading={isBulkDeleting}
          >
            Delete selected ({selectedIds.length})
          </Button>
          <Button
            variant="filled"
            size="sm"
            leftSection={<Plus size={14} />}
            onClick={() => router.push('/app/records/quotations/add')}
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
        loadingText="Loading quotations…"
        emptyText="No quotations found."
        selectedIds={selectedIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectRow={handleToggleSelectRow}
      />

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeleteTargetId(null)
        }}
        title="Confirm deletion"
        centered
      >
        <Text size="sm" mb="lg">
          Delete this quotation? This cannot be undone.
        </Text>
        <Group justify="end" gap="sm">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeleteTargetId(null)
            }}
          >
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={deletingId !== null}>
            Delete
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title="Confirm deletion"
        centered
      >
        <Text size="sm" mb="lg">
          Delete {selectedIds.length} selected quotation(s)? This cannot be undone.
        </Text>
        <Group justify="end" gap="sm">
          <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleBulkDeleteConfirm} loading={isBulkDeleting}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
