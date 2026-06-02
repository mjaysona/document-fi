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
  currentBalance?: number | null
  runningBalance?: number | null
  transactionDate?: string | null
  createdAt?: string | null
  isAllocatedFund?: boolean | null
  isForAllocation?: boolean | null
  allocatedFundType?: string | null
}

type RecomputeHint = {
  accountId?: string | null
  transactionId?: string
  transactionDate?: string | null
  createdAt?: string | null
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

  const safeAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0
  const safeFee = Number.isFinite(rawFee) && rawFee > 0 ? rawFee : 0
  const totalImpact = safeAmount + safeFee
  if (totalImpact <= 0) return 0

  return transaction.transactionType === 'credit' ? totalImpact : -totalImpact
}

function toSortTime(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

function toSortKey(transaction: TransactionRecord): {
  transactionDate: number
  createdAt: number
  id: string
} {
  return {
    transactionDate: toSortTime(transaction.transactionDate),
    createdAt: toSortTime(transaction.createdAt),
    id: String(transaction.id),
  }
}

function toHintSortKey(hint: RecomputeHint): {
  transactionDate: number
  createdAt: number
  id: string
} {
  return {
    transactionDate: toSortTime(hint.transactionDate),
    createdAt: toSortTime(hint.createdAt),
    id: String(hint.transactionId || ''),
  }
}

function compareSortKeys(
  a: { transactionDate: number; createdAt: number; id: string },
  b: { transactionDate: number; createdAt: number; id: string },
): number {
  if (a.transactionDate !== b.transactionDate) return a.transactionDate - b.transactionDate
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.id.localeCompare(b.id)
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  if ('status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (Number.isFinite(status)) return status
  }

  if ('statusCode' in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode)
    if (Number.isFinite(statusCode)) return statusCode
  }

  return undefined
}

async function getAllAccountTransactions(args: {
  req: PayloadRequest
  accountId: string
}): Promise<Array<TransactionRecord>> {
  const docs: Array<TransactionRecord> = []
  let page = 1

  while (true) {
    const result = await args.req.payload.find({
      collection: 'transactions',
      where: {
        financialAccount: {
          equals: args.accountId,
        },
      },
      depth: 0,
      limit: 200,
      page,
      sort: 'transactionDate',
      overrideAccess: true,
      req: args.req,
    })

    docs.push(...(result.docs as Array<TransactionRecord>))

    const currentPage = Number(result.page || 1)
    const totalPages = Number(result.totalPages || 1)
    if (currentPage >= totalPages) {
      break
    }

    page = currentPage + 1
  }

  return docs
}

function getRecomputeStartIndex(args: {
  sortedTransactions: Array<TransactionRecord>
  accountId: string
  changedTransactionId?: string
  recomputeHints?: Array<RecomputeHint>
}): number {
  const candidateIndices: number[] = []

  if (args.changedTransactionId) {
    const changedIndex = args.sortedTransactions.findIndex(
      (transaction) => String(transaction.id) === args.changedTransactionId,
    )
    if (changedIndex >= 0) candidateIndices.push(changedIndex)
  }

  const accountHints = (args.recomputeHints || []).filter(
    (hint) => hint.accountId && hint.accountId === args.accountId,
  )

  for (const hint of accountHints) {
    if (hint.transactionId) {
      const exactIndex = args.sortedTransactions.findIndex(
        (transaction) => String(transaction.id) === hint.transactionId,
      )
      if (exactIndex >= 0) {
        candidateIndices.push(exactIndex)
      }
    }

    const hintKey = toHintSortKey(hint)
    const insertionIndex = args.sortedTransactions.findIndex(
      (transaction) => compareSortKeys(toSortKey(transaction), hintKey) >= 0,
    )

    if (insertionIndex >= 0) {
      candidateIndices.push(insertionIndex)
    } else {
      candidateIndices.push(args.sortedTransactions.length)
    }
  }

  if (candidateIndices.length === 0) {
    return 0
  }

  return Math.min(...candidateIndices)
}

export async function syncAccountBalances(args: {
  req: PayloadRequest
  accountIds: Array<string | null | undefined>
  changedTransactionId?: string
  recomputeHints?: Array<RecomputeHint>
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
      const status = getErrorStatusCode(error)

      // If an account no longer exists, skip it so transaction updates don't fail.
      if (status === 404) {
        continue
      }

      throw error
    }

    const sortedTransactions = (
      await getAllAccountTransactions({
        req,
        accountId,
      })
    ).sort((a, b) => compareSortKeys(toSortKey(a), toSortKey(b)))

    let recomputeStartIndex = getRecomputeStartIndex({
      sortedTransactions,
      accountId,
      changedTransactionId: args.changedTransactionId,
      recomputeHints: args.recomputeHints,
    })

    let runningBalance =
      typeof account.startingBalance === 'number'
        ? account.startingBalance
        : Number(account.startingBalance || 0)

    if (recomputeStartIndex > 0) {
      const previousTransaction = sortedTransactions[recomputeStartIndex - 1]
      if (typeof previousTransaction?.runningBalance === 'number') {
        runningBalance = previousTransaction.runningBalance
      } else {
        recomputeStartIndex = 0
      }
    }

    for (let index = recomputeStartIndex; index < sortedTransactions.length; index += 1) {
      const transaction = sortedTransactions[index]

      // Skip balance sync for allocation-source transactions - they should not have running or current balance
      if (transaction.isForAllocation) {
        if (
          (transaction.runningBalance ?? null) !== null ||
          (transaction.currentBalance ?? null) !== null
        ) {
          await req.payload.update({
            collection: 'transactions',
            id: String(transaction.id),
            data: {
              currentBalance: null,
              runningBalance: null,
            },
            depth: 0,
            overrideAccess: true,
            req,
            context: req.context,
          })
        }
        continue
      }

      const currentBalanceBeforeTransaction = runningBalance

      const nextRunningBalance =
        transaction.transactionStatus === 'completed'
          ? currentBalanceBeforeTransaction + getSignedAmount(transaction)
          : null

      const nextTransactionCurrentBalance = Number.isFinite(currentBalanceBeforeTransaction)
        ? currentBalanceBeforeTransaction
        : null

      if (
        (transaction.runningBalance ?? null) !== nextRunningBalance ||
        (transaction.currentBalance ?? null) !== nextTransactionCurrentBalance
      ) {
        await req.payload.update({
          collection: 'transactions',
          id: String(transaction.id),
          data: {
            currentBalance: nextTransactionCurrentBalance,
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

export function getRecomputeHints(args: {
  doc?: Record<string, unknown>
  previousDoc?: Record<string, unknown>
}): Array<RecomputeHint> {
  return [
    {
      accountId: getRelationshipId(args.doc?.financialAccount as MaybeRelationship),
      transactionId: args.doc?.id ? String(args.doc.id) : undefined,
      transactionDate:
        typeof args.doc?.transactionDate === 'string' ? args.doc.transactionDate : undefined,
      createdAt: typeof args.doc?.createdAt === 'string' ? args.doc.createdAt : undefined,
    },
    {
      accountId: getRelationshipId(args.previousDoc?.financialAccount as MaybeRelationship),
      transactionId: args.previousDoc?.id ? String(args.previousDoc.id) : undefined,
      transactionDate:
        typeof args.previousDoc?.transactionDate === 'string'
          ? args.previousDoc.transactionDate
          : undefined,
      createdAt:
        typeof args.previousDoc?.createdAt === 'string' ? args.previousDoc.createdAt : undefined,
    },
  ]
}
