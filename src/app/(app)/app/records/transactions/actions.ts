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

export type TransactionListItem = {
  id: string
  description: string
  transactionType?: 'debit' | 'credit' | 'transfer' | 'payment' | 'other'
  sourceBankName?: string
  transactionDate?: string
  moneyIn?: number
  moneyOut?: number
  isReversed: boolean
  createdAt: string
  updatedAt: string
}

export type TransactionFormInput = {
  transactionDate?: string
  description: string
  particulars?: string
  transactionType?: 'debit' | 'credit' | 'transfer' | 'payment' | 'other' | null
  sourceBank?: string
  referenceNumber?: string
  moneyIn?: number
  moneyOut?: number
  runningBalance?: number
  currency?: string
  receiptImageId: string
  isReversed?: boolean
  reversalReason?: string
}

export type TransactionDetail = TransactionFormInput & {
  id: string
  receiptImageUrl?: string
  rawOcrText?: string
  extractionConfidence?: number
  aiExtractedJson?: unknown
  isAiGenerated?: boolean
  isUserEdited?: boolean
}

export async function getBanks(): Promise<{
  success: boolean
  data: BankOption[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'banks',
      sort: 'name',
      limit: 100,
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
    console.error('Failed to fetch banks:', error)
    return { success: false, data: [], error: 'Failed to load banks.' }
  }
}

export async function getTransactions(): Promise<{
  success: boolean
  data: TransactionListItem[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'transactions',
      sort: '-createdAt',
      limit: 1000,
      depth: 1,
    })

    return {
      success: true,
      data: (result.docs as any[]).map((doc) => ({
        id: String(doc.id),
        description: String(doc.description || ''),
        transactionType: doc.transactionType
          ? (String(doc.transactionType) as 'debit' | 'credit' | 'transfer' | 'payment' | 'other')
          : undefined,
        sourceBankName:
          doc.sourceBank && typeof doc.sourceBank === 'object' && doc.sourceBank.name
            ? String(doc.sourceBank.name)
            : undefined,
        transactionDate: doc.transactionDate ? String(doc.transactionDate) : undefined,
        moneyIn: typeof doc.moneyIn === 'number' ? doc.moneyIn : undefined,
        moneyOut: typeof doc.moneyOut === 'number' ? doc.moneyOut : undefined,
        isReversed: doc.isReversed === true,
        createdAt: String(doc.createdAt || ''),
        updatedAt: String(doc.updatedAt || ''),
      })),
    }
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return { success: false, data: [], error: 'Failed to load transactions.' }
  }
}

export async function createTransaction(input: TransactionFormInput): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'transactions',
      data: {
        transactionDate: input.transactionDate ?? null,
        description: input.description,
        particulars: input.particulars ?? null,
        transactionType: input.transactionType ?? null,
        sourceBank: input.sourceBank ?? null,
        referenceNumber: input.referenceNumber ?? null,
        moneyIn: typeof input.moneyIn === 'number' ? input.moneyIn : null,
        moneyOut: typeof input.moneyOut === 'number' ? input.moneyOut : null,
        runningBalance: typeof input.runningBalance === 'number' ? input.runningBalance : null,
        currency: input.currency || 'PHP',
        receiptImage: input.receiptImageId,
        isReversed: input.isReversed ?? false,
        reversalReason: input.reversalReason ?? null,
      },
      depth: 0,
    })

    return { success: true, id: String(doc.id) }
  } catch (error) {
    console.error('Failed to create transaction:', error)
    return { success: false, error: 'Failed to create transaction.' }
  }
}

export async function getTransactionById(id: string): Promise<{
  success: boolean
  data?: TransactionDetail
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })
    const doc = await payload.findByID({
      collection: 'transactions',
      id,
      depth: 1,
    })

    let receiptImageId = ''
    let receiptImageUrl: string | undefined
    if ((doc as any).receiptImage) {
      if (typeof (doc as any).receiptImage === 'string') {
        receiptImageId = String((doc as any).receiptImage)
      } else {
        receiptImageId = String((doc as any).receiptImage.id)
        receiptImageUrl = (doc as any).receiptImage.url
          ? String((doc as any).receiptImage.url)
          : undefined
      }
    }

    return {
      success: true,
      data: {
        id: String((doc as any).id),
        transactionDate: (doc as any).transactionDate
          ? String((doc as any).transactionDate)
          : undefined,
        description: String((doc as any).description || ''),
        particulars: (doc as any).particulars ? String((doc as any).particulars) : undefined,
        transactionType: (doc as any).transactionType
          ? (String((doc as any).transactionType) as
              | 'debit'
              | 'credit'
              | 'transfer'
              | 'payment'
              | 'other')
          : undefined,
        sourceBank:
          (doc as any).sourceBank && typeof (doc as any).sourceBank === 'object'
            ? String((doc as any).sourceBank.id)
            : (doc as any).sourceBank
              ? String((doc as any).sourceBank)
              : undefined,
        referenceNumber: (doc as any).referenceNumber
          ? String((doc as any).referenceNumber)
          : undefined,
        moneyIn: typeof (doc as any).moneyIn === 'number' ? (doc as any).moneyIn : undefined,
        moneyOut: typeof (doc as any).moneyOut === 'number' ? (doc as any).moneyOut : undefined,
        runningBalance:
          typeof (doc as any).runningBalance === 'number' ? (doc as any).runningBalance : undefined,
        currency: (doc as any).currency ? String((doc as any).currency) : 'PHP',
        receiptImageId,
        receiptImageUrl,
        rawOcrText: (doc as any).rawOcrText ? String((doc as any).rawOcrText) : undefined,
        extractionConfidence:
          typeof (doc as any).extractionConfidence === 'number'
            ? (doc as any).extractionConfidence
            : undefined,
        aiExtractedJson: (doc as any).aiExtractedJson,
        isAiGenerated: (doc as any).isAiGenerated === true,
        isUserEdited: (doc as any).isUserEdited === true,
        isReversed: (doc as any).isReversed === true,
        reversalReason: (doc as any).reversalReason
          ? String((doc as any).reversalReason)
          : undefined,
      },
    }
  } catch (error) {
    console.error('Failed to fetch transaction:', error)
    return { success: false, error: 'Failed to load transaction.' }
  }
}

export async function updateTransaction(
  id: string,
  input: TransactionFormInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })
    await payload.update({
      collection: 'transactions',
      id,
      data: {
        transactionDate: input.transactionDate ?? null,
        description: input.description,
        particulars: input.particulars ?? null,
        transactionType: input.transactionType ?? null,
        sourceBank: input.sourceBank ?? null,
        referenceNumber: input.referenceNumber ?? null,
        moneyIn: typeof input.moneyIn === 'number' ? input.moneyIn : null,
        moneyOut: typeof input.moneyOut === 'number' ? input.moneyOut : null,
        runningBalance: typeof input.runningBalance === 'number' ? input.runningBalance : null,
        currency: input.currency || 'PHP',
        receiptImage: input.receiptImageId,
        isReversed: input.isReversed ?? false,
        reversalReason: input.reversalReason ?? null,
      },
      depth: 0,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update transaction:', error)
    return { success: false, error: 'Failed to update transaction.' }
  }
}

export async function deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })
    await payload.delete({ collection: 'transactions', id })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete transaction:', error)
    return { success: false, error: 'Failed to delete transaction.' }
  }
}

export async function uploadTransactionReceipt(formData: FormData): Promise<{
  success: boolean
  id?: string
  url?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const file = formData.get('file')
    if (!(file instanceof File)) return { success: false, error: 'No file provided.' }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const payload = await getPayload({ config })

    const media = await payload.create({
      collection: 'media',
      data: {
        text: file.name,
      },
      file: {
        data: buffer,
        name: file.name,
        mimetype: file.type || 'image/jpeg',
        size: buffer.length,
      },
    })

    const url = (media as any).url ? String((media as any).url) : undefined
    return { success: true, id: String(media.id), url }
  } catch (error) {
    console.error('Failed to upload receipt:', error)
    return { success: false, error: 'Failed to upload receipt.' }
  }
}
