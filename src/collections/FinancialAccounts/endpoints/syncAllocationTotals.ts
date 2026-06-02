import { hasUpdatePermission } from '@/utilities/getRolePermissions'
import type { Endpoint } from 'payload'
import type { User } from 'payload-types'

export const syncAllocationTotalsEndpoint: Endpoint = {
  path: '/sync-allocation-totals',
  method: 'post',
  handler: async (req) => {
    const user = req.user as User | undefined

    if (!user || !hasUpdatePermission(user, 'financial-accounts')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
      const body = req.json ? await req.json() : {}
      const financialAccountId = String(body?.financialAccountId || '').trim()

      if (!financialAccountId) {
        return Response.json({ error: 'Missing financialAccountId.' }, { status: 400 })
      }

      let allocationFunds = 0
      let allocatedFunds = 0

      let page = 1
      const limit = 1000
      let hasNextPage = true

      while (hasNextPage) {
        const transactions = await req.payload.find({
          collection: 'transactions',
          where: {
            financialAccount: {
              equals: financialAccountId,
            },
          },
          page,
          limit,
          depth: 0,
          overrideAccess: true,
        })

        for (const doc of transactions.docs as any[]) {
          const amount =
            typeof doc.amount === 'number' && Number.isFinite(doc.amount) && doc.amount > 0
              ? doc.amount
              : 0
          const fee =
            typeof doc.transactionFee === 'number' &&
            Number.isFinite(doc.transactionFee) &&
            doc.transactionFee > 0
              ? doc.transactionFee
              : 0
          const total = amount + fee

          if (total <= 0) continue

          if (doc.isForAllocation === true) {
            allocationFunds += total
          }

          if (doc.isAllocatedFund === true) {
            allocatedFunds += total
          }
        }

        hasNextPage = transactions.hasNextPage
        page += 1
      }

      await req.payload.update({
        collection: 'financial-accounts',
        id: financialAccountId,
        data: {
          allocationFunds,
          allocatedFunds,
        },
        depth: 0,
        overrideAccess: true,
      })

      return Response.json({
        success: true,
        allocationFunds,
        allocatedFunds,
      })
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to sync financial account allocation totals.',
        },
        { status: 500 },
      )
    }
  },
}
