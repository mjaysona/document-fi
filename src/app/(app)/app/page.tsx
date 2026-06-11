import PageClient from '@/app/(app)/app/page.client'
import { getFinancialAccountsList } from './financial-accounts/actions'
import { getTransactions } from './records/transactions/actions'

export default async function Page() {
  const [transactionsResult, accountsResult] = await Promise.all([
    getTransactions(),
    getFinancialAccountsList(),
  ])

  const recentTransactions = (transactionsResult.success ? transactionsResult.data : []).slice(0, 5)
  const recentAccounts = (accountsResult.success ? accountsResult.data : []).slice(0, 3)

  return <PageClient recentTransactions={recentTransactions} recentAccounts={recentAccounts} />
}
