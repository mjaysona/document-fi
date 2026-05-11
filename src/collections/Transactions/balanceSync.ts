import type { PayloadRequest } from 'payload'

type AccountRecord = {
  startingBalance?: number | null
  currentBalance?: number | null
}

type TransactionRecord = {
  id: string | number
  amount?: number | null
  transactionFee?: number | null
  transactionType?: string | null
  transactionStatus?: string | null
  runningBalance?: number | null
}

type MaybeRelationship = string | { id?: string | number } | null | undefined

function getRelationshipId(value: MaybeRelationship): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value.id === 'string') return value.id
  if (typeof value.id === 'number') return String(value.id)

  const candidate = value as { _id?: unknown; toString?: () => string }
  if (typeof candidate._id === 'string') return candidate._id
  if (typeof candidate._id === 'number') return String(candidate._id)
  if (
    candidate._id &&
    typeof (candidate._id as { toString?: () => string }).toString === 'function'
  ) {
    const stringified = (candidate._id as { toString: () => string }).toString()
    if (stringified && stringified !== '[object Object]') return stringified
  }

  if (typeof candidate.toString === 'function') {
    const stringified = candidate.toString()
    if (stringified && stringified !== '[object Object]') return stringified
  }

  return null
}

function getSignedAmount(transaction: TransactionRecord): number {
  if (transaction.transactionStatus !== 'completed') return 0

  const rawAmount =
    typeof transaction.amount === 'number' ? transaction.amount : Number(transaction.amount || 0)
  const rawFee =
    typeof transaction.transactionFee === 'number'
      ? transaction.transactionFee
      : Number(transaction.transactionFee || 0)

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 0
  const safeFee = Number.isFinite(rawFee) && rawFee > 0 ? rawFee : 0
  const totalImpact = rawAmount + safeFee

  return transaction.transactionType === 'debit' ? totalImpact : -totalImpact
}

export async function syncAccountBalances(args: {
  req: PayloadRequest
  accountIds: Array<string | null | undefined>
}) {
  const uniqueIds = [...new Set(args.accountIds.filter((value): value is string => Boolean(value)))]
  if (uniqueIds.length === 0) return

  const req = args.req
  req.context = {
    ...(req.context || {}),
    skipTransactionBalanceSync: true,
  }

  for (const accountId of uniqueIds) {
    let account: AccountRecord
    try {
      account = (await req.payload.findByID({
        collection: 'financial-accounts',
        id: accountId,
        depth: 0,
        overrideAccess: true,
        req,
      })) as AccountRecord
    } catch (error) {
      const status =
        typeof error === 'object' && error && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : undefined

      // If an account no longer exists, skip it so transaction updates don't fail.
      if (status === 404) {
        continue
      }

      throw error
    }

    const transactions = await req.payload.find({
      collection: 'transactions',
      where: {
        financialAccount: {
          equals: accountId,
        },
      },
      depth: 0,
      limit: 1000,
      sort: 'transactionDate',
      overrideAccess: true,
      req,
    })

    let runningBalance =
      typeof account.startingBalance === 'number'
        ? account.startingBalance
        : Number(account.startingBalance || 0)

    for (const transaction of transactions.docs as Array<TransactionRecord>) {
      const nextRunningBalance =
        transaction.transactionStatus === 'completed'
          ? runningBalance + getSignedAmount(transaction)
          : null

      if ((transaction.runningBalance ?? null) !== nextRunningBalance) {
        await req.payload.update({
          collection: 'transactions',
          id: String(transaction.id),
          data: {
            runningBalance: nextRunningBalance,
          },
          depth: 0,
          overrideAccess: true,
          req,
          context: req.context,
        })
      }

      if (transaction.transactionStatus === 'completed' && nextRunningBalance !== null) {
        runningBalance = nextRunningBalance
      }
    }

    const nextCurrentBalance = Number.isFinite(runningBalance) ? runningBalance : 0
    if (account.currentBalance !== nextCurrentBalance) {
      await req.payload.update({
        collection: 'financial-accounts',
        id: accountId,
        data: {
          currentBalance: nextCurrentBalance,
        },
        depth: 0,
        overrideAccess: true,
        req,
        context: req.context,
      })
    }
  }
}

export function getAffectedAccountIds(args: {
  doc?: Record<string, unknown>
  previousDoc?: Record<string, unknown>
}) {
  return [
    getRelationshipId(args.doc?.financialAccount as MaybeRelationship),
    getRelationshipId(args.previousDoc?.financialAccount as MaybeRelationship),
  ]
}
