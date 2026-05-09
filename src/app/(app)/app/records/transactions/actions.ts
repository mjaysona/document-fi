'use server'

import { auth } from '@/app/(app)/lib/auth'
import { getServerSideURL } from '@/utilities/getURL'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { extractTextFromImageBuffer } from '@/lib/ocrProvider'

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
  receiptImageId?: string
  rawOcrText?: string
  isReversed?: boolean
  reversalReason?: string
}

export type TransactionDetail = TransactionFormInput & {
  id: string
  receiptImageId?: string
  receiptImageUrl?: string
  receiptImageFileName?: string
  rawOcrText?: string
  extractionConfidence?: number
  aiExtractedJson?: unknown
  isAiGenerated?: boolean
  isUserEdited?: boolean
}

async function createTransactionReceiptFromFormData(formData: FormData): Promise<{
  success: boolean
  id?: string
  url?: string
  rawOcrText?: string
  error?: string
}> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'No file provided.' }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { rawText } = await extractTextFromImageBuffer(buffer)
  const payload = await getPayload({ config })

  const receipt = await payload.create({
    collection: 'transaction-receipts',
    data: {},
    file: {
      data: buffer,
      name: file.name,
      mimetype: file.type || 'image/jpeg',
      size: buffer.length,
    },
    depth: 0,
  })

  return {
    success: true,
    id: String(receipt.id),
    url: receipt.url ? String(receipt.url) : `/api/media/${String(receipt.id)}`,
    rawOcrText: rawText,
  }
}

async function deleteTransactionReceiptById(id: string) {
  try {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'transaction-receipts', id })
  } catch (error) {
    console.error(`Failed to rollback transaction receipt ${id}:`, error)
  }
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
      draft: false,
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
        ...(input.receiptImageId ? { receiptImage: input.receiptImageId } : {}),
        ...(typeof input.rawOcrText !== 'undefined'
          ? {
              rawOcrText: input.rawOcrText ?? null,
              isAiGenerated: Boolean(input.rawOcrText),
            }
          : {}),
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

export async function createTransactionWithReceipt(formData: FormData): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const description = String(formData.get('description') || '').trim()
    if (!description) return { success: false, error: 'Description is required.' }

    const receiptResult = await createTransactionReceiptFromFormData(formData)
    if (!receiptResult.success || !receiptResult.id) {
      return { success: false, error: receiptResult.error ?? 'Failed to save receipt.' }
    }

    const createResult = await createTransaction({
      transactionDate: String(formData.get('transactionDate') || '').trim() || undefined,
      description,
      particulars: String(formData.get('particulars') || '').trim() || undefined,
      transactionType:
        (String(formData.get('transactionType') || '').trim() as
          | 'debit'
          | 'credit'
          | 'transfer'
          | 'payment'
          | 'other'
          | '') || undefined,
      sourceBank: String(formData.get('sourceBank') || '').trim() || undefined,
      referenceNumber: String(formData.get('referenceNumber') || '').trim() || undefined,
      moneyIn: String(formData.get('moneyIn') || '').trim()
        ? Number(formData.get('moneyIn'))
        : undefined,
      moneyOut: String(formData.get('moneyOut') || '').trim()
        ? Number(formData.get('moneyOut'))
        : undefined,
      runningBalance: String(formData.get('runningBalance') || '').trim()
        ? Number(formData.get('runningBalance'))
        : undefined,
      currency: String(formData.get('currency') || '').trim() || 'PHP',
      receiptImageId: receiptResult.id,
      rawOcrText: receiptResult.rawOcrText,
      isReversed: String(formData.get('isReversed') || '') === 'true',
      reversalReason: String(formData.get('reversalReason') || '').trim() || undefined,
    })

    if (!createResult.success) {
      await deleteTransactionReceiptById(receiptResult.id)
    }

    return createResult
  } catch (error) {
    console.error('Failed to create transaction with receipt:', error)
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

    let receiptImageId: string | undefined
    let receiptImageUrl: string | undefined
    let receiptImageFileName: string | undefined
    if ((doc as any).receiptImage) {
      if (typeof (doc as any).receiptImage === 'string') {
        receiptImageId = String((doc as any).receiptImage)
        receiptImageUrl = `/api/media/${receiptImageId}`
      } else {
        receiptImageId = String((doc as any).receiptImage.id)
        receiptImageFileName = (doc as any).receiptImage.filename
          ? String((doc as any).receiptImage.filename)
          : undefined
        receiptImageUrl = (doc as any).receiptImage.url
          ? String((doc as any).receiptImage.url)
          : `/api/media/${receiptImageId}`
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
        receiptImageFileName,
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
        ...(input.receiptImageId ? { receiptImage: input.receiptImageId } : {}),
        ...(typeof input.rawOcrText !== 'undefined'
          ? {
              rawOcrText: input.rawOcrText ?? null,
              isAiGenerated: Boolean(input.rawOcrText),
            }
          : {}),
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

export async function updateTransactionWithReceipt(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const payload = await getPayload({ config })

    // Get current transaction to check existing receipt image
    const currentTx = await payload.findByID({
      collection: 'transactions',
      id,
      depth: 0,
    })
    const existingReceiptImageId = (currentTx as any).receiptImage
      ? typeof (currentTx as any).receiptImage === 'string'
        ? String((currentTx as any).receiptImage)
        : String((currentTx as any).receiptImage.id)
      : undefined

    let receiptImageId = String(formData.get('existingReceiptImageId') || '').trim() || undefined
    let rawOcrText = String(formData.get('rawOcrText') || '').trim() || undefined

    const nextReceipt = formData.get('file')
    if (nextReceipt instanceof File && nextReceipt.size > 0) {
      // New file uploaded: delete old and upload new
      const receiptResult = await createTransactionReceiptFromFormData(formData)
      if (!receiptResult.success || !receiptResult.id) {
        return { success: false, error: receiptResult.error ?? 'Failed to save receipt.' }
      }

      // Delete old receipt if it exists
      if (existingReceiptImageId) {
        await deleteTransactionReceiptById(existingReceiptImageId)
      }

      receiptImageId = receiptResult.id
      rawOcrText = receiptResult.rawOcrText
    } else if (!receiptImageId && existingReceiptImageId) {
      // No new file and no existing ID in form: image was removed, delete it
      await deleteTransactionReceiptById(existingReceiptImageId)
    }

    const updateResult = await updateTransaction(id, {
      transactionDate: String(formData.get('transactionDate') || '').trim() || undefined,
      description: String(formData.get('description') || '').trim(),
      particulars: String(formData.get('particulars') || '').trim() || undefined,
      transactionType:
        (String(formData.get('transactionType') || '').trim() as
          | 'debit'
          | 'credit'
          | 'transfer'
          | 'payment'
          | 'other'
          | '') || undefined,
      sourceBank: String(formData.get('sourceBank') || '').trim() || undefined,
      referenceNumber: String(formData.get('referenceNumber') || '').trim() || undefined,
      moneyIn: String(formData.get('moneyIn') || '').trim()
        ? Number(formData.get('moneyIn'))
        : undefined,
      moneyOut: String(formData.get('moneyOut') || '').trim()
        ? Number(formData.get('moneyOut'))
        : undefined,
      runningBalance: String(formData.get('runningBalance') || '').trim()
        ? Number(formData.get('runningBalance'))
        : undefined,
      currency: String(formData.get('currency') || '').trim() || 'PHP',
      receiptImageId,
      rawOcrText,
      isReversed: String(formData.get('isReversed') || '') === 'true',
      reversalReason: String(formData.get('reversalReason') || '').trim() || undefined,
    })

    return updateResult
  } catch (error) {
    console.error('Failed to update transaction with receipt:', error)
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
  rawOcrText?: string
  previewUrl?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const file = formData.get('file')
    if (!(file instanceof File)) return { success: false, error: 'No file provided.' }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { rawText } = await extractTextFromImageBuffer(buffer)

    return { success: true, rawOcrText: rawText }
  } catch (error) {
    console.error('Failed to upload receipt:', error)
    return { success: false, error: 'Failed to upload and process receipt.' }
  }
}

export async function replaceTransactionReceipt(
  id: string,
  formData: FormData,
): Promise<{
  success: boolean
  rawOcrText?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const uploadResult = await uploadTransactionReceipt(formData)
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error ?? 'Failed to upload receipt.' }
    }

    return {
      success: true,
      rawOcrText: uploadResult.rawOcrText,
    }
  } catch (error) {
    console.error('Failed to process transaction receipt:', error)
    return { success: false, error: 'Failed to replace and process receipt.' }
  }
}
