'use server'

import { auth } from '@/app/(app)/lib/auth'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '~/payload.config'

export type BankOption = {
  id: string
  name: string
  code: string
}

export type FinancialAccountDetail = {
  id: string
  name: string
  bankId: string
  bankName?: string
  isDefault: boolean
  startingBalance: number
  currentBalance: number
}

export type FinancialAccountInput = {
  name: string
  bankId: string
  startingBalance: number
  currentBalance: number
}

export type Transaction = {
  transactionDate: string
  transactionType: 'debit' | 'credit'
  amount: number
}

export type PeriodStats = {
  moneyIn: number
  moneyOut: number
  profit: number
  lastActivity: Date | null
  transactionCount: number
  profitPercent?: number | null
  moneyInPercent?: number | null
  moneyOutPercent?: number | null
}

function normalizeNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? value : undefined
  }

  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim(),
  )

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function mapFinancialAccount(doc: any): FinancialAccountDetail {
  const bankId =
    doc.bank && typeof doc.bank === 'object' ? String(doc.bank.id) : String(doc.bank || '')

  const bankName =
    doc.bank && typeof doc.bank === 'object' && doc.bank.name ? String(doc.bank.name) : undefined

  return {
    id: String(doc.id),
    name: String(doc.name || ''),
    bankId,
    bankName,
    isDefault: Boolean(doc.isDefault),
    startingBalance:
      typeof doc.startingBalance === 'number' && Number.isFinite(doc.startingBalance)
        ? doc.startingBalance
        : 0,
    currentBalance:
      typeof doc.currentBalance === 'number' && Number.isFinite(doc.currentBalance)
        ? doc.currentBalance
        : 0,
  }
}

export async function getBanksOptions(): Promise<{
  success: boolean
  data: BankOption[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'banks',
      sort: 'name',
      limit: 200,
      depth: 0,
    })

    return {
      success: true,
      data: (result.docs as any[]).map((doc) => ({
        id: String(doc.id),
        name: String(doc.name || ''),
        code: String(doc.code || ''),
      })),
    }
  } catch (error) {
    console.error('Failed to load banks:', error)
    return { success: false, data: [], error: 'Failed to load banks.' }
  }
}

export async function getFinancialAccountsList(): Promise<{
  success: boolean
  data: FinancialAccountDetail[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'financial-accounts',
      sort: 'name',
      limit: 500,
      depth: 1,
    })

    return {
      success: true,
      data: (result.docs as any[]).map(mapFinancialAccount),
    }
  } catch (error) {
    console.error('Failed to load financial accounts:', error)
    return { success: false, data: [], error: 'Failed to load financial accounts.' }
  }
}

export async function getFinancialAccountById(id: string): Promise<{
  success: boolean
  data?: FinancialAccountDetail
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.findByID({
      collection: 'financial-accounts',
      id,
      depth: 1,
    })

    return {
      success: true,
      data: mapFinancialAccount(doc),
    }
  } catch (error) {
    console.error('Failed to load financial account:', error)
    return { success: false, error: 'Failed to load financial account.' }
  }
}

export async function createFinancialAccount(input: FinancialAccountInput): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const name = String(input.name || '').trim()
    const bankId = String(input.bankId || '').trim()
    const startingBalance = normalizeNonNegativeNumber(input.startingBalance)
    const currentBalance = normalizeNonNegativeNumber(input.currentBalance)

    if (!name) return { success: false, error: 'Name is required.' }
    if (!bankId) return { success: false, error: 'Bank is required.' }
    if (typeof startingBalance !== 'number') {
      return { success: false, error: 'Starting balance must be a non-negative number.' }
    }
    if (typeof currentBalance !== 'number') {
      return { success: false, error: 'Current balance must be a non-negative number.' }
    }

    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'financial-accounts',
      data: {
        name,
        bank: bankId,
        startingBalance,
        currentBalance,
      },
      depth: 0,
    })

    return { success: true, id: String(created.id) }
  } catch (error) {
    console.error('Failed to create financial account:', error)
    return { success: false, error: 'Failed to create financial account.' }
  }
}

export async function updateFinancialAccount(
  id: string,
  input: FinancialAccountInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const name = String(input.name || '').trim()
    const bankId = String(input.bankId || '').trim()
    const startingBalance = normalizeNonNegativeNumber(input.startingBalance)
    const currentBalance = normalizeNonNegativeNumber(input.currentBalance)

    if (!name) return { success: false, error: 'Name is required.' }
    if (!bankId) return { success: false, error: 'Bank is required.' }
    if (typeof startingBalance !== 'number') {
      return { success: false, error: 'Starting balance must be a non-negative number.' }
    }
    if (typeof currentBalance !== 'number') {
      return { success: false, error: 'Current balance must be a non-negative number.' }
    }

    const payload = await getPayload({ config })
    await payload.update({
      collection: 'financial-accounts',
      id,
      data: {
        name,
        bank: bankId,
        startingBalance,
        currentBalance,
      },
      depth: 0,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update financial account:', error)
    return { success: false, error: 'Failed to update financial account.' }
  }
}

export async function setFinancialAccountDefault(
  id: string,
  isDefault: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })

    if (isDefault) {
      await payload.update({
        collection: 'financial-accounts',
        where: {
          isDefault: {
            equals: true,
          },
        },
        data: {
          isDefault: false,
        },
        depth: 0,
      })
    }

    await payload.update({
      collection: 'financial-accounts',
      id,
      data: {
        isDefault,
      },
      depth: 0,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to set default financial account:', error)
    return { success: false, error: 'Failed to set default financial account.' }
  }
}

export async function deleteFinancialAccount(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'financial-accounts',
      id,
      depth: 0,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to delete financial account:', error)
    return { success: false, error: 'Failed to delete financial account.' }
  }
}

export async function getFinancialAccountTransactions(financialAccountId: string): Promise<{
  success: boolean
  data: Transaction[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'transactions',
      where: {
        financialAccount: {
          equals: financialAccountId,
        },
      },
      limit: 10000,
      sort: 'transactionDate',
      depth: 0,
    })

    const transactions = (result.docs as any[])
      .filter((doc) => doc.transactionDate && doc.transactionType && typeof doc.amount === 'number')
      .map((doc) => ({
        transactionDate: doc.transactionDate,
        transactionType: doc.transactionType,
        amount: doc.amount,
      }))

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    console.error('Failed to load transactions:', error)
    return { success: false, data: [], error: 'Failed to load transactions.' }
  }
}

export async function getFinancialAccountStatsByPeriod(
  financialAccountId: string,
  days: number,
): Promise<{
  success: boolean
  data?: PeriodStats
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const now = new Date()
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000)

    // Fetch current period stats
    const currentResult = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          {
            financialAccount: {
              equals: financialAccountId,
            },
          },
          {
            transactionDate: {
              greater_than_equal: periodStart.toISOString(),
            },
          },
        ],
      },
      limit: 10000,
      depth: 0,
    })

    // Fetch previous period stats
    const previousResult = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          {
            financialAccount: {
              equals: financialAccountId,
            },
          },
          {
            transactionDate: {
              greater_than_equal: previousPeriodStart.toISOString(),
              less_than: periodStart.toISOString(),
            },
          },
        ],
      },
      limit: 10000,
      depth: 0,
    })

    const calculateStats = (transactions: any[]) => {
      let moneyIn = 0
      let moneyOut = 0
      let lastActivity: Date | null = null

      transactions.forEach((tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : 0
        const transactionType = String(tx.transactionType || '').toLowerCase()

        if (transactionType === 'credit') {
          moneyIn += amount
        } else if (transactionType === 'debit') {
          moneyOut += amount
        }

        if (tx.transactionDate) {
          const txDate = new Date(tx.transactionDate)
          if (!lastActivity || txDate > lastActivity) {
            lastActivity = txDate
          }
        }
      })

      return { moneyIn, moneyOut, profit: moneyIn - moneyOut, lastActivity }
    }

    const currentStats = calculateStats(currentResult.docs as any[])
    const previousStats = calculateStats(previousResult.docs as any[])

    // Calculate percentage changes
    const calculatePercent = (current: number, previous: number): number | null => {
      if (previous === 0) return null
      const percentage = ((current - previous) / Math.abs(previous)) * 100
      return Math.round(percentage * 100) / 100
    }

    return {
      success: true,
      data: {
        moneyIn: currentStats.moneyIn,
        moneyOut: currentStats.moneyOut,
        profit: currentStats.profit,
        lastActivity: currentStats.lastActivity,
        transactionCount: (currentResult.docs as any[]).length,
        profitPercent: calculatePercent(currentStats.profit, previousStats.profit),
        moneyInPercent: calculatePercent(currentStats.moneyIn, previousStats.moneyIn),
        moneyOutPercent: calculatePercent(currentStats.moneyOut, previousStats.moneyOut),
      },
    }
  } catch (error) {
    console.error('Failed to fetch financial account stats by period:', error)
    return { success: false, error: 'Failed to fetch account statistics.' }
  }
}
