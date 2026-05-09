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
  startingBalance: number
  currentBalance: number
}

export type FinancialAccountInput = {
  name: string
  bankId: string
  startingBalance: number
  currentBalance: number
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
