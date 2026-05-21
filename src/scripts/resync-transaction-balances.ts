import { getPayload } from 'payload'
import config from '@payload-config'
import { syncAccountBalances } from '@/collections/Transactions/balanceSync'

async function getAllFinancialAccountIds() {
  const payload = await getPayload({ config })
  const ids: string[] = []
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'financial-accounts',
      depth: 0,
      limit: 200,
      page,
      overrideAccess: true,
    })

    ids.push(...result.docs.map((doc) => String(doc.id)))

    const currentPage = Number(result.page || 1)
    const totalPages = Number(result.totalPages || 1)
    if (currentPage >= totalPages) {
      break
    }

    page = currentPage + 1
  }

  return ids
}

async function run() {
  const payload = await getPayload({ config })
  const accountIds = await getAllFinancialAccountIds()

  if (accountIds.length === 0) {
    console.info('No financial accounts found. Nothing to resync.')
    process.exit(0)
  }

  console.info(`Starting one-time balance resync for ${accountIds.length} financial accounts...`)

  const req = {
    payload,
    context: {},
  } as any

  await syncAccountBalances({
    req,
    accountIds,
  })

  console.info(`Balance resync complete for ${accountIds.length} financial accounts.`)
  process.exit(0)
}

run().catch((error) => {
  console.error('Balance resync failed:', error)
  process.exit(1)
})
