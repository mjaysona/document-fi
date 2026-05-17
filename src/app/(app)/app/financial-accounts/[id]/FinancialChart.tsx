'use client'

import { useState, useMemo } from 'react'
import { Card, Tabs, Stack, Text, Center } from '@mantine/core'
import { LineChart } from '@mantine/charts'

interface Transaction {
  transactionDate: string
  transactionType: 'debit' | 'credit'
  amount: number
}

interface FinancialChartProps {
  transactions?: Transaction[]
  timePeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function FinancialChart({
  transactions = [],
  timePeriod = 'daily',
}: FinancialChartProps) {
  const [activeTab, setActiveTab] = useState<string | null>('profit')

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    // Group transactions by period and calculate totals
    const aggregated: Record<string, { credit: number; debit: number }> = {}

    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate)
      let key: string

      switch (timePeriod) {
        case 'daily':
          key = date.toISOString().split('T')[0]
          break
        case 'weekly':
          // Get start of week (Monday)
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1))
          key = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'yearly':
          key = `${date.getFullYear()}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!aggregated[key]) {
        aggregated[key] = { credit: 0, debit: 0 }
      }
      if (tx.transactionType === 'credit') {
        aggregated[key].credit += tx.amount
      } else {
        aggregated[key].debit += tx.amount
      }
    })

    // Convert to chart format and sort by date
    const data = Object.entries(aggregated)
      .map(([key, { credit, debit }]) => ({
        date:
          timePeriod === 'daily'
            ? new Date(key).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
              })
            : timePeriod === 'weekly'
              ? `Week of ${new Date(key).toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                })}`
              : timePeriod === 'monthly'
                ? new Date(`${key}-01`).toLocaleDateString('en-PH', {
                    month: 'short',
                    year: 'numeric',
                  })
                : key,
        moneyIn: credit,
        moneyOut: debit,
        profit: credit - debit,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return data
  }, [transactions, timePeriod])

  if (!chartData.length) {
    return (
      <Card withBorder radius="md">
        <Center p="xl">
          <Text c="dimmed">No transaction data available for this period</Text>
        </Center>
      </Card>
    )
  }

  return (
    <Stack gap="md" w="100%">
      <Tabs value={activeTab} onChange={setActiveTab} w="100%">
        <Tabs.List>
          <Tabs.Tab value="profit">Profit</Tabs.Tab>
          <Tabs.Tab value="moneyIn">Money In</Tabs.Tab>
          <Tabs.Tab value="moneyOut">Money Out</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profit" pt="md" w="100%">
          <LineChart
            h={300}
            w="100%"
            data={chartData}
            dataKey="date"
            series={[{ name: 'profit', label: 'Profit', color: 'blue' }]}
            gridProps={{ yAxisId: 'left' }}
            curveType="linear"
            yAxisProps={{ tickFormatter: (value) => formatCurrency(value as number) }}
            tooltipProps={{
              formatter: (value: any) => formatCurrency(value as number),
            }}
            valueFormatter={(value) => formatCurrency(value as number)}
          />
        </Tabs.Panel>

        <Tabs.Panel value="moneyIn" pt="md" w="100%">
          <LineChart
            h={300}
            w="100%"
            data={chartData}
            dataKey="date"
            series={[{ name: 'moneyIn', label: 'Money In', color: 'green' }]}
            gridProps={{ yAxisId: 'left' }}
            curveType="linear"
            yAxisProps={{ tickFormatter: (value) => formatCurrency(value as number) }}
            tooltipProps={{
              formatter: (value: any) => formatCurrency(value as number),
            }}
            valueFormatter={(value) => formatCurrency(value as number)}
          />
        </Tabs.Panel>

        <Tabs.Panel value="moneyOut" pt="md" w="100%">
          <LineChart
            h={300}
            w="100%"
            data={chartData}
            dataKey="date"
            series={[{ name: 'moneyOut', label: 'Money Out', color: 'red' }]}
            gridProps={{ yAxisId: 'left' }}
            curveType="linear"
            yAxisProps={{ tickFormatter: (value) => formatCurrency(value as number) }}
            tooltipProps={{
              formatter: (value: any) => formatCurrency(value as number),
            }}
            valueFormatter={(value) => formatCurrency(value as number)}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
