'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { ArrowDownRight, ArrowUpRight, Landmark } from 'lucide-react'
import {
  getFinancialAccountsList,
  setFinancialAccountDefault,
  type FinancialAccountDetail,
} from './actions'
import classes from './page.module.css'

type AccountStat = {
  id: string
  title: string
  value: string
  diff: number
  isDefault: boolean
}

function formatCurrency(value?: number): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

function toDiffPercent(startingBalance?: number, currentBalance?: number): number {
  const start =
    typeof startingBalance === 'number' && Number.isFinite(startingBalance) ? startingBalance : 0
  const current =
    typeof currentBalance === 'number' && Number.isFinite(currentBalance) ? currentBalance : 0

  if (start === 0) {
    return current === 0 ? 0 : 100
  }

  return Math.round(((current - start) / Math.abs(start)) * 100)
}

export default function FinancialAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<FinancialAccountDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const result = await getFinancialAccountsList()
      if (result.success) {
        setAccounts(result.data)
      }
      setIsLoading(false)
    }

    void load()
  }, [])

  const stats = useMemo<AccountStat[]>(() => {
    return accounts.map((account) => ({
      id: account.id,
      title: account.name,
      value: formatCurrency(account.currentBalance),
      diff: toDiffPercent(account.startingBalance, account.currentBalance),
      isDefault: account.isDefault,
    }))
  }, [accounts])

  const goToCreate = () => {
    router.push('/app/financial-accounts/create')
  }

  if (isLoading) {
    return (
      <div>
        <Text c="dimmed">Loading financial accounts...</Text>
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <div>
        <Paper withBorder p="xl" radius="md" className={classes.emptyState}>
          <Stack gap="md" align="center">
            <Text fw={700}>No financial accounts yet</Text>
            <Text size="sm" c="dimmed">
              Create your first financial account to start tracking balances and transactions.
            </Text>
            <Button onClick={goToCreate}>Create Financial Account</Button>
          </Stack>
        </Paper>
      </div>
    )
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text fw={700}>Financial Accounts</Text>
        <Button variant="light" onClick={goToCreate}>
          New Financial Account
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        {stats.map((stat) => {
          const DiffIcon = stat.diff > 0 ? ArrowUpRight : ArrowDownRight

          return (
            <Paper
              withBorder
              p="md"
              radius="md"
              key={stat.id}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/app/financial-accounts/${stat.id}`)}
            >
              <Group justify="space-between">
                <Text size="xs" c="dimmed" className={classes.title}>
                  {stat.title}
                </Text>
                <Group gap="xs">
                  {stat.isDefault ? (
                    <Badge color="teal" variant="light" size="sm">
                      Default
                    </Badge>
                  ) : (
                    <Badge
                      color="blue"
                      variant="outline"
                      size="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={async (event) => {
                        event.stopPropagation()
                        const result = await setFinancialAccountDefault(stat.id, true)
                        if (!result.success) return

                        setAccounts((current) =>
                          current.map((account) => ({
                            ...account,
                            isDefault: account.id === stat.id,
                          })),
                        )
                      }}
                    >
                      Set as default
                    </Badge>
                  )}
                  <Landmark className={classes.icon} size={22} strokeWidth={1.5} />
                </Group>
              </Group>

              <Group align="flex-end" gap="xs" mt={25}>
                <Text className={classes.value}>{stat.value}</Text>
                <Text c={stat.diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={classes.diff}>
                  <span>{Math.abs(stat.diff)}%</span>
                  <DiffIcon size={16} strokeWidth={1.5} />
                </Text>
              </Group>

              <Text fz="xs" c="dimmed" mt={7}>
                Compared to starting balance
              </Text>
            </Paper>
          )
        })}
      </SimpleGrid>
    </div>
  )
}
