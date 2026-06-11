'use client'

import { useAuth } from '@/app/providers/Auth'
import { Badge, Box, Button, Grid, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { useRouter } from 'next/navigation'

type DashboardTransactionItem = {
  id: string
  description: string
  amount?: number
  transactionDate?: string
  financialAccountName?: string
  referenceNumber?: string
  transactionType?: 'debit' | 'credit'
}

type DashboardAccountItem = {
  id: string
  name: string
  currentBalance?: number
  bankName?: string
}

type PageClientProps = {
  recentTransactions: DashboardTransactionItem[]
  recentAccounts: DashboardAccountItem[]
}

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : '—'

const PageClient: React.FC<PageClientProps> = ({ recentTransactions, recentAccounts }) => {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <>
      <Title order={1} mb="md">
        {user?.isFresh ? 'Welcome' : 'Hello'}, {user?.name || user?.email} 👋
      </Title>
      <Text>{user?.isFresh ? "Let's get you started!" : 'We got everything ready for you!'}</Text>
      <Grid mt="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md" key="someTitle">
            <Box>
              <Text
                span
                size="xs"
                c="blue"
                fw={700}
                tt="uppercase"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push('/app/records/transactions')}
              >
                Transactions
              </Text>
            </Box>
            <Box mt="sm">
              <Stack gap="xs">
                {recentTransactions.length > 0 ? (
                  <Table horizontalSpacing="xs" highlightOnHover>
                    <Table.Thead style={{ verticalAlign: 'top' }}>
                      <Table.Tr>
                        <Table.Th>
                          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                            Date
                          </Text>
                        </Table.Th>
                        <Table.Th>
                          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                            Reference #
                          </Text>
                        </Table.Th>
                        <Table.Th>
                          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                            Type
                          </Text>
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody style={{ verticalAlign: 'top' }}>
                      {recentTransactions.map((transaction) => (
                        <Table.Tr
                          key={transaction.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push('/app/records/transactions')}
                        >
                          <Table.Td>
                            <Text size="xs">
                              {transaction.transactionDate
                                ? new Date(transaction.transactionDate).toLocaleDateString()
                                : '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{transaction.referenceNumber || '—'}</Text>
                          </Table.Td>
                          <Table.Td>
                            {transaction.transactionType ? (
                              <Badge
                                color={transaction.transactionType === 'debit' ? 'blue' : 'grape'}
                                variant="light"
                                size="xs"
                              >
                                {transaction.transactionType}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed">
                    No transactions yet.
                  </Text>
                )}
              </Stack>
            </Box>
            <Button mt="sm" variant="light" size="sm">
              View all transactions
            </Button>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md" key="someTitle2">
            <Box>
              <Text
                span
                size="xs"
                c="blue"
                fw={700}
                tt="uppercase"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push('/app/financial-accounts')}
              >
                Accounts
              </Text>
            </Box>
            <Box mt="sm">
              {recentAccounts.length > 0 ? (
                <Table horizontalSpacing="xs" highlightOnHover>
                  <Table.Thead style={{ verticalAlign: 'top' }}>
                    <Table.Tr>
                      <Table.Th>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Name
                        </Text>
                      </Table.Th>
                      <Table.Th>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Current Balance
                        </Text>
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody style={{ verticalAlign: 'top' }}>
                    {recentAccounts.map((account) => (
                      <Table.Tr
                        key={account.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/app/financial-accounts/${account.id}`)}
                      >
                        <Table.Td>
                          {' '}
                          <Text size="xs">{account.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{formatCurrency(account.currentBalance)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text size="sm" c="dimmed">
                  No accounts yet.
                </Text>
              )}
            </Box>
            <Button mt="sm" variant="light" size="sm">
              View all accounts
            </Button>
          </Paper>
        </Grid.Col>
      </Grid>
    </>
  )
}

export default PageClient
