'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Alert, Button, Group, Modal, Text, TextInput } from '@mantine/core'
import { CircleCheck, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/(app)/components/ui/DataTable'
import { deleteTransaction, getTransactions, type TransactionListItem } from './actions'
import classes from '../page.module.scss'

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
}

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

export default function TransactionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<TransactionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
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

  const displayed = useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) return items

    return items.filter((item) => {
      return (
        item.description.toLowerCase().includes(query) ||
        (item.sourceAccountName ?? '').toLowerCase().includes(query) ||
        (item.destinationAccountName ?? '').toLowerCase().includes(query) ||
        (item.transactionType ?? '').toLowerCase().includes(query) ||
        (item.transactionStatus ?? '').toLowerCase().includes(query)
      )
    })
  }, [items, search])

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return

    setDeletingId(deleteTargetId)
    setDeleteConfirmOpen(false)
    const result = await deleteTransaction(deleteTargetId)
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== deleteTargetId))
      setFeedback({ tone: 'success', message: 'Transaction deleted.' })
    } else {
      setFeedback({ tone: 'error', message: result.error ?? 'Failed to delete transaction.' })
    }

    setDeletingId(null)
    setDeleteTargetId(null)
  }

  const columns: DataTableColumn<TransactionListItem>[] = [
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <span
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => router.push(`/app/records/transactions/${row.id}/edit`)}
        >
          {row.description}
        </span>
      ),
    },
    { key: 'sourceAccountName', label: 'Source', render: (row) => row.sourceAccountName || '-' },
    {
      key: 'destinationAccountName',
      label: 'Destination',
      render: (row) => row.destinationAccountName || '-',
    },
    { key: 'transactionDate', label: 'Date', render: (row) => formatDate(row.transactionDate) },
    { key: 'transactionType', label: 'Type', render: (row) => row.transactionType || '-' },
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
      render: (row) => row.transactionStatus || '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 90,
      render: (row) => (
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            size="sm"
            title="Edit"
            onClick={() => router.push(`/app/records/transactions/${row.id}/edit`)}
          >
            <Pencil size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            title="Delete"
            loading={deletingId === row.id}
            onClick={() => {
              setDeleteTargetId(row.id)
              setDeleteConfirmOpen(true)
            }}
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
            placeholder="Search by description, account, type, or status..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
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
          Delete this transaction? This cannot be undone.
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
          <Button color="red" onClick={handleDeleteConfirm} loading={Boolean(deletingId)}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
