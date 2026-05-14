'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Group, Stack, Switch, Text, Title } from '@mantine/core'
import {
  deleteFinancialAccount,
  getFinancialAccountById,
  setFinancialAccountDefault,
  type FinancialAccountDetail,
} from '../actions'

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
      <Group justify="space-between" align="center">
        <Title order={4}>{account.name}</Title>
        <Group gap="xs">
          <Button
            variant="light"
            onClick={() =>
              router.push(
                `/app/records/transactions?financialAccount=${encodeURIComponent(account.name)}&financialAccountId=${encodeURIComponent(account.id)}`,
              )
            }
          >
            View Transactions
          </Button>
          <Button onClick={() => router.push(`/app/financial-accounts/edit?id=${account.id}`)}>
            Edit
          </Button>
        </Group>
      </Group>

      {feedback && (
        <Alert color="red" title="Notice">
          {feedback}
        </Alert>
      )}

      <Card withBorder radius="md">
        <Stack gap="xs">
          <Switch
            label="Set as default account"
            checked={Boolean(account.isDefault)}
            onChange={async (event) => {
              setFeedback(null)
              setIsUpdatingDefault(true)

              const nextValue = event.currentTarget.checked
              const result = await setFinancialAccountDefault(account.id, nextValue)

              if (!result.success) {
                setFeedback(result.error || 'Failed to update default account.')
              } else {
                setAccount((current) => (current ? { ...current, isDefault: nextValue } : current))
              }

              setIsUpdatingDefault(false)
            }}
            disabled={isUpdatingDefault || isDeleting}
          />

          <Text>
            <Text span fw={700}>
              Name:
            </Text>{' '}
            {account.name}
          </Text>
          <Text>
            <Text span fw={700}>
              Bank:
            </Text>{' '}
            {account.bankName || '-'}
          </Text>
          <Text>
            <Text span fw={700}>
              Starting Balance:
            </Text>{' '}
            {formatCurrency(account.startingBalance)}
          </Text>
          <Text>
            <Text span fw={700}>
              Current Balance:
            </Text>{' '}
            {formatCurrency(account.currentBalance)}
          </Text>

          <Group justify="flex-end" mt="md">
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
        </Stack>
      </Card>
    </Stack>
  )
}
