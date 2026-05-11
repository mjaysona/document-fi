'use server'

import { auth } from '@/app/(app)/lib/auth'
import { extractTransactionWithGroq } from '@/lib/extraction/groqProvider'
import { extractTextFromImageBuffer } from '@/lib/ocrProvider'
import { getServerSideURL } from '@/utilities/getURL'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '~/payload.config'

export type TransactionType = 'debit' | 'credit'
export type TransactionStatus = 'completed' | 'failed'

export type BankOption = {
  id: string
  name: string
  code: string
}

export type FinancialAccountOption = {
  id: string
  name: string
  code: string
  isDefault?: boolean
  bankId?: string
  bankName?: string
  startingBalance?: number
  currentBalance?: number
}

export type TransactionListItem = {
  id: string
  description: string
  transactionType?: TransactionType
  financialAccountName?: string
  sourceAccountName?: string
  destinationAccountName?: string
  transactionDate?: string
  amount?: number
  transactionFee?: number
  runningBalance?: number
  transactionStatus?: TransactionStatus
  createdAt: string
  updatedAt: string
}

export type TransactionFormInput = {
  transactionDate?: string
  description: string
  particulars?: string
  transactionType?: TransactionType | null
  sourceAccount?: string
  destinationAccount?: string
  financialAccount?: string
  from?: string
  to?: string
  referenceNumber?: string
  amount?: number
  transactionFee?: number
  transactionStatus?: TransactionStatus | null
  receiptImageId?: string
  rawOcrText?: string
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
  runningBalance?: number
}

export type ProcessTransactionReceiptResult = {
  success: boolean
  status?: 'idle' | 'processing' | 'partial-success' | 'success' | 'failed'
  error?: string
  warning?: string
}

export type ReceiptAnalysisResult = {
  success: boolean
  rawOcrText?: string
  detectedSourceBankId?: string
  detectedDestinationBankId?: string
  transactionDate?: string
  description?: string
  particulars?: string
  transactionType?: TransactionType
  referenceNumber?: string
  amount?: number
  transactionFee?: number
  transactionStatus?: TransactionStatus
  from?: string
  to?: string
  confidence?: number
  error?: string
}

function normalizeTransactionType(value: unknown): TransactionType | undefined {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (normalized === 'debit' || normalized === 'credit') {
    return normalized
  }

  return undefined
}

function normalizeTransactionStatus(value: unknown): TransactionStatus | undefined {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (normalized === 'completed' || normalized === 'failed') {
    return normalized
  }

  return undefined
}

function normalizeAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? value : undefined
  }

  const parsed = Number(
    String(value || '')
      .replace(/,/g, '')
      .trim(),
  )
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return undefined
}

function normalizeNonNegativeAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? value : 0
  }

  const parsed = Number(
    String(value || '')
      .replace(/,/g, '')
      .trim(),
  )

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalizeReferenceNumber(value: unknown): string | undefined {
  const normalized = String(value || '').trim()
  return normalized || undefined
}

async function isReferenceNumberTaken(args: {
  payload: Awaited<ReturnType<typeof getPayload>>
  referenceNumber?: string
  excludeTransactionId?: string
}): Promise<boolean> {
  const referenceNumber = normalizeReferenceNumber(args.referenceNumber)
  if (!referenceNumber) return false

  const where: Record<string, unknown> = {
    referenceNumber: {
      equals: referenceNumber,
    },
  }

  if (args.excludeTransactionId) {
    where.id = {
      not_equals: args.excludeTransactionId,
    }
  }

  const existing = await args.payload.find({
    collection: 'transactions',
    where: where as any,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  return existing.totalDocs > 0
}

function createReadableDescriptionFromParticulars(particulars?: string): string | undefined {
  const raw = String(particulars || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) return undefined

  // Prefer explicit remarks/notes content when available.
  const notesOrRemarks = raw.match(/\b(?:notes?|remarks?)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim()
  if (notesOrRemarks) {
    const cleaned = notesOrRemarks.replace(/[.\s]+$/, '')
    if (cleaned) {
      const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      return `${normalized}.`
    }
  }

  const lower = raw.toLowerCase()
  if (lower.includes('send money') || lower.includes('instapay')) {
    const channel = raw.match(/via\s+([a-z0-9\- ]+?)\s+(to|from|notes?)\b/i)?.[1]?.trim()
    const toValue = raw.match(/\bto\s+([^\n]+?)(?:\s+from\b|\s+notes?\b|$)/i)?.[1]?.trim()
    const fromValue = raw.match(/\bfrom\s+([^\n]+?)(?:\s+notes?\b|$)/i)?.[1]?.trim()
    const notesValue = raw.match(/\bnotes?\s+(.+)$/i)?.[1]?.trim()

    const parts: string[] = []
    if (channel) {
      const normalizedChannel = channel.replace(/instapay/i, 'Instapay')
      parts.push(`Sent money via ${normalizedChannel}`)
    } else {
      parts.push('Sent money')
    }
    if (toValue) parts.push(`to ${toValue}`)
    if (fromValue) parts.push(`from ${fromValue}`)
    if (notesValue) parts.push(`for ${notesValue}`)

    const sentence = parts.join(' ').trim()
    if (sentence) return `${sentence}.`
  }

  return raw
}

function normalizeTransactionDate(value: unknown): string | undefined {
  const raw = String(value || '').trim()
  if (!raw) return undefined

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed.toISOString()
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
    url: receipt.url
      ? String(receipt.url)
      : (receipt as any).filename
        ? `/api/transaction-receipts/file/${encodeURIComponent(String((receipt as any).filename))}`
        : `/api/transaction-receipts/${String(receipt.id)}`,
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

async function resolveSourceBankIdFromFinancialAccount(
  financialAccountId: string,
): Promise<{ bankId?: string; error?: string }> {
  const payload = await getPayload({ config })

  const financialAccount = await payload.findByID({
    collection: 'financial-accounts',
    id: financialAccountId,
    depth: 1,
  })

  const rawBank = (financialAccount as any).bank
  const bankId =
    rawBank && typeof rawBank === 'object'
      ? String(rawBank.id)
      : rawBank
        ? String(rawBank)
        : undefined

  if (!bankId) {
    return { error: 'Selected financial account has no linked bank.' }
  }

  return { bankId }
}

function normalizeTextToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function textContainsBankReference(
  value: string | undefined,
  bank: BankOption | undefined,
): boolean {
  if (!value || !bank) return false

  const normalizedText = ` ${normalizeTextToken(value)} `
  const codeToken = normalizeTextToken(bank.code)
  const nameToken = normalizeTextToken(bank.name)

  const codeMatch = codeToken.length >= 2 && normalizedText.includes(` ${codeToken} `)
  const nameMatch = nameToken.length >= 3 && normalizedText.includes(` ${nameToken} `)

  return codeMatch || nameMatch
}

function detectBankMentionFromText(
  value: string | undefined,
  banks: BankOption[],
): string | undefined {
  if (!value) return undefined
  return banks.find((bank) => textContainsBankReference(value, bank))?.id
}

function inferTransactionTypeFromBankContext(params: {
  extractedType?: TransactionType
  selectedBankId?: string
  detectedDestinationBankId?: string
  fromText?: string
  toText?: string
  banks: BankOption[]
}): TransactionType | undefined {
  const { extractedType, selectedBankId, detectedDestinationBankId, fromText, toText, banks } =
    params

  if (!selectedBankId) return extractedType

  // Strong signal: destination bank was identified and it is not the selected account bank.
  if (detectedDestinationBankId && detectedDestinationBankId !== selectedBankId) {
    return 'credit'
  }

  const mentionedToBankId = detectBankMentionFromText(toText, banks)
  const mentionedFromBankId = detectBankMentionFromText(fromText, banks)

  // User rule: if "to" clearly points to a different bank than selected account bank, classify as credit.
  if (mentionedToBankId && mentionedToBankId !== selectedBankId) {
    return 'credit'
  }

  // If "from" explicitly references the selected bank, treat it as debit unless a stronger rule matched.
  if (mentionedFromBankId && mentionedFromBankId === selectedBankId) {
    return 'debit'
  }

  return extractedType
}

function mapTransactionInput(
  input: TransactionFormInput & {
    amount: number
    transactionFee: number
    transactionType: TransactionType
    financialAccount: string
  },
) {
  return {
    transactionDate: normalizeTransactionDate(input.transactionDate),
    description: input.description.trim(),
    particulars: input.particulars?.trim() || undefined,
    transactionType: input.transactionType,
    sourceAccount: input.sourceAccount || undefined,
    destinationAccount: input.destinationAccount || undefined,
    financialAccount: input.financialAccount,
    from: input.from?.trim() || undefined,
    to: input.to?.trim() || undefined,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    amount: input.amount,
    transactionFee: input.transactionFee,
    transactionStatus: normalizeTransactionStatus(input.transactionStatus) ?? 'completed',
    ...(input.receiptImageId ? { receiptImage: input.receiptImageId } : {}),
    ...(typeof input.rawOcrText !== 'undefined'
      ? {
          rawOcrText: input.rawOcrText || undefined,
          isAiGenerated: Boolean(input.rawOcrText),
        }
      : {}),
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

export async function getFinancialAccounts(): Promise<{
  success: boolean
  data: FinancialAccountOption[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'financial-accounts',
      sort: 'name',
      limit: 100,
      depth: 1,
    })

    return {
      success: true,
      data: (result.docs as any[]).map((doc) => ({
        id: String(doc.id),
        name: String(doc.name || ''),
        code: String(doc.code || ''),
        isDefault: (doc as any).isDefault === true,
        bankId:
          doc.bank && typeof doc.bank === 'object'
            ? String(doc.bank.id)
            : doc.bank
              ? String(doc.bank)
              : undefined,
        bankName:
          doc.bank && typeof doc.bank === 'object' && doc.bank.name
            ? String(doc.bank.name)
            : undefined,
        startingBalance: typeof doc.startingBalance === 'number' ? doc.startingBalance : undefined,
        currentBalance: typeof doc.currentBalance === 'number' ? doc.currentBalance : undefined,
      })),
    }
  } catch (error) {
    console.error('Failed to fetch financial accounts:', error)
    return { success: false, data: [], error: 'Failed to load financial accounts.' }
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
        transactionType: normalizeTransactionType(doc.transactionType),
        financialAccountName:
          doc.financialAccount &&
          typeof doc.financialAccount === 'object' &&
          doc.financialAccount.name
            ? String(doc.financialAccount.name)
            : undefined,
        sourceAccountName:
          doc.sourceAccount && typeof doc.sourceAccount === 'object' && doc.sourceAccount.name
            ? String(doc.sourceAccount.name)
            : undefined,
        destinationAccountName:
          doc.destinationAccount &&
          typeof doc.destinationAccount === 'object' &&
          doc.destinationAccount.name
            ? String(doc.destinationAccount.name)
            : undefined,
        transactionDate: doc.transactionDate ? String(doc.transactionDate) : undefined,
        amount: typeof doc.amount === 'number' ? doc.amount : undefined,
        transactionFee: typeof doc.transactionFee === 'number' ? doc.transactionFee : 0,
        runningBalance: typeof doc.runningBalance === 'number' ? doc.runningBalance : undefined,
        transactionStatus: normalizeTransactionStatus(doc.transactionStatus),
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

    const description = input.description.trim()
    const transactionType = normalizeTransactionType(input.transactionType)
    const amount = normalizeAmount(input.amount)
    const transactionFee = normalizeNonNegativeAmount(input.transactionFee)
    const financialAccount = String(input.financialAccount || '').trim()

    if (!description) return { success: false, error: 'Description is required.' }
    if (!transactionType) return { success: false, error: 'Transaction type is required.' }
    if (!amount) return { success: false, error: 'Amount must be greater than zero.' }
    if (!financialAccount) return { success: false, error: 'Financial account is required.' }

    const sourceBankResolution = await resolveSourceBankIdFromFinancialAccount(financialAccount)
    if (!sourceBankResolution.bankId) {
      return {
        success: false,
        error: sourceBankResolution.error ?? 'Selected financial account has no linked bank.',
      }
    }

    const payload = await getPayload({ config })
    const duplicateReferenceNumber = await isReferenceNumberTaken({
      payload,
      referenceNumber: input.referenceNumber,
    })

    if (duplicateReferenceNumber) {
      return { success: false, error: 'Reference number already exists.' }
    }

    const doc = await payload.create({
      collection: 'transactions',
      draft: false,
      data: mapTransactionInput({
        ...input,
        sourceAccount: sourceBankResolution.bankId,
        description,
        transactionType,
        amount,
        transactionFee,
        financialAccount,
      }),
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

    const file = formData.get('file')
    const hasFile = file instanceof File && file.size > 0

    let receiptResult:
      | {
          success: boolean
          id?: string
          url?: string
          rawOcrText?: string
          error?: string
        }
      | undefined

    if (hasFile) {
      receiptResult = await createTransactionReceiptFromFormData(formData)
      if (!receiptResult.success || !receiptResult.id) {
        return { success: false, error: receiptResult.error ?? 'Failed to save receipt.' }
      }
    }

    const createResult = await createTransaction({
      transactionDate: String(formData.get('transactionDate') || '').trim() || undefined,
      description,
      particulars: String(formData.get('particulars') || '').trim() || undefined,
      transactionType: normalizeTransactionType(formData.get('transactionType')),
      sourceAccount: String(formData.get('sourceAccount') || '').trim() || undefined,
      destinationAccount: String(formData.get('destinationAccount') || '').trim() || undefined,
      financialAccount: String(formData.get('financialAccount') || '').trim() || undefined,
      from: String(formData.get('from') || '').trim() || undefined,
      to: String(formData.get('to') || '').trim() || undefined,
      referenceNumber: String(formData.get('referenceNumber') || '').trim() || undefined,
      amount: normalizeAmount(formData.get('amount')),
      transactionFee: normalizeNonNegativeAmount(formData.get('transactionFee')),
      transactionStatus: normalizeTransactionStatus(formData.get('transactionStatus')),
      receiptImageId: receiptResult?.id,
      rawOcrText: String(formData.get('rawOcrText') || '').trim() || receiptResult?.rawOcrText,
    })

    if (!createResult.success && receiptResult?.id) {
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
      } else {
        receiptImageId = String((doc as any).receiptImage.id)
        receiptImageFileName = (doc as any).receiptImage.filename
          ? String((doc as any).receiptImage.filename)
          : undefined
        receiptImageUrl = (doc as any).receiptImage.url
          ? String((doc as any).receiptImage.url)
          : undefined
      }

      if (receiptImageId && (!receiptImageUrl || !receiptImageFileName)) {
        try {
          const receiptDoc = await payload.findByID({
            collection: 'transaction-receipts',
            id: receiptImageId,
            depth: 0,
          })

          if (!receiptImageFileName && (receiptDoc as any).filename) {
            receiptImageFileName = String((receiptDoc as any).filename)
          }
          if (!receiptImageUrl && (receiptDoc as any).url) {
            receiptImageUrl = String((receiptDoc as any).url)
          }
        } catch (error) {
          console.error('Failed to hydrate receipt image metadata:', error)
        }
      }

      if (!receiptImageUrl && receiptImageFileName) {
        receiptImageUrl = `/api/transaction-receipts/file/${encodeURIComponent(receiptImageFileName)}`
      }

      if (!receiptImageUrl && receiptImageId) {
        receiptImageUrl = `/api/transaction-receipts/${receiptImageId}`
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
        transactionType: normalizeTransactionType((doc as any).transactionType),
        sourceAccount:
          (doc as any).sourceAccount && typeof (doc as any).sourceAccount === 'object'
            ? String((doc as any).sourceAccount.id)
            : (doc as any).sourceAccount
              ? String((doc as any).sourceAccount)
              : undefined,
        destinationAccount:
          (doc as any).destinationAccount && typeof (doc as any).destinationAccount === 'object'
            ? String((doc as any).destinationAccount.id)
            : (doc as any).destinationAccount
              ? String((doc as any).destinationAccount)
              : undefined,
        financialAccount:
          (doc as any).financialAccount && typeof (doc as any).financialAccount === 'object'
            ? String((doc as any).financialAccount.id)
            : (doc as any).financialAccount
              ? String((doc as any).financialAccount)
              : undefined,
        from: (doc as any).from ? String((doc as any).from) : undefined,
        to: (doc as any).to ? String((doc as any).to) : undefined,
        referenceNumber: (doc as any).referenceNumber
          ? String((doc as any).referenceNumber)
          : undefined,
        amount: typeof (doc as any).amount === 'number' ? (doc as any).amount : undefined,
        transactionFee:
          typeof (doc as any).transactionFee === 'number' ? (doc as any).transactionFee : 0,
        transactionStatus:
          normalizeTransactionStatus((doc as any).transactionStatus) ?? 'completed',
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
        runningBalance:
          typeof (doc as any).runningBalance === 'number' ? (doc as any).runningBalance : undefined,
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

    const description = input.description.trim()
    const transactionType = normalizeTransactionType(input.transactionType)
    const amount = normalizeAmount(input.amount)
    const transactionFee = normalizeNonNegativeAmount(input.transactionFee)
    const financialAccount = String(input.financialAccount || '').trim()

    if (!description) return { success: false, error: 'Description is required.' }
    if (!transactionType) return { success: false, error: 'Transaction type is required.' }
    if (!amount) return { success: false, error: 'Amount must be greater than zero.' }
    if (!financialAccount) return { success: false, error: 'Financial account is required.' }

    const sourceBankResolution = await resolveSourceBankIdFromFinancialAccount(financialAccount)
    if (!sourceBankResolution.bankId) {
      return {
        success: false,
        error: sourceBankResolution.error ?? 'Selected financial account has no linked bank.',
      }
    }

    const payload = await getPayload({ config })
    const duplicateReferenceNumber = await isReferenceNumberTaken({
      payload,
      referenceNumber: input.referenceNumber,
      excludeTransactionId: id,
    })

    if (duplicateReferenceNumber) {
      return { success: false, error: 'Reference number already exists.' }
    }

    await payload.update({
      collection: 'transactions',
      id,
      data: mapTransactionInput({
        ...input,
        sourceAccount: sourceBankResolution.bankId,
        description,
        transactionType,
        amount,
        transactionFee,
        financialAccount,
      }),
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
      const receiptResult = await createTransactionReceiptFromFormData(formData)
      if (!receiptResult.success || !receiptResult.id) {
        return { success: false, error: receiptResult.error ?? 'Failed to save receipt.' }
      }

      if (existingReceiptImageId) {
        await deleteTransactionReceiptById(existingReceiptImageId)
      }

      receiptImageId = receiptResult.id
      rawOcrText = receiptResult.rawOcrText
    } else if (!receiptImageId && existingReceiptImageId) {
      await deleteTransactionReceiptById(existingReceiptImageId)
    }

    return await updateTransaction(id, {
      transactionDate: String(formData.get('transactionDate') || '').trim() || undefined,
      description: String(formData.get('description') || '').trim(),
      particulars: String(formData.get('particulars') || '').trim() || undefined,
      transactionType: normalizeTransactionType(formData.get('transactionType')),
      sourceAccount: String(formData.get('sourceAccount') || '').trim() || undefined,
      destinationAccount: String(formData.get('destinationAccount') || '').trim() || undefined,
      financialAccount: String(formData.get('financialAccount') || '').trim() || undefined,
      from: String(formData.get('from') || '').trim() || undefined,
      to: String(formData.get('to') || '').trim() || undefined,
      referenceNumber: String(formData.get('referenceNumber') || '').trim() || undefined,
      amount: normalizeAmount(formData.get('amount')),
      transactionFee: normalizeNonNegativeAmount(formData.get('transactionFee')),
      transactionStatus: normalizeTransactionStatus(formData.get('transactionStatus')),
      receiptImageId,
      rawOcrText,
    })
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

export async function analyzeReceiptFile(formData: FormData): Promise<ReceiptAnalysisResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const file = formData.get('file')
    if (!(file instanceof File)) return { success: false, error: 'No file provided.' }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { rawText } = await extractTextFromImageBuffer(buffer)
    const banksResult = await getBanks()
    const selectedFinancialAccountId = String(formData.get('financialAccount') || '').trim()

    const sourceBankResolution = selectedFinancialAccountId
      ? await resolveSourceBankIdFromFinancialAccount(selectedFinancialAccountId)
      : { bankId: undefined }

    try {
      const extraction = await extractTransactionWithGroq({
        rawOcrText: rawText,
        banks: banksResult.data,
      })

      const readableDescription =
        createReadableDescriptionFromParticulars(extraction.extracted.particulars) ??
        extraction.extracted.description

      const detectedSourceBank = banksResult.data.find(
        (bank) => bank.code === extraction.detectedSourceBankCode,
      )
      const detectedDestinationBank = banksResult.data.find(
        (bank) => bank.code === extraction.detectedDestinationBankCode,
      )

      const inferredTransactionType = inferTransactionTypeFromBankContext({
        extractedType: extraction.extracted.transactionType,
        selectedBankId: sourceBankResolution.bankId,
        detectedDestinationBankId: detectedDestinationBank?.id,
        fromText: extraction.extracted.from,
        toText: extraction.extracted.to,
        banks: banksResult.data,
      })

      return {
        success: true,
        rawOcrText: rawText,
        detectedSourceBankId: detectedSourceBank?.id,
        detectedDestinationBankId: detectedDestinationBank?.id,
        transactionDate: extraction.extracted.transactionDate,
        description: readableDescription,
        particulars: extraction.extracted.particulars ?? extraction.extracted.description,
        transactionType: inferredTransactionType,
        referenceNumber: extraction.extracted.referenceNumber,
        amount: extraction.extracted.amount,
        transactionFee: extraction.extracted.transactionFee ?? 0,
        transactionStatus: extraction.extracted.transactionStatus,
        from: extraction.extracted.from,
        to: extraction.extracted.to,
        confidence: extraction.confidence,
      }
    } catch (groqError) {
      const errMsg = groqError instanceof Error ? groqError.message : String(groqError)
      console.error('Groq extraction failed during file analysis:', errMsg)
      return {
        success: true,
        rawOcrText: rawText,
        error: `AI extraction failed: ${errMsg}`,
      }
    }
  } catch (error) {
    console.error('Failed to analyze receipt file:', error)
    return { success: false, error: 'Failed to analyze receipt.' }
  }
}

export async function processTransactionReceipt(
  transactionId: string,
): Promise<ProcessTransactionReceiptResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, status: 'failed', error: 'Unauthorized' }
    }

    const payload = await getPayload({ config })
    const tx = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 1,
    })

    const receipt = (tx as any).receiptImage
    if (!receipt) {
      return {
        success: false,
        status: 'failed',
        error: 'Receipt image is required before processing.',
      }
    }

    const receiptImageId = typeof receipt === 'string' ? receipt : String(receipt.id)
    let receiptImageFileName: string | undefined
    let receiptImageUrl: string | undefined =
      typeof receipt === 'object' && receipt.url ? String(receipt.url) : undefined

    if (typeof receipt === 'object' && receipt.filename) {
      receiptImageFileName = String(receipt.filename)
    }

    if (!receiptImageUrl || !receiptImageFileName) {
      try {
        const receiptDoc = await payload.findByID({
          collection: 'transaction-receipts',
          id: receiptImageId,
          depth: 0,
        })

        if (!receiptImageFileName && (receiptDoc as any).filename) {
          receiptImageFileName = String((receiptDoc as any).filename)
        }
        if (!receiptImageUrl && (receiptDoc as any).url) {
          receiptImageUrl = String((receiptDoc as any).url)
        }
      } catch (error) {
        console.error('Failed to resolve receipt image for processing:', error)
      }
    }

    if (!receiptImageUrl && receiptImageFileName) {
      receiptImageUrl = `/api/transaction-receipts/file/${encodeURIComponent(receiptImageFileName)}`
    }
    if (!receiptImageUrl) {
      receiptImageUrl = `/api/transaction-receipts/${receiptImageId}`
    }

    let rawOcrText = (tx as any).rawOcrText ? String((tx as any).rawOcrText) : ''
    let ocrPersisted = false

    if (!rawOcrText.trim()) {
      const resolvedImageUrl = receiptImageUrl.startsWith('http')
        ? receiptImageUrl
        : `${getServerSideURL()}${receiptImageUrl}`

      const imageResponse = await fetch(resolvedImageUrl)
      if (!imageResponse.ok) {
        return {
          success: false,
          status: 'failed',
          error: `Failed to fetch receipt image (${imageResponse.status}).`,
        }
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const ocrResult = await extractTextFromImageBuffer(imageBuffer)
      rawOcrText = ocrResult.rawText

      await payload.update({
        collection: 'transactions',
        id: transactionId,
        data: {
          rawOcrText,
          isAiGenerated: true,
        },
        depth: 0,
      })
      ocrPersisted = true
    }

    const banksResult = await getBanks()

    try {
      const extraction = await extractTransactionWithGroq({
        rawOcrText,
        banks: banksResult.data,
      })

      const readableDescription =
        createReadableDescriptionFromParticulars(extraction.extracted.particulars) ??
        extraction.extracted.description

      const destinationBank = banksResult.data.find(
        (bank) => bank.code === extraction.detectedDestinationBankCode,
      )

      const txFinancialAccountId =
        (tx as any).financialAccount && typeof (tx as any).financialAccount === 'object'
          ? String((tx as any).financialAccount.id)
          : (tx as any).financialAccount
            ? String((tx as any).financialAccount)
            : ''

      const sourceBankResolution = txFinancialAccountId
        ? await resolveSourceBankIdFromFinancialAccount(txFinancialAccountId)
        : { bankId: undefined }

      const inferredTransactionType = inferTransactionTypeFromBankContext({
        extractedType: extraction.extracted.transactionType,
        selectedBankId: sourceBankResolution.bankId,
        detectedDestinationBankId: destinationBank?.id,
        fromText: extraction.extracted.from,
        toText: extraction.extracted.to,
        banks: banksResult.data,
      })

      await payload.update({
        collection: 'transactions',
        id: transactionId,
        data: {
          aiExtractedJson: extraction.rawJson as Record<string, unknown>,
          extractionConfidence: extraction.confidence,
          sourceAccount: sourceBankResolution.bankId ?? (tx as any).sourceAccount ?? null,
          destinationAccount: destinationBank?.id ?? (tx as any).destinationAccount ?? null,
          transactionDate:
            normalizeTransactionDate(extraction.extracted.transactionDate) ??
            (tx as any).transactionDate ??
            null,
          description: readableDescription ?? (tx as any).description ?? null,
          particulars:
            extraction.extracted.particulars ??
            extraction.extracted.description ??
            (tx as any).particulars ??
            null,
          transactionType: inferredTransactionType ?? (tx as any).transactionType ?? null,
          from: extraction.extracted.from ?? (tx as any).from ?? null,
          to: extraction.extracted.to ?? (tx as any).to ?? null,
          referenceNumber:
            extraction.extracted.referenceNumber ?? (tx as any).referenceNumber ?? null,
          amount:
            typeof extraction.extracted.amount === 'number'
              ? extraction.extracted.amount
              : ((tx as any).amount ?? null),
          transactionFee:
            typeof extraction.extracted.transactionFee === 'number'
              ? extraction.extracted.transactionFee
              : ((tx as any).transactionFee ?? 0),
          transactionStatus:
            extraction.extracted.transactionStatus ?? (tx as any).transactionStatus ?? 'completed',
          isAiGenerated: true,
        },
        depth: 0,
      })

      return { success: true, status: 'success' }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Groq extraction failed:', errMsg)
      return {
        success: false,
        status: ocrPersisted ? 'partial-success' : 'failed',
        error: `AI extraction failed: ${errMsg}`,
      }
    }
  } catch (error) {
    console.error('Failed to process transaction receipt:', error)
    return { success: false, status: 'failed', error: 'Failed to process receipt.' }
  }
}
