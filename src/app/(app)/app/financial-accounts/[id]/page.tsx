'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Alert,
  ActionIcon,
  Badge,
  Button,
  Card,
  Chip,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  deleteFinancialAccount,
  getFinancialAccountById,
  setFinancialAccountDefault,
  getFinancialAccountTransactions,
  getFinancialAccountStatsByPeriod,
  type FinancialAccountDetail,
  type Transaction,
  type PeriodStats,
} from '../actions'
import {
  ArrowLeft,
  Landmark,
  TrendingUp,
  TrendingDown,
  Clock,
  MoveUpRight,
  MoveDownRight,
  ArrowLeftRight,
} from 'lucide-react'
import FinancialChart from './FinancialChart'
import classes from '../page.module.css'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'

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
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Shared period selection for all metrics
  const [selectedPeriod, setSelectedPeriod] = useState<1 | 7 | 30 | 60>(30)
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Chart time period
  const [chartTimePeriod, setChartTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    'daily',
  )

  useEffect(() => {
    const load = async () => {
      const result = await getFinancialAccountById(id)
      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load financial account.')
        setIsLoading(false)
        return
      }

      setAccount(result.data)

      // Fetch transactions
      const transactionsResult = await getFinancialAccountTransactions(id)
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data)
      }

      setIsLoading(false)
    }

    void load()
  }, [id])

  // Fetch stats when period changes
  useEffect(() => {
    const fetchStats = async () => {
      if (!account) return
      setIsLoadingStats(true)

      const result = await getFinancialAccountStatsByPeriod(id, selectedPeriod)
      if (result.success && result.data) {
        setStats(result.data)
      }

      setIsLoadingStats(false)
    }

    void fetchStats()
  }, [id, selectedPeriod, account])

  if (isLoading) {
    return <Text c="dimmed">Loading financial account...</Text>
  }

  // Use percentage values from stats
  const percentageChanges = {
    profit: stats?.profitPercent ?? 0,
    moneyIn: stats?.moneyInPercent ?? 0,
    moneyOut: stats?.moneyOutPercent ?? 0,
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
          <Button variant="light" onClick={() => router.push('/app/records/transactions/add')}>
            Add Transaction
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

      {/* Shared Period Selection */}
      <Paper withBorder p="md" radius="md">
        {stats && (
          <Group justify="space-between" align="center" mb="md">
            <Title order={5} fw={700}>
              Overview
            </Title>
            <Group gap="xs">
              <Chip.Group
                value={String(selectedPeriod)}
                onChange={(val) => setSelectedPeriod(Number(val) as 1 | 7 | 30 | 60)}
              >
                <Group gap="xs">
                  <Chip value="1" size="sm">
                    Day
                  </Chip>
                  <Chip value="7" size="sm">
                    7d
                  </Chip>
                  <Chip value="30" size="sm">
                    30d
                  </Chip>
                  <Chip value="60" size="sm">
                    60d
                  </Chip>
                </Group>
              </Chip.Group>
            </Group>
          </Group>
        )}

        {/* Stats Cards - 2 Column Layout */}
        {stats && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {/* Total Profit */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>
                    Total Profit
                  </Text>
                  <Text fw={700} fz="xl" mt="xs">
                    {formatCurrency(stats.profit)}
                  </Text>
                </div>
                <ThemeIcon
                  color="gray"
                  variant="light"
                  style={{
                    color:
                      stats.profit >= 0
                        ? 'var(--mantine-color-teal-6)'
                        : 'var(--mantine-color-red-6)',
                  }}
                  size={38}
                  radius="md"
                >
                  {stats.profit >= 0 ? (
                    <TrendingUp size={28} strokeWidth={1.5} />
                  ) : (
                    <TrendingDown size={28} strokeWidth={1.5} />
                  )}
                </ThemeIcon>
              </Group>
              <Group align="center" gap="xs">
                {stats.profitPercent !== null ? (
                  <>
                    <Text c={percentageChanges.profit >= 0 ? 'teal' : 'red'} fw={500} size="sm">
                      {percentageChanges.profit >= 0 ? '+' : ''}
                      {percentageChanges.profit.toFixed(2)}%
                    </Text>
                    <Text c="dimmed" size="xs">
                      {percentageChanges.profit >= 0 ? 'increase' : 'decrease'} from last{' '}
                      {selectedPeriod} day{selectedPeriod > 1 ? 's' : ''}
                    </Text>
                  </>
                ) : (
                  <Text c="dimmed" size="xs">
                    No transactions to compare to
                  </Text>
                )}
              </Group>
            </Paper>

            {/* Money In */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>
                    Money In
                  </Text>
                  <Text fw={700} fz="xl" mt="xs">
                    {formatCurrency(stats.moneyIn)}
                  </Text>
                </div>
                <ThemeIcon
                  color="gray"
                  variant="light"
                  style={{
                    color: 'var(--mantine-color-teal-6)',
                  }}
                  size={38}
                  radius="md"
                >
                  <MoveUpRight size={28} strokeWidth={1.5} />
                </ThemeIcon>
              </Group>
              <Group align="center" gap="xs">
                {stats.moneyInPercent !== null ? (
                  <>
                    <Text c={percentageChanges.moneyIn >= 0 ? 'teal' : 'red'} fw={500} size="sm">
                      {percentageChanges.moneyIn >= 0 ? '+' : ''}
                      {percentageChanges.moneyIn.toFixed(2)}%
                    </Text>
                    <Text c="dimmed" size="xs">
                      {percentageChanges.moneyIn >= 0 ? 'increase' : 'decrease'} from last{' '}
                      {selectedPeriod} day{selectedPeriod > 1 ? 's' : ''}
                    </Text>
                  </>
                ) : (
                  <Text c="dimmed" size="xs">
                    No transactions to compare to
                  </Text>
                )}
              </Group>
            </Paper>

            {/* Money Out */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>
                    Money Out
                  </Text>
                  <Text fw={700} fz="xl" mt="xs">
                    {formatCurrency(stats.moneyOut)}
                  </Text>
                </div>
                <ThemeIcon
                  color="gray"
                  variant="light"
                  style={{
                    color: 'var(--mantine-color-red-6)',
                  }}
                  size={38}
                  radius="md"
                >
                  <MoveDownRight size={28} strokeWidth={1.5} />
                </ThemeIcon>
              </Group>
              <Group align="center" gap="xs">
                {stats.moneyOutPercent !== null ? (
                  <>
                    <Text c={percentageChanges.moneyOut >= 0 ? 'teal' : 'red'} fw={500} size="sm">
                      {percentageChanges.moneyOut >= 0 ? '+' : ''}
                      {percentageChanges.moneyOut.toFixed(2)}%
                    </Text>
                    <Text c="dimmed" size="xs">
                      {percentageChanges.moneyOut >= 0 ? 'increase' : 'decrease'} from last{' '}
                      {selectedPeriod} day{selectedPeriod > 1 ? 's' : ''}
                    </Text>
                  </>
                ) : (
                  <Text c="dimmed" size="xs">
                    No transactions to compare to
                  </Text>
                )}
              </Group>
            </Paper>

            {/* Transaction Count */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Text size="xs" c="dimmed" fw={700}>
                    Transactions
                  </Text>
                  <Text fw={700} fz="xl" mt="xs">
                    {stats.transactionCount}
                  </Text>
                </div>
                <ThemeIcon
                  color="gray"
                  variant="light"
                  style={{
                    color: 'var(--mantine-color-blue-6)',
                  }}
                  size={38}
                  radius="md"
                >
                  <ArrowLeftRight size={28} strokeWidth={1.5} />
                </ThemeIcon>
              </Group>
              <Group align="center" gap="xs">
                <Text c="dimmed" size="xs">
                  in the last {selectedPeriod} day{selectedPeriod > 1 ? 's' : ''}
                </Text>
              </Group>
            </Paper>
          </SimpleGrid>
        )}
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="center" mb="md">
          <Title order={5} fw={700}>
            Trends
          </Title>
          <Group gap="xs">
            <Chip.Group
              value={chartTimePeriod}
              onChange={(val) =>
                setChartTimePeriod(val as 'daily' | 'weekly' | 'monthly' | 'yearly')
              }
            >
              <Group gap="xs">
                <Chip value="daily" size="sm">
                  Daily
                </Chip>
                <Chip value="weekly" size="sm">
                  Weekly
                </Chip>
                <Chip value="monthly" size="sm">
                  Monthly
                </Chip>
                <Chip value="yearly" size="sm">
                  Yearly
                </Chip>
              </Group>
            </Chip.Group>
          </Group>
        </Group>
        <FinancialChart transactions={transactions} timePeriod={chartTimePeriod} />
      </Paper>
    </Stack>
  )
}
