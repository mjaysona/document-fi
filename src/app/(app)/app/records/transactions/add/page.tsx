'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  ActionIcon,
  Anchor,
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Table,
  Text,
  Stack,
  TextInput,
  ScrollArea,
  Textarea,
  Tooltip,
  Title,
  Checkbox,
  Switch,
  Box,
  Fieldset,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { DateTimePicker } from '@mantine/dates'
import { ArrowLeft, Ban, CheckCircle, CircleHelp, Pencil, Upload } from 'lucide-react'
import {
  analyzeReceiptFile,
  createTransactionWithReceipt,
  deleteTransaction,
  getBanks,
  getFinancialAccounts,
  getTransactions,
  getTransactionById,
  processTransactionReceipt,
  updateTransactionWithReceipt,
  type BankOption,
  type FinancialAccountOption,
  type TransactionListItem,
  type TransactionStatus,
  type TransactionType,
} from '../actions'
import { useForm } from '@mantine/form'
import classes from '../../page.module.scss'
import { CONTAINER_BREAKPOINTS } from '@/constants/breakpoints'
import { useNavigationHistory } from '@/app/providers/NavigationHistory'

type Feedback = { type: 'success' | 'error'; message: string }

type OriginalTransactionSnapshot = {
  financialAccount: string
  transactionType: TransactionType
  amount: number
  transactionFee: number
}

type TransactionFormValues = {
  transactionDate: string
  description: string
  particulars: string
  transactionType: TransactionType | null
  sourceAccount: string | null
  destinationAccount: string | null
  financialAccount: string | null
  from: string
  to: string
  referenceNumber: string
  amount: number | string
  transactionFee: number | string
  transactionStatus: TransactionStatus | null
  isFundAllocation: boolean
  parentTransaction: string | null
}

type NumericInputValue = number | string

const SUPPORTED_RECEIPT_MIME_TYPES: Set<string> = new Set([
  MIME_TYPES.png,
  MIME_TYPES.jpeg,
  MIME_TYPES.webp,
])

function parseNumericInputValue(
  value: NumericInputValue | '' | null | undefined,
): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim()

  if (!normalized) return undefined

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractFileNameFromReceiptUrl(value: string | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const fromPath = (pathLike: string): string => {
    const [withoutQuery] = pathLike.split('?')
    const parts = withoutQuery.split('/').filter(Boolean)
    if (parts.length === 0) return ''
    return decodeURIComponent(parts[parts.length - 1] || '')
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw)
      return fromPath(parsed.pathname)
    } catch {
      return ''
    }
  }

  return fromPath(raw)
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (typeof value !== 'number') return '-'
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseDateTimeValue(value?: string | null): Date | null {
  const raw = String(value || '').trim()
  if (!raw) return null

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default function AddTransactionPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { getBackPath } = useNavigationHistory()
  const params = useParams<{ id?: string }>()
  const transactionId = params?.id
  const isEditMode = pathname?.includes('/app/records/transactions/') && pathname?.endsWith('/edit')
  const isForAllocation = pathname?.includes('/allocate')

  const [banks, setBanks] = useState<BankOption[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountOption[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode || isForAllocation))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [parentReferenceNumber, setParentReferenceNumber] = useState('')
  const [childTransactions, setChildTransactions] = useState<TransactionListItem[]>([])
  const [allocatedFunds, setAllocatedFunds] = useState(0)

  const form = useForm<TransactionFormValues>({
    initialValues: {
      transactionDate: '',
      description: '',
      particulars: '',
      transactionType: 'debit',
      sourceAccount: null,
      destinationAccount: null,
      financialAccount: null,
      from: '',
      to: '',
      referenceNumber: '',
      amount: '',
      transactionFee: '',
      transactionStatus: 'completed',
      isFundAllocation: false,
      parentTransaction: null,
    },
    validate: {
      transactionDate: (value) => (value ? null : 'Transaction date is required.'),
      transactionType: (value) => (value ? null : 'Transaction type is required.'),
      sourceAccount: (value) => (value ? null : 'Source bank is required.'),
      destinationAccount: (value) => (value ? null : 'Destination bank is required.'),
      from: (value) => (value.trim() ? null : 'From is required.'),
      to: (value) => (value.trim() ? null : 'To is required.'),
      referenceNumber: (value) => (value.trim() ? null : 'Reference number is required.'),
      transactionStatus: (value) => (value ? null : 'Transaction status is required.'),
      financialAccount: () => null, // Validation handled in handleSave
      amount: (value) =>
        typeof parseNumericInputValue(value) === 'number' ? null : 'Amount is required.',
    },
  })

  const isAllocationContext = isForAllocation || Boolean(form.values.parentTransaction)
  const allocationTitleSuffix = parentReferenceNumber ? ` from #${parentReferenceNumber}` : ''

  const [runningBalance, setRunningBalance] = useState<number | ''>('')
  const [originalTransactionSnapshot, setOriginalTransactionSnapshot] =
    useState<OriginalTransactionSnapshot | null>(null)

  const [receiptImageId, setReceiptImageId] = useState('')
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>()
  const [receiptImageFileName, setReceiptImageFileName] = useState('')
  const [receiptPreviewAttempt, setReceiptPreviewAttempt] = useState(0)
  const [receiptPreviewError, setReceiptPreviewError] = useState<string | null>(null)
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null)
  const [pendingRawOcrText, setPendingRawOcrText] = useState<string | undefined>()
  const [pendingAiExtractedJson, setPendingAiExtractedJson] = useState<
    string | number | boolean | null | Record<string, unknown> | unknown[] | undefined
  >()
  const [pendingExtractionConfidence, setPendingExtractionConfidence] = useState<
    number | undefined
  >()
  const [duplicateReferenceTransactionId, setDuplicateReferenceTransactionId] = useState<
    string | null
  >(null)
  const duplicateTransactionEditHref = duplicateReferenceTransactionId
    ? `/app/records/transactions/${duplicateReferenceTransactionId}/edit`
    : null
  const receiptInputRef = useRef<() => void>(() => {})

  const resolveReceiptPreviewError = async (failedUrl: string): Promise<string> => {
    const normalized = String(failedUrl || '').trim()

    if (!normalized) {
      return 'Receipt preview failed.'
    }

    // Blob/data URLs fail client-side and cannot provide a server response body.
    if (normalized.startsWith('blob:') || normalized.startsWith('data:')) {
      return 'Receipt preview failed. Please re-upload the image.'
    }

    try {
      const response = await fetch(normalized, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })

      if (!response.ok) {
        const bodyText = (await response.text()).trim()

        if (bodyText) {
          return bodyText
        }

        const errorMsg = `Failed to load receipt preview (${response.status} ${response.statusText}).`
        return errorMsg
      }

      return 'Receipt image could not be rendered by the browser.'
    } catch (error) {
      const message = error instanceof Error ? error.message.trim() : ''
      return message || 'Failed to load receipt preview.'
    }
  }

  const receiptPreviewCandidates = useMemo(() => {
    const candidates: string[] = []

    const pushCandidate = (value?: string) => {
      const normalized = String(value || '').trim()
      if (!normalized) {
        return
      }
      if (!candidates.includes(normalized)) {
        candidates.push(normalized)
      }
    }

    const normalizedUrl = String(receiptImageUrl || '').trim()

    if (normalizedUrl) {
      if (
        normalizedUrl.startsWith('http://') ||
        normalizedUrl.startsWith('https://') ||
        normalizedUrl.startsWith('/') ||
        normalizedUrl.startsWith('blob:') ||
        normalizedUrl.startsWith('data:')
      ) {
        pushCandidate(normalizedUrl)
        if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
          try {
            const parsed = new URL(normalizedUrl)
            pushCandidate(`${parsed.pathname}${parsed.search}`)
          } catch (e) {
            // URL parsing failed, skip
          }
        }
      } else {
        pushCandidate(`/api/transaction-receipts/file/${encodeURIComponent(normalizedUrl)}`)
      }
    }

    const normalizedReceiptId = String(receiptImageId || '').trim()

    if (normalizedReceiptId) {
      pushCandidate(`/api/transaction-receipts/${encodeURIComponent(normalizedReceiptId)}`)
    }

    const normalizedFilename = String(receiptImageFileName || '').trim()

    if (normalizedFilename) {
      pushCandidate(`/api/transaction-receipts/file/${encodeURIComponent(normalizedFilename)}`)
    }

    return candidates
  }, [receiptImageFileName, receiptImageId, receiptImageUrl])

  const activeReceiptImageUrl =
    receiptPreviewCandidates[
      Math.min(receiptPreviewAttempt, Math.max(0, receiptPreviewCandidates.length - 1))
    ]

  useEffect(() => {
    setReceiptPreviewAttempt(0)
    setReceiptPreviewError(null)
  }, [receiptImageUrl, receiptImageFileName, receiptImageId])

  const loadChildTransactions = async (parentId: string, isFundAllocation: boolean) => {
    if (!isFundAllocation) {
      setChildTransactions([])
      return
    }

    const transactionsResult = await getTransactions()
    if (!transactionsResult.success) {
      setChildTransactions([])
      return
    }

    const children = transactionsResult.data.filter(
      (tx) => (tx.parentTransaction ?? null) === parentId,
    )

    children.sort((a, b) => {
      const aTs = a.transactionDate ? new Date(a.transactionDate).getTime() : -Infinity
      const bTs = b.transactionDate ? new Date(b.transactionDate).getTime() : -Infinity
      if (aTs === bTs) return 0
      return aTs > bTs ? -1 : 1
    })

    setChildTransactions(children)
  }

  const hydrateFromTransaction = async () => {
    if (!isEditMode || !transactionId) return

    const refreshed = await getTransactionById(transactionId)
    if (!refreshed.success || !refreshed.data) return

    const tx = refreshed.data
    form.setValues({
      transactionDate: tx.transactionDate ?? '',
      description: tx.description,
      particulars: tx.particulars ?? '',
      transactionType: tx.transactionType ?? null,
      destinationAccount: tx.destinationAccount ?? null,
      from: tx.from ?? '',
      to: tx.to ?? '',
      referenceNumber: tx.referenceNumber ?? '',
      amount: typeof tx.amount === 'number' ? tx.amount : '',
      transactionFee: typeof tx.transactionFee === 'number' ? tx.transactionFee : '',
      transactionStatus: tx.transactionStatus ?? 'completed',
      isFundAllocation: tx.isFundAllocation ?? false,
      parentTransaction: tx.parentTransaction ?? null,
    })

    const nextFinancialAccount = tx.financialAccount ?? null
    form.setFieldValue('financialAccount', nextFinancialAccount)
    if (nextFinancialAccount) {
      const selectedAccount = financialAccounts.find(
        (account) => account.id === nextFinancialAccount,
      )
      form.setFieldValue('sourceAccount', selectedAccount?.bankId ?? tx.sourceAccount ?? null)
    } else {
      form.setFieldValue('sourceAccount', tx.sourceAccount ?? null)
    }
    form.clearFieldError('referenceNumber')
    setRunningBalance(typeof tx.runningBalance === 'number' ? tx.runningBalance : '')
    setAllocatedFunds(typeof tx.allocatedFunds === 'number' ? tx.allocatedFunds : 0)
    setOriginalTransactionSnapshot(
      tx.financialAccount &&
        tx.transactionType &&
        typeof tx.amount === 'number' &&
        Number.isFinite(tx.amount)
        ? {
            financialAccount: tx.financialAccount,
            transactionType: tx.transactionType,
            amount: tx.amount,
            transactionFee: typeof tx.transactionFee === 'number' ? tx.transactionFee : 0,
          }
        : null,
    )
    const hydratedReceiptId = tx.receiptImageId ?? ''

    const hydratedReceiptFileName =
      tx.receiptImageFileName ?? extractFileNameFromReceiptUrl(tx.receiptImageUrl)

    const hydratedReceiptUrl =
      tx.receiptImageUrl ??
      (hydratedReceiptFileName
        ? `/api/transaction-receipts/file/${encodeURIComponent(hydratedReceiptFileName)}`
        : undefined)

    setReceiptImageId(hydratedReceiptId)
    setReceiptImageUrl(hydratedReceiptUrl)
    setReceiptImageFileName(hydratedReceiptFileName)

    setPendingReceiptFile(null)
    setPendingRawOcrText(tx.rawOcrText ?? undefined)
    setPendingAiExtractedJson(tx.aiExtractedJson)
    setPendingExtractionConfidence(tx.extractionConfidence)
    await loadChildTransactions(String(tx.id), tx.isFundAllocation === true)

    const parentId = tx.parentTransaction ?? null
    if (parentId) {
      const parentResult = await getTransactionById(parentId)
      if (parentResult.success && parentResult.data?.referenceNumber) {
        setParentReferenceNumber(parentResult.data.referenceNumber)
      } else {
        setParentReferenceNumber('')
      }
    } else {
      setParentReferenceNumber('')
    }
  }

  const handleRemoveAttachedImage = () => {
    setReceiptImageId('')
    setReceiptImageFileName('')
    setReceiptImageUrl(undefined)
    setPendingReceiptFile(null)
    setPendingRawOcrText(undefined)
    setPendingAiExtractedJson(undefined)
    setPendingExtractionConfidence(undefined)
  }

  const handleFileAnalysis = async (file: File): Promise<boolean> => {
    if (!SUPPORTED_RECEIPT_MIME_TYPES.has(file.type)) {
      setFeedback({
        type: 'error',
        message: 'Unsupported image format. Please upload PNG, JPEG, or WEBP.',
      })
      return false
    }

    setReceiptImageUrl(URL.createObjectURL(file))
    setReceiptImageFileName(file.name)
    setPendingReceiptFile(file)
    setPendingRawOcrText(undefined)
    setPendingAiExtractedJson(undefined)
    setPendingExtractionConfidence(undefined)
    setFeedback(null)
    setIsUploadingReceipt(true)

    const formData = new FormData()
    formData.append('file', file)
    if (form.values.financialAccount)
      formData.append('financialAccount', form.values.financialAccount)
    const result = await analyzeReceiptFile(formData)

    if (result.success || result.rawOcrText) {
      setPendingRawOcrText(result.rawOcrText)
      setPendingAiExtractedJson(result.aiExtractedJson)
      setPendingExtractionConfidence(result.confidence)
      if (result.transactionDate) {
        const parsed = new Date(result.transactionDate)
        if (!Number.isNaN(parsed.getTime())) {
          form.setFieldValue('transactionDate', parsed.toISOString())
        }
      }
      if (result.description) form.setFieldValue('description', result.description)
      if (result.particulars) form.setFieldValue('particulars', result.particulars)
      // Skip transactionType in allocation mode (it's always debit)
      if (result.transactionType && !isAllocationContext)
        form.setFieldValue('transactionType', result.transactionType)
      if (
        result.detectedSourceBankId &&
        (result.transactionType === 'credit' || isAllocationContext)
      )
        form.setFieldValue('sourceAccount', result.detectedSourceBankId)
      if (
        result.detectedDestinationBankId &&
        (result.transactionType === 'debit' || isAllocationContext)
      )
        form.setFieldValue('destinationAccount', result.detectedDestinationBankId)
      if (result.from && (result.transactionType === 'credit' || isAllocationContext))
        form.setFieldValue('from', result.from)
      if (result.to && (result.transactionType === 'debit' || isAllocationContext))
        form.setFieldValue('to', result.to)
      if (result.referenceNumber) form.setFieldValue('referenceNumber', result.referenceNumber)
      if (typeof result.amount === 'number') form.setFieldValue('amount', result.amount)
      if (typeof result.transactionFee === 'number')
        form.setFieldValue('transactionFee', result.transactionFee)
      if (result.transactionStatus)
        form.setFieldValue('transactionStatus', result.transactionStatus)

      if (result.error) {
        setFeedback({ type: 'error', message: `OCR complete. ${result.error}` })
      }
      setIsUploadingReceipt(false)
      return true
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to analyze receipt.' })
      setIsUploadingReceipt(false)
      return false
    }
  }

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(Boolean(isEditMode || isForAllocation))

      const [banksResult, accountsResult] = await Promise.all([getBanks(), getFinancialAccounts()])

      if (!isMounted) return
      if (banksResult.success) setBanks(banksResult.data)
      if (accountsResult.success) setFinancialAccounts(accountsResult.data)

      if (isForAllocation) {
        // Load parent transaction for allocation
        if (!transactionId) {
          setFeedback({ type: 'error', message: 'Missing parent transaction ID.' })
          setIsLoading(false)
          return
        }

        const parentResult = await getTransactionById(transactionId)
        if (!isMounted) return

        if (!parentResult.success || !parentResult.data) {
          setFeedback({
            type: 'error',
            message: parentResult.error ?? 'Failed to load parent transaction.',
          })
          setIsLoading(false)
          return
        }

        // Set parent transaction ID and transaction type to debit
        form.setFieldValue('parentTransaction', transactionId)
        form.setFieldValue('transactionType', 'debit')
        form.setFieldValue('isFundAllocation', false)
        setParentReferenceNumber(parentResult.data.referenceNumber ?? '')

        // Set transaction date to today
        const today = new Date()
        form.setFieldValue('transactionDate', today.toISOString())

        setIsLoading(false)
        return
      }

      if (!isEditMode) {
        setIsLoading(false)
        return
      }

      if (!transactionId) {
        setFeedback({ type: 'error', message: 'Missing transaction ID.' })
        setIsLoading(false)
        return
      }

      const transactionResult = await getTransactionById(transactionId)
      if (!isMounted) return

      if (!transactionResult.success || !transactionResult.data) {
        setFeedback({
          type: 'error',
          message: transactionResult.error ?? 'Failed to load transaction.',
        })
        setIsLoading(false)
        return
      }

      const tx = transactionResult.data
      form.setValues({
        transactionDate: tx.transactionDate ?? '',
        description: tx.description,
        particulars: tx.particulars ?? '',
        transactionType: tx.transactionType ?? null,
        destinationAccount: tx.destinationAccount ?? null,
        from: tx.from ?? '',
        to: tx.to ?? '',
        referenceNumber: tx.referenceNumber ?? '',
        amount: typeof tx.amount === 'number' ? tx.amount : '',
        transactionFee: typeof tx.transactionFee === 'number' ? tx.transactionFee : 0,
        transactionStatus: tx.transactionStatus ?? 'completed',
        isFundAllocation: tx.isFundAllocation ?? false,
        parentTransaction: tx.parentTransaction ?? null,
      })

      const nextFinancialAccount = tx.financialAccount ?? null
      form.setFieldValue('financialAccount', nextFinancialAccount)
      const isChildTransaction = Boolean(tx.parentTransaction)
      if (!nextFinancialAccount && !isChildTransaction) {
        const defaultAccount = accountsResult.success
          ? accountsResult.data.find((account) => account.isDefault)
          : undefined
        if (defaultAccount) {
          form.setFieldValue('financialAccount', defaultAccount.id)
          form.setFieldValue('sourceAccount', defaultAccount.bankId ?? null)
        }
      } else if (!nextFinancialAccount) {
        form.setFieldValue('sourceAccount', tx.sourceAccount ?? null)
      } else {
        const selectedAccount = accountsResult.success
          ? accountsResult.data.find((account) => account.id === nextFinancialAccount)
          : undefined
        form.setFieldValue('sourceAccount', selectedAccount?.bankId ?? tx.sourceAccount ?? null)
      }
      form.clearFieldError('referenceNumber')
      setRunningBalance(typeof tx.runningBalance === 'number' ? tx.runningBalance : '')
      setAllocatedFunds(typeof tx.allocatedFunds === 'number' ? tx.allocatedFunds : 0)
      setOriginalTransactionSnapshot(
        tx.financialAccount &&
          tx.transactionType &&
          typeof tx.amount === 'number' &&
          Number.isFinite(tx.amount)
          ? {
              financialAccount: tx.financialAccount,
              transactionType: tx.transactionType,
              amount: tx.amount,
              transactionFee: typeof tx.transactionFee === 'number' ? tx.transactionFee : 0,
            }
          : null,
      )
      const hydratedReceiptId = tx.receiptImageId ?? ''

      const hydratedReceiptFileName =
        tx.receiptImageFileName ?? extractFileNameFromReceiptUrl(tx.receiptImageUrl)

      const hydratedReceiptUrl =
        tx.receiptImageUrl ??
        (hydratedReceiptFileName
          ? `/api/transaction-receipts/file/${encodeURIComponent(hydratedReceiptFileName)}`
          : undefined)

      setReceiptImageId(hydratedReceiptId)
      setReceiptImageUrl(hydratedReceiptUrl)
      setReceiptImageFileName(hydratedReceiptFileName)

      setPendingReceiptFile(null)
      setPendingRawOcrText(undefined)
      setPendingAiExtractedJson(tx.aiExtractedJson)
      setPendingExtractionConfidence(tx.extractionConfidence)
      await loadChildTransactions(String(tx.id), tx.isFundAllocation === true)

      if (tx.parentTransaction) {
        const parentTxResult = await getTransactionById(tx.parentTransaction)
        if (!isMounted) return
        if (parentTxResult.success && parentTxResult.data?.referenceNumber) {
          setParentReferenceNumber(parentTxResult.data.referenceNumber)
        } else {
          setParentReferenceNumber('')
        }
      } else {
        setParentReferenceNumber('')
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [isEditMode, isForAllocation, transactionId])

  useEffect(() => {
    // Skip default account selection in allocation mode
    if (isAllocationContext) return
    if (form.values.financialAccount || financialAccounts.length === 0) return

    const defaultAccount = financialAccounts.find((account) => account.isDefault)
    if (defaultAccount && form.values.financialAccount !== defaultAccount.id) {
      form.setFieldValue('financialAccount', defaultAccount.id)
    }
  }, [financialAccounts, form.values.financialAccount, isAllocationContext])

  useEffect(() => {
    // Skip automatic account syncing in allocation mode
    if (isAllocationContext) return
    if (!form.values.financialAccount || financialAccounts.length === 0) return

    const selectedAccount = financialAccounts.find(
      (account) => account.id === form.values.financialAccount,
    )

    if (!selectedAccount) return

    // If destination bank is empty, transaction type is credit, and not allocation context, default to financial account's bank
    if (!isAllocationContext && selectedAccount.bankId) {
      if (form.values.transactionType === 'credit' && !form.values.destinationAccount) {
        form.setFieldValue('destinationAccount', selectedAccount.bankId)
        form.setFieldValue('to', selectedAccount.name)
      } else if (form.values.transactionType === 'debit' && !form.values.sourceAccount) {
        form.setFieldValue('sourceAccount', selectedAccount.bankId)
        form.setFieldValue('from', selectedAccount.name)
      }
    }
  }, [
    financialAccounts,
    form.values.financialAccount,
    isAllocationContext,
    form.values.transactionType,
    form.values.sourceAccount,
    form.values.destinationAccount,
  ])

  // Set transaction date to today when creating a new transaction
  useEffect(() => {
    if (isEditMode || isAllocationContext || form.values.transactionDate) return

    const today = new Date()
    form.setFieldValue('transactionDate', today.toISOString())
  }, [isEditMode, isAllocationContext, form.values.transactionDate])

  const selectedAccountCurrentBalance = useMemo<number | ''>(() => {
    if (!form.values.financialAccount) return ''

    const selectedAccount = financialAccounts.find(
      (account) => account.id === form.values.financialAccount,
    )
    return typeof selectedAccount?.currentBalance === 'number' ? selectedAccount.currentBalance : ''
  }, [financialAccounts, form.values.financialAccount])

  const projectedRunningBalance = useMemo<number | ''>(() => {
    if (
      !form.values.financialAccount ||
      form.values.amount === '' ||
      !form.values.transactionType
    ) {
      return runningBalance
    }

    const selectedAccount = financialAccounts.find(
      (account) => account.id === form.values.financialAccount,
    )
    if (!selectedAccount || typeof selectedAccount.currentBalance !== 'number') {
      return runningBalance
    }

    const fee = parseNumericInputValue(form.values.transactionFee) ?? 0
    const amountNumber = parseNumericInputValue(form.values.amount)
    if (typeof amountNumber !== 'number') return runningBalance

    const signedImpact = (form.values.transactionType === 'credit' ? 1 : -1) * (amountNumber + fee)
    let baselineBalance = selectedAccount.currentBalance

    if (
      isEditMode &&
      originalTransactionSnapshot &&
      originalTransactionSnapshot.financialAccount === form.values.financialAccount
    ) {
      const originalSignedImpact =
        (originalTransactionSnapshot.transactionType === 'credit' ? 1 : -1) *
        (originalTransactionSnapshot.amount + originalTransactionSnapshot.transactionFee)
      baselineBalance -= originalSignedImpact
    }

    return baselineBalance + signedImpact
  }, [
    financialAccounts,
    form.values.amount,
    form.values.financialAccount,
    form.values.transactionFee,
    form.values.transactionType,
    isEditMode,
    originalTransactionSnapshot,
    runningBalance,
  ])

  const createFormData = () => {
    const parsedAmount = parseNumericInputValue(form.values.amount)
    const parsedTransactionFee = parseNumericInputValue(form.values.transactionFee) ?? 0

    const formData = new FormData()
    if (pendingReceiptFile) formData.append('file', pendingReceiptFile)
    formData.append('description', form.values.description.trim())
    if (form.values.transactionDate) formData.append('transactionDate', form.values.transactionDate)
    if (form.values.particulars.trim())
      formData.append('particulars', form.values.particulars.trim())
    if (form.values.transactionType) formData.append('transactionType', form.values.transactionType)
    if (form.values.sourceAccount) formData.append('sourceAccount', form.values.sourceAccount)
    if (form.values.destinationAccount)
      formData.append('destinationAccount', form.values.destinationAccount)
    if (form.values.financialAccount)
      formData.append('financialAccount', form.values.financialAccount)
    if (form.values.from.trim()) formData.append('from', form.values.from.trim())
    if (form.values.to.trim()) formData.append('to', form.values.to.trim())
    if (form.values.referenceNumber.trim())
      formData.append('referenceNumber', form.values.referenceNumber.trim())
    formData.append('amount', String(parsedAmount))
    formData.append('transactionFee', String(parsedTransactionFee))
    if (typeof selectedAccountCurrentBalance === 'number') {
      formData.append('currentBalance', String(selectedAccountCurrentBalance))
    }
    formData.append('transactionStatus', form.values.transactionStatus || 'completed')
    formData.append('isFundAllocation', String(form.values.isFundAllocation))
    if (form.values.parentTransaction)
      formData.append('parentTransaction', form.values.parentTransaction)
    if (receiptImageId) formData.append('existingReceiptImageId', receiptImageId)
    if (pendingRawOcrText) formData.append('rawOcrText', pendingRawOcrText)
    if (typeof pendingAiExtractedJson !== 'undefined') {
      formData.append('aiExtractedJson', JSON.stringify(pendingAiExtractedJson))
    }
    if (
      typeof pendingExtractionConfidence === 'number' &&
      Number.isFinite(pendingExtractionConfidence)
    ) {
      formData.append('extractionConfidence', String(pendingExtractionConfidence))
    }

    return { formData, parsedAmount, parsedTransactionFee }
  }

  const handleSave = async () => {
    setFeedback(null)
    form.clearFieldError('referenceNumber')
    setDuplicateReferenceTransactionId(null)

    const validation = form.validate()

    // Add custom validation for financialAccount - only required if not allocating
    if (!isAllocationContext && !form.values.financialAccount) {
      form.setFieldError('financialAccount', 'Financial account is required.')
      return
    }

    if (validation.hasErrors) {
      return
    }

    const { formData, parsedAmount } = createFormData()
    if (typeof parsedAmount !== 'number') {
      return
    }

    setIsSaving(true)

    if (isEditMode && transactionId) {
      const result = await updateTransactionWithReceipt(transactionId, formData)

      if (result.success) {
        setPendingReceiptFile(null)
        setFeedback({ type: 'success', message: 'Transaction updated.' })
        await hydrateFromTransaction()
      } else {
        if (result.error === 'Reference number already exists.') {
          form.setFieldError('referenceNumber', result.error)
          setDuplicateReferenceTransactionId(result.existingTransactionId ?? null)
        } else {
          setDuplicateReferenceTransactionId(null)
          setFeedback({ type: 'error', message: result.error ?? 'Failed to update transaction.' })
        }
      }
    } else {
      const result = await createTransactionWithReceipt(formData)

      if (result.success && result.id) {
        setFeedback({ type: 'success', message: 'Transaction created successfully.' })
        // Wait a moment to show the success message before redirecting
        await new Promise((resolve) => setTimeout(resolve, 800))

        if (isAllocationContext) {
          const parentTransactionId = form.values.parentTransaction || transactionId
          if (parentTransactionId) {
            router.push(`/app/records/transactions/${parentTransactionId}/edit`)
          } else {
            router.push(`/app/records/transactions`)
          }
        } else {
          router.push(`/app/records/transactions`)
        }
      } else {
        if (result.error === 'Reference number already exists.') {
          form.setFieldError('referenceNumber', result.error)
          setDuplicateReferenceTransactionId(result.existingTransactionId ?? null)
        } else {
          setDuplicateReferenceTransactionId(null)
          setFeedback({ type: 'error', message: result.error ?? 'Failed to create transaction.' })
        }
      }
    }

    setIsSaving(false)
  }

  const handleSaveAndAllocate = async () => {
    setFeedback(null)
    form.clearFieldError('referenceNumber')
    setDuplicateReferenceTransactionId(null)

    const validation = form.validate()
    if (validation.hasErrors) {
      return
    }

    const { formData, parsedAmount } = createFormData()
    if (typeof parsedAmount !== 'number') {
      return
    }

    setIsSaving(true)

    if (isEditMode && transactionId) {
      // In edit mode, save first so isFundAllocation and other edits persist before redirect.
      const result = await updateTransactionWithReceipt(transactionId, formData)

      if (result.success) {
        setPendingReceiptFile(null)
        setFeedback({ type: 'success', message: 'Transaction updated.' })
        router.push(`/app/records/transactions/${transactionId}/allocate`)
      } else {
        if (result.error === 'Reference number already exists.') {
          form.setFieldError('referenceNumber', result.error)
          setDuplicateReferenceTransactionId(result.existingTransactionId ?? null)
        } else {
          setDuplicateReferenceTransactionId(null)
          setFeedback({ type: 'error', message: result.error ?? 'Failed to update transaction.' })
        }
      }
    } else {
      // In create mode, save first then redirect
      const result = await createTransactionWithReceipt(formData)

      if (result.success && result.id) {
        setFeedback({ type: 'success', message: 'Transaction created successfully.' })
        // Wait a moment to show the success message before redirecting
        await new Promise((resolve) => setTimeout(resolve, 800))
        router.push(`/app/records/transactions/${result.id}/allocate`)
      } else {
        if (result.error === 'Reference number already exists.') {
          form.setFieldError('referenceNumber', result.error)
          setDuplicateReferenceTransactionId(result.existingTransactionId ?? null)
        } else {
          setDuplicateReferenceTransactionId(null)
          setFeedback({ type: 'error', message: result.error ?? 'Failed to create transaction.' })
        }
      }
    }

    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!isEditMode || !transactionId) return

    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!isEditMode || !transactionId) return

    setFeedback(null)
    setDeleteConfirmOpen(false)
    setIsDeleting(true)

    const result = await deleteTransaction(transactionId)
    if (result.success) {
      router.push('/app/records/transactions')
      return
    }

    setFeedback({ type: 'error', message: result.error ?? 'Failed to delete transaction.' })
    setIsDeleting(false)
  }

  const handleProcessReceipt = async () => {
    if (!isEditMode || !transactionId) return

    if (pendingReceiptFile) {
      const analyzed = await handleFileAnalysis(pendingReceiptFile)
      if (analyzed) {
        setFeedback({
          type: 'success',
          message: 'Receipt analyzed locally. Save to persist before server processing.',
        })
      }
      return
    }

    if (!receiptImageId) {
      setFeedback({ type: 'error', message: 'Save a receipt image first.' })
      return
    }

    setFeedback(null)
    setIsProcessingReceipt(true)

    const result = await processTransactionReceipt(transactionId)
    if (result.rawOcrText) {
      setPendingRawOcrText(result.rawOcrText)
    }
    setPendingAiExtractedJson(result.aiExtractedJson)
    setPendingExtractionConfidence(result.confidence)

    if (result.success || result.status === 'partial-success') {
      if (result.transactionDate) {
        const parsed = new Date(result.transactionDate)
        if (!Number.isNaN(parsed.getTime())) {
          form.setFieldValue('transactionDate', parsed.toISOString())
        }
      }
      if (result.description) form.setFieldValue('description', result.description)
      if (result.particulars) form.setFieldValue('particulars', result.particulars)
      if (result.transactionType && !isAllocationContext)
        // Skip transactionType in allocation mode (it's always debit)
        form.setFieldValue('transactionType', result.transactionType)
      if (
        result.detectedSourceBankId &&
        (result.transactionType === 'credit' || isAllocationContext)
      )
        form.setFieldValue('sourceAccount', result.detectedSourceBankId)
      if (
        result.detectedDestinationBankId &&
        (result.transactionType === 'debit' || isAllocationContext)
      )
        form.setFieldValue('destinationAccount', result.detectedDestinationBankId)
      if (result.from && (result.transactionType === 'credit' || isAllocationContext))
        form.setFieldValue('from', result.from)
      if (result.to && (result.transactionType === 'debit' || isAllocationContext))
        form.setFieldValue('to', result.to)
      if (result.referenceNumber) form.setFieldValue('referenceNumber', result.referenceNumber)
      if (typeof result.amount === 'number') form.setFieldValue('amount', result.amount)
      if (typeof result.transactionFee === 'number')
        form.setFieldValue('transactionFee', result.transactionFee)
      if (result.transactionStatus)
        form.setFieldValue('transactionStatus', result.transactionStatus)
    }

    if (result.success) {
      setFeedback({ type: 'success', message: 'Receipt processed. Review fields, then save.' })
    } else if (result.status === 'partial-success') {
      setFeedback({
        type: 'success',
        message: result.error ?? 'OCR complete. Review fields, then save.',
      })
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to process receipt.' })
    }

    setIsProcessingReceipt(false)
  }

  const overlayVisible = isUploadingReceipt || isProcessingReceipt

  return (
    <div className={classes.wrapper}>
      <div style={{ flex: 1, marginBottom: 16 }}>
        <Group mb="md" justify="space-between">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="default"
              size="lg"
              radius="sm"
              aria-label="Back"
              onClick={() => router.push(getBackPath('/app/records/transactions'))}
            >
              <ArrowLeft size={16} />
            </ActionIcon>
            <Title order={5}>
              {isAllocationContext
                ? isEditMode
                  ? `Edit allocated funds${allocationTitleSuffix}`
                  : `Allocate funds${allocationTitleSuffix}`
                : isEditMode
                  ? 'Edit transaction'
                  : 'New transaction'}
            </Title>
          </Group>
          <Group>
            {!isAllocationContext && (
              <Group gap="xxs">
                <Switch
                  label="Fund allocation"
                  checked={form.values.isFundAllocation}
                  onChange={(e) => form.setFieldValue('isFundAllocation', e.currentTarget.checked)}
                />
                <Tooltip label="Fund allocation - receiving account allocates across multiple transactions">
                  <span style={{ display: 'inline-flex', cursor: 'help' }}>
                    <CircleHelp size={14} />
                  </span>
                </Tooltip>
              </Group>
            )}
            {!isAllocationContext && form.values.isFundAllocation && (
              <Button
                size="xs"
                variant="outline"
                onClick={handleSaveAndAllocate}
                loading={isSaving || isDeleting || overlayVisible || isLoading}
                disabled={isDeleting}
              >
                Allocate funds
              </Button>
            )}
            {!isAllocationContext && isEditMode && transactionId && (
              <Button
                size="xs"
                variant="default"
                color="red"
                onClick={handleDelete}
                loading={isDeleting}
                disabled={isSaving || overlayVisible || isLoading}
              >
                Delete
              </Button>
            )}
          </Group>
        </Group>

        {feedback && (
          <Alert
            withCloseButton
            color={feedback.type === 'success' ? 'green' : 'red'}
            title="Notice"
            mb="md"
          >
            {feedback.message}
          </Alert>
        )}

        {isLoading ? (
          <Text c="dimmed">Loading...</Text>
        ) : (
          <Grid
            type="container"
            breakpoints={CONTAINER_BREAKPOINTS}
            gap="lg"
            className={classes['transaction-form-layout']}
          >
            <Grid.Col span={{ base: 12, md: 6, lg: 8 }} order={{ base: 2, md: 1 }}>
              <Card
                withBorder
                radius="md"
                style={{ position: 'relative' }}
                className={classes['transaction-details-pane']}
              >
                <LoadingOverlay
                  visible={overlayVisible}
                  zIndex={100}
                  overlayProps={{ radius: 'md', blur: 2 }}
                />
                {overlayVisible && (
                  <Text
                    size="sm"
                    fw={600}
                    c="white"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, 28px)',
                      zIndex: 101,
                      pointerEvents: 'none',
                    }}
                  >
                    {isProcessingReceipt ? 'Processing receipt' : 'Analyzing receipt'}
                  </Text>
                )}
                <Text fw={700} mb="md">
                  Transaction Details
                </Text>
                <Grid gap="sm">
                  {!isAllocationContext && (
                    <>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <Select
                          label="Financial Account"
                          searchable
                          data={financialAccounts.map((account) => ({
                            value: account.id,
                            label: `${account.name} ${account.bankName ? ` - ${account.bankName}` : ''}${account.isDefault ? ' (Default)' : ''}`,
                          }))}
                          value={form.values.financialAccount}
                          onChange={(value) => form.setFieldValue('financialAccount', value)}
                          error={form.errors.financialAccount}
                          required
                          disabled={isEditMode}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <NumberInput
                          label="Current Balance"
                          value={selectedAccountCurrentBalance}
                          min={0}
                          leftSection="₱"
                          decimalScale={2}
                          fixedDecimalScale
                          thousandSeparator=","
                          hideControls
                          disabled
                          placeholder="Select financial account"
                        />
                      </Grid.Col>
                    </>
                  )}
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateTimePicker
                      label="Transaction Date"
                      value={parseDateTimeValue(form.values.transactionDate)}
                      onChange={(value) => {
                        if (!value) {
                          form.setFieldValue('transactionDate', '')
                          return
                        }

                        const parsed = new Date(String(value || '').trim())
                        form.setFieldValue(
                          'transactionDate',
                          Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString(),
                        )
                      }}
                      valueFormat="MMM DD, YYYY hh:mm A"
                      clearable={false}
                      error={form.errors.transactionDate}
                      required
                      disabled={!form.values.financialAccount && !isAllocationContext}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Transaction Type"
                      data={[
                        { label: 'Debit (Cash Out)', value: 'debit' },
                        { label: 'Credit (Cash In)', value: 'credit' },
                      ]}
                      value={form.values.transactionType}
                      onChange={(value) => {
                        if (isAllocationContext) return
                        if (value) {
                          const sourceBank = form.values.sourceAccount
                          const destinationBank = form.values.destinationAccount
                          const fromValue = form.values.from
                          const toValue = form.values.to
                          form.setFieldValue('transactionType', value as TransactionType)
                          form.setFieldValue('sourceAccount', destinationBank)
                          form.setFieldValue('destinationAccount', sourceBank)
                          form.setFieldValue('from', toValue)
                          form.setFieldValue('to', fromValue)
                        }
                      }}
                      clearable={false}
                      error={form.errors.transactionType}
                      required
                      disabled={!form.values.financialAccount || isAllocationContext}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Fieldset legend="From" p="sm" m="0" radius="md">
                      <Grid>
                        <Grid.Col>
                          <Select
                            label="Bank"
                            searchable
                            data={banks.map((bank) => ({
                              value: bank.id,
                              label:
                                bank.name && bank.shortName
                                  ? `${bank.name} (${bank.shortName})`
                                  : bank.name || bank.shortName || bank.code || bank.id,
                            }))}
                            value={form.values.sourceAccount}
                            onChange={(value) => form.setFieldValue('sourceAccount', value)}
                            error={form.errors.sourceAccount}
                            required
                            disabled={
                              !isAllocationContext &&
                              (!form.values.financialAccount ||
                                form.values.transactionType === 'debit')
                            }
                          />
                        </Grid.Col>
                        <Grid.Col>
                          <TextInput
                            label="Account name"
                            value={form.values.from}
                            onChange={(e) => form.setFieldValue('from', e.currentTarget.value)}
                            error={form.errors.from}
                            required
                            disabled={
                              !isAllocationContext &&
                              (!form.values.financialAccount ||
                                form.values.transactionType === 'debit')
                            }
                          />
                        </Grid.Col>
                      </Grid>
                    </Fieldset>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Fieldset legend="To" p="sm" m="0" radius="md">
                      <Grid>
                        <Grid.Col>
                          <Select
                            label="Bank"
                            searchable
                            data={banks.map((bank) => ({
                              value: bank.id,
                              label:
                                bank.name && bank.shortName
                                  ? `${bank.name} (${bank.shortName})`
                                  : bank.name || bank.shortName || bank.code || bank.id,
                            }))}
                            value={form.values.destinationAccount}
                            onChange={(value) => form.setFieldValue('destinationAccount', value)}
                            error={form.errors.destinationAccount}
                            required
                            disabled={
                              !isAllocationContext &&
                              (!form.values.financialAccount ||
                                form.values.transactionType === 'credit')
                            }
                          />
                        </Grid.Col>
                        <Grid.Col>
                          <TextInput
                            label="Account name"
                            value={form.values.to}
                            onChange={(e) => form.setFieldValue('to', e.currentTarget.value)}
                            error={form.errors.to}
                            required
                            disabled={
                              !isAllocationContext &&
                              (!form.values.financialAccount ||
                                form.values.transactionType === 'credit')
                            }
                          />
                        </Grid.Col>
                      </Grid>
                    </Fieldset>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Reference Number"
                      value={form.values.referenceNumber}
                      onChange={(e) => {
                        form.setFieldValue('referenceNumber', e.currentTarget.value)
                        form.clearFieldError('referenceNumber')
                        setDuplicateReferenceTransactionId(null)
                      }}
                      error={form.errors.referenceNumber}
                      required
                      disabled={!isAllocationContext && !form.values.financialAccount}
                    />
                    {form.errors.referenceNumber === 'Reference number already exists.' &&
                    duplicateTransactionEditHref ? (
                      <Button
                        component="a"
                        href={duplicateTransactionEditHref}
                        size="xs"
                        variant="outline"
                        mt={6}
                      >
                        Open existing transaction
                      </Button>
                    ) : null}
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Transaction Status"
                      data={[
                        { label: 'Completed', value: 'completed' },
                        { label: 'Failed', value: 'failed' },
                      ]}
                      value={form.values.transactionStatus}
                      onChange={(value) =>
                        form.setFieldValue(
                          'transactionStatus',
                          (value as TransactionStatus | null) ?? 'completed',
                        )
                      }
                      error={form.errors.transactionStatus}
                      required
                      disabled={
                        (!isAllocationContext && !form.values.financialAccount) || isEditMode
                      }
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Amount"
                      value={form.values.amount}
                      onChange={(value) => form.setFieldValue('amount', value)}
                      error={form.errors.amount}
                      min={0}
                      leftSection="₱"
                      decimalScale={2}
                      fixedDecimalScale
                      thousandSeparator=","
                      hideControls
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Transaction Fee"
                      value={form.values.transactionFee}
                      onChange={(value) => form.setFieldValue('transactionFee', value)}
                      min={0}
                      leftSection="₱"
                      decimalScale={2}
                      fixedDecimalScale
                      thousandSeparator=","
                      hideControls
                    />
                  </Grid.Col>
                  {!isAllocationContext && (
                    <Grid.Col span={12}>
                      <Group gap={6} mb={4} align="center">
                        <Text size="sm" fw={500}>
                          Running Balance
                        </Text>
                        <Tooltip label="Running balance is the amount after this transaction is added or deducted (Amount + Transaction Fee).">
                          <span style={{ display: 'inline-flex', cursor: 'help' }}>
                            <CircleHelp size={14} />
                          </span>
                        </Tooltip>
                      </Group>
                      <NumberInput
                        value={projectedRunningBalance}
                        min={0}
                        leftSection="₱"
                        decimalScale={2}
                        fixedDecimalScale
                        thousandSeparator=","
                        hideControls
                        disabled
                        placeholder="Enter account, type, and amount"
                      />
                    </Grid.Col>
                  )}
                  <Grid.Col span={12}>
                    <TextInput
                      label="Description"
                      value={form.values.description}
                      onChange={(e) => form.setFieldValue('description', e.currentTarget.value)}
                      error={form.errors.description}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Particulars"
                      value={form.values.particulars}
                      onChange={(e) => form.setFieldValue('particulars', e.currentTarget.value)}
                      minRows={2}
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6, lg: 4 }} order={{ base: 1, md: 2 }}>
              <div className={classes.transactionReceiptPane}>
                {!activeReceiptImageUrl ? (
                  <Card
                    withBorder
                    radius="md"
                    className={classes['upload-card']}
                    style={{ position: 'relative' }}
                  >
                    <LoadingOverlay
                      visible={overlayVisible}
                      zIndex={100}
                      overlayProps={{ radius: 'md', blur: 2 }}
                    />
                    {overlayVisible && (
                      <Text
                        size="sm"
                        fw={600}
                        c="white"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, 28px)',
                          zIndex: 101,
                          pointerEvents: 'none',
                        }}
                      >
                        {isProcessingReceipt ? 'Processing receipt' : 'Analyzing image'}
                      </Text>
                    )}
                    <Dropzone
                      className={classes.dropzone}
                      radius="md"
                      onDrop={(files) => {
                        const file = files[0]
                        if (file) void handleFileAnalysis(file)
                      }}
                      onReject={() => {
                        setFeedback({
                          type: 'error',
                          message: 'Invalid file. Please upload an image.',
                        })
                      }}
                      maxFiles={1}
                      accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp]}
                      disabled={isSaving || overlayVisible}
                      aria-label="Drop receipt here"
                    >
                      <div style={{ pointerEvents: 'none' }}>
                        <Group justify="center">
                          <Dropzone.Accept>
                            <CheckCircle size={50} className={classes.icon} />
                          </Dropzone.Accept>
                          <Dropzone.Reject>
                            <Ban size={50} className={classes.icon} />
                          </Dropzone.Reject>
                          <Dropzone.Idle>
                            <Upload size={50} className={classes.icon} />
                          </Dropzone.Idle>
                        </Group>

                        <Text ta="center" fw={700} fz="lg" mt="xl">
                          <Dropzone.Accept>Drop receipt here</Dropzone.Accept>
                          <Dropzone.Reject>File is invalid</Dropzone.Reject>
                          <Dropzone.Idle>Upload proof of receipt</Dropzone.Idle>
                        </Text>

                        <Text className={classes.description}>
                          Drag & drop an image here, or click to select a file.
                        </Text>
                      </div>
                    </Dropzone>
                  </Card>
                ) : (
                  <Card withBorder radius="md" style={{ position: 'relative' }}>
                    <LoadingOverlay
                      visible={overlayVisible}
                      zIndex={100}
                      overlayProps={{ radius: 'md', blur: 2 }}
                    />
                    {isEditMode ? (
                      <Button
                        fullWidth
                        variant="outline"
                        mb="md"
                        onClick={handleProcessReceipt}
                        loading={isProcessingReceipt}
                        disabled={
                          isSaving || isUploadingReceipt || (!receiptImageId && !pendingReceiptFile)
                        }
                      >
                        Process Receipt
                      </Button>
                    ) : null}
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        if (!file) return
                        void handleFileAnalysis(file)
                        event.currentTarget.value = ''
                      }}
                      ref={(node) => {
                        receiptInputRef.current = () => node?.click()
                      }}
                    />
                    {overlayVisible && (
                      <Text
                        size="sm"
                        fw={600}
                        c="white"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, 28px)',
                          zIndex: 101,
                          pointerEvents: 'none',
                        }}
                      >
                        {isProcessingReceipt ? 'Processing receipt' : 'Analyzing image'}
                      </Text>
                    )}
                    <Stack gap="sm">
                      <Flex gap="sm" justify="space-between" align="start" wrap="nowrap">
                        <Text size="xs" fw={700}>
                          Image preview (
                          {pendingReceiptFile?.name || receiptImageFileName || 'Receipt'})
                        </Text>
                        <Group gap="xxs" style={{ flexShrink: 0 }}>
                          <ActionIcon
                            variant="default"
                            color="blue"
                            size="sm"
                            onClick={() => receiptInputRef.current()}
                            disabled={isSaving || overlayVisible}
                            aria-label="Edit attached image"
                          >
                            <Pencil size={14} />
                          </ActionIcon>
                          <ActionIcon
                            variant="default"
                            color="red"
                            size="sm"
                            onClick={handleRemoveAttachedImage}
                            disabled={isSaving || overlayVisible}
                            aria-label="Remove attached image"
                          >
                            <Ban size={14} />
                          </ActionIcon>
                        </Group>
                      </Flex>
                      <ScrollArea h={{ base: 300, sm: 400 }}>
                        {receiptPreviewError ? (
                          <Alert withCloseButton color="red" title="Receipt preview failed">
                            {receiptPreviewError}
                          </Alert>
                        ) : (
                          <img
                            src={activeReceiptImageUrl}
                            alt="Receipt preview"
                            onError={() => {
                              setReceiptPreviewAttempt((current) => {
                                const next = current + 1

                                if (next < receiptPreviewCandidates.length) {
                                  return next
                                }

                                const urlToCheck =
                                  activeReceiptImageUrl || receiptPreviewCandidates[current] || ''

                                void resolveReceiptPreviewError(urlToCheck).then((message) => {
                                  setReceiptPreviewError(message)
                                })

                                return current
                              })
                            }}
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain',
                              borderRadius: 4,
                            }}
                          />
                        )}
                      </ScrollArea>
                    </Stack>
                  </Card>
                )}
              </div>
            </Grid.Col>
          </Grid>
        )}

        {!isLoading &&
          isEditMode &&
          form.values.isFundAllocation &&
          childTransactions.length > 0 &&
          (() => {
            const parentAmount = parseNumericInputValue(form.values.amount) ?? 0
            const allocationStatus =
              allocatedFunds === parentAmount
                ? 'complete'
                : allocatedFunds > parentAmount
                  ? 'exceeded'
                  : 'partial'
            const allocationColor =
              allocationStatus === 'complete'
                ? 'green'
                : allocationStatus === 'exceeded'
                  ? 'red'
                  : 'orange'

            return (
              <Stack mt="md">
                <Group justify="space-between" align="center">
                  <Title order={5}>Child Transactions</Title>
                  <Text size="sm" fw={500} c={allocationColor}>
                    Allocated funds: {formatCurrency(allocatedFunds)}/{formatCurrency(parentAmount)}
                  </Text>
                </Group>
                <ScrollArea>
                  <Table withTableBorder withColumnBorders striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Reference #</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Source to Destination</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Fee</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {childTransactions.map((child) => (
                        <Table.Tr key={child.id}>
                          <Table.Td>
                            <span
                              style={{
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                              onClick={(event) => {
                                event.stopPropagation()
                                router.push(`/app/records/transactions/${child.id}/edit`)
                              }}
                            >
                              {child.referenceNumber || '-'}
                            </span>
                          </Table.Td>
                          <Table.Td>{formatDate(child.transactionDate)}</Table.Td>
                          <Table.Td>
                            {(() => {
                              const source = child.sourceAccountName || '-'
                              const destination = child.destinationAccountName || '-'
                              if (source === '-' && destination === '-') return '-'
                              return `${source} to ${destination}`
                            })()}
                          </Table.Td>
                          <Table.Td>{formatCurrency(child.amount)}</Table.Td>
                          <Table.Td>{formatCurrency(child.transactionFee)}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={child.transactionStatus === 'failed' ? 'red' : 'teal'}
                              variant="light"
                              tt="capitalize"
                            >
                              {child.transactionStatus || '-'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Stack>
            )
          })()}
      </div>
      <Card withBorder radius="md" className={classes['footer--fixed']}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {isAllocationContext
              ? 'Create a child transaction linked to the parent fund allocation. Receipt upload is optional.'
              : isEditMode
                ? 'Update fields or receipt, then save your changes.'
                : 'Fill out transaction details and save. Receipt upload is optional.'}
          </Text>
          <Button onClick={handleSave} loading={isSaving || overlayVisible || isLoading}>
            Save
          </Button>
        </Group>
      </Card>

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm deletion"
        centered
      >
        <Text size="sm" mb="lg">
          Delete this transaction? This cannot be undone.
        </Text>
        <Group justify="end" gap="sm">
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={isDeleting}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  )
}
