'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Alert,
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core'
import {
  deleteFinancialAccount,
  getFinancialAccountById,
  setFinancialAccountDefault,
  type FinancialAccountDetail,
} from '../actions'
import { ArrowLeft, Landmark } from 'lucide-react'
import classes from '../page.module.css'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function FinancialAccountDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [account, setAccount] = useState<FinancialAccountDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const result = await getFinancialAccountById(id)
      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load financial account.')
        setIsLoading(false)
        return
      }

      setAccount(result.data)
      setIsLoading(false)
    }

    void load()
  }, [id])

  if (isLoading) {
    return <Text c="dimmed">Loading financial account...</Text>
  }

  if (error || !account) {
    return (
      <Card withBorder radius="md">
        <Stack gap="sm">
          <Text c="red">{error || 'Financial account not found.'}</Text>
          <Group justify="flex-start">
            <Button variant="default" onClick={() => router.push('/app/financial-accounts')}>
              Back to Financial Accounts
            </Button>
          </Group>
        </Stack>
      </Card>
    )
  }

  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Group justify="space-between" align="flex-start">
        <ActionIcon
          variant="default"
          size="lg"
          radius="sm"
          aria-label="Back"
          onClick={() => router.push('/app/financial-accounts')}
          style={{ flexShrink: 0 }}
        >
          <ArrowLeft size={16} />
        </ActionIcon>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 700,
            marginTop: 'calc(var(--mantine-spacing-xs)/2)',
          }}
        >
          <span style={{ marginRight: 'var(--mantine-spacing-xs)' }}>{account.name}</span>
          {account.isDefault && <Badge style={{ flexShrink: 0 }}>Default</Badge>}
        </div>
        <Group gap="xs" style={{ flexShrink: 0 }}>
          {!account.isDefault && (
            <Button
              variant="outline"
              loading={isUpdatingDefault}
              disabled={isUpdatingDefault || isDeleting}
              onClick={async () => {
                setFeedback(null)
                setIsUpdatingDefault(true)

                const nextValue = !account.isDefault
                const result = await setFinancialAccountDefault(account.id, nextValue)

                if (!result.success) {
                  setFeedback(result.error || 'Failed to update default account.')
                } else {
                  setAccount((current) =>
                    current ? { ...current, isDefault: nextValue } : current,
                  )
                }

                setIsUpdatingDefault(false)
              }}
            >
              Set as Default
            </Button>
          )}
          <Button
            variant="light"
            onClick={() =>
              router.push(
                `/app/records/transactions?financialAccount=${encodeURIComponent(account.name)}&financialAccountId=${encodeURIComponent(account.id)}`,
              )
            }
          >
            View transactions
          </Button>
          <Button
            variant="light"
            onClick={() => router.push(`/app/financial-accounts/edit?id=${account.id}`)}
          >
            Edit
          </Button>

          <Button
            color="red"
            variant="light"
            loading={isDeleting}
            disabled={isUpdatingDefault}
            onClick={async () => {
              const shouldDelete = window.confirm(
                'Delete this financial account? This action cannot be undone.',
              )
              if (!shouldDelete) return

              setFeedback(null)
              setIsDeleting(true)
              const result = await deleteFinancialAccount(account.id)

              if (!result.success) {
                setFeedback(result.error || 'Failed to delete financial account.')
                setIsDeleting(false)
                return
              }

              router.push('/app/financial-accounts')
            }}
          >
            Delete Account
          </Button>
        </Group>
      </Group>
      <Group justify="space-between" align="top">
        <div>
          <Text>Current Balance</Text>
          <Title order={1} fw={700}>
            {formatCurrency(account.currentBalance)}
          </Title>
        </div>
        <Group>
          <div>
            <Text size="xs">Bank account</Text>
            <Text size="sm">{account.bankName || '-'}</Text>
          </div>
          <div>
            <Text size="xs">Starting balance</Text>{' '}
            <Text size="sm">{formatCurrency(account.startingBalance)}</Text>
          </div>
        </Group>
      </Group>

      {feedback && (
        <Alert color="red" title="Notice">
          {feedback}
        </Alert>
      )}
    </Stack>
  )
}
