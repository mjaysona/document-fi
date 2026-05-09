'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  Text,
  Stack,
  TextInput,
  Textarea,
  Tooltip,
  Title,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { ArrowLeft, Ban, CheckCircle, CircleHelp, Pencil, Trash2, Upload } from 'lucide-react'
import {
  analyzeReceiptFile,
  createTransactionWithReceipt,
  getBanks,
  getFinancialAccounts,
  getTransactionById,
  processTransactionReceipt,
  updateTransactionWithReceipt,
  type BankOption,
  type FinancialAccountOption,
  type TransactionStatus,
  type TransactionType,
} from '../actions'
import classes from '../../page.module.scss'

type Feedback = { type: 'success' | 'error'; message: string }

type OriginalTransactionSnapshot = {
  financialAccount: string
  transactionType: TransactionType
  amount: number
  transactionFee: number
}

export default function AddTransactionPage() {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  const transactionId = params?.id
  const isEditMode = pathname?.includes('/app/records/transactions/') && pathname?.endsWith('/edit')

  const [banks, setBanks] = useState<BankOption[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountOption[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [transactionDate, setTransactionDate] = useState('')
  const [description, setDescription] = useState('')
  const [particulars, setParticulars] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null)
  const [sourceAccount, setSourceAccount] = useState<string | null>(null)
  const [destinationAccount, setDestinationAccount] = useState<string | null>(null)
  const [financialAccount, setFinancialAccount] = useState<string | null>(null)
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [transactionFee, setTransactionFee] = useState<number | ''>(0)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>('completed')
  const [runningBalance, setRunningBalance] = useState<number | ''>('')
  const [originalTransactionSnapshot, setOriginalTransactionSnapshot] =
    useState<OriginalTransactionSnapshot | null>(null)

  const [receiptReady, setReceiptReady] = useState(false)
  const [receiptImageId, setReceiptImageId] = useState('')
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>()
  const [receiptImageFileName, setReceiptImageFileName] = useState('')
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null)
  const [pendingRawOcrText, setPendingRawOcrText] = useState<string | undefined>()
  const receiptInputRef = useRef<() => void>(() => {})

  const hydrateFromTransaction = async () => {
    if (!isEditMode || !transactionId) return

    const refreshed = await getTransactionById(transactionId)
    if (!refreshed.success || !refreshed.data) return

    const tx = refreshed.data
    setTransactionDate(tx.transactionDate?.slice(0, 10) ?? '')
    setDescription(tx.description)
    setParticulars(tx.particulars ?? '')
    setTransactionType(tx.transactionType ?? null)
    setDestinationAccount(tx.destinationAccount ?? null)

    const nextFinancialAccount = tx.financialAccount ?? null
    setFinancialAccount(nextFinancialAccount)
    if (nextFinancialAccount) {
      const selectedAccount = financialAccounts.find(
        (account) => account.id === nextFinancialAccount,
      )
      setSourceAccount(selectedAccount?.bankId ?? tx.sourceAccount ?? null)
    } else {
      setSourceAccount(tx.sourceAccount ?? null)
    }

    setFromValue(tx.from ?? '')
    setToValue(tx.to ?? '')
    setReferenceNumber(tx.referenceNumber ?? '')
    setAmount(typeof tx.amount === 'number' ? tx.amount : '')
    setTransactionFee(typeof tx.transactionFee === 'number' ? tx.transactionFee : 0)
    setTransactionStatus(tx.transactionStatus ?? 'completed')
    setRunningBalance(typeof tx.runningBalance === 'number' ? tx.runningBalance : '')
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
    setReceiptImageId(tx.receiptImageId ?? '')
    setReceiptImageUrl(tx.receiptImageUrl ?? undefined)
    setReceiptImageFileName(tx.receiptImageFileName ?? '')
    setPendingRawOcrText(tx.rawOcrText ?? undefined)
  }

  const handleRemoveAttachedImage = () => {
    if (isEditMode) {
      setReceiptImageId('')
      setReceiptImageFileName('')
    }
    setReceiptImageUrl(undefined)
    setPendingReceiptFile(null)
    setPendingRawOcrText(undefined)
    setReceiptReady(false)
  }

  const handleFileAnalysis = async (file: File) => {
    setReceiptImageUrl(URL.createObjectURL(file))
    setReceiptImageFileName(file.name)
    setPendingReceiptFile(file)
    setPendingRawOcrText(undefined)
    setReceiptReady(false)
    setFeedback(null)
    setIsUploadingReceipt(true)

    const formData = new FormData()
    formData.append('file', file)
    if (financialAccount) formData.append('financialAccount', financialAccount)
    const result = await analyzeReceiptFile(formData)

    if (result.success || result.rawOcrText) {
      setPendingRawOcrText(result.rawOcrText)
      if (!isEditMode) setReceiptReady(true)

      if (result.transactionDate) {
        const parsed = new Date(result.transactionDate)
        if (!Number.isNaN(parsed.getTime())) {
          setTransactionDate(parsed.toISOString().split('T')[0])
        }
      }
      if (result.description) setDescription(result.description)
      if (result.particulars) setParticulars(result.particulars)
      if (result.transactionType) setTransactionType(result.transactionType)
      if (result.detectedDestinationBankId) setDestinationAccount(result.detectedDestinationBankId)
      if (result.from) setFromValue(result.from)
      if (result.to) setToValue(result.to)
      if (result.referenceNumber) setReferenceNumber(result.referenceNumber)
      if (typeof result.amount === 'number') setAmount(result.amount)
      if (typeof result.transactionFee === 'number') setTransactionFee(result.transactionFee)
      if (result.transactionStatus) setTransactionStatus(result.transactionStatus)

      if (result.error) {
        setFeedback({ type: 'error', message: `OCR complete. ${result.error}` })
      }
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to analyze receipt.' })
    }

    setIsUploadingReceipt(false)
  }

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(Boolean(isEditMode))

      const [banksResult, accountsResult] = await Promise.all([getBanks(), getFinancialAccounts()])

      if (!isMounted) return
      if (banksResult.success) setBanks(banksResult.data)
      if (accountsResult.success) setFinancialAccounts(accountsResult.data)

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
      setTransactionDate(tx.transactionDate?.slice(0, 10) ?? '')
      setDescription(tx.description)
      setParticulars(tx.particulars ?? '')
      setTransactionType(tx.transactionType ?? null)
      setDestinationAccount(tx.destinationAccount ?? null)

      const nextFinancialAccount = tx.financialAccount ?? null
      setFinancialAccount(nextFinancialAccount)
      if (!nextFinancialAccount) {
        const defaultAccount = accountsResult.success
          ? accountsResult.data.find((account) => account.isDefault)
          : undefined
        if (defaultAccount) {
          setFinancialAccount(defaultAccount.id)
          setSourceAccount(defaultAccount.bankId ?? null)
        }
      } else {
        const selectedAccount = accountsResult.success
          ? accountsResult.data.find((account) => account.id === nextFinancialAccount)
          : undefined
        setSourceAccount(selectedAccount?.bankId ?? tx.sourceAccount ?? null)
      }

      setFromValue(tx.from ?? '')
      setToValue(tx.to ?? '')
      setReferenceNumber(tx.referenceNumber ?? '')
      setAmount(typeof tx.amount === 'number' ? tx.amount : '')
      setTransactionFee(typeof tx.transactionFee === 'number' ? tx.transactionFee : 0)
      setTransactionStatus(tx.transactionStatus ?? 'completed')
      setRunningBalance(typeof tx.runningBalance === 'number' ? tx.runningBalance : '')
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
      setReceiptImageId(tx.receiptImageId ?? '')
      setReceiptImageUrl(tx.receiptImageUrl ?? undefined)
      setReceiptImageFileName(tx.receiptImageFileName ?? '')
      setPendingReceiptFile(null)
      setPendingRawOcrText(undefined)
      setIsLoading(false)
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [isEditMode, transactionId])

  useEffect(() => {
    if (financialAccount || financialAccounts.length === 0) return

    const defaultAccount = financialAccounts.find((account) => account.isDefault)
    if (defaultAccount) {
      setFinancialAccount(defaultAccount.id)
      setSourceAccount(defaultAccount.bankId ?? null)
    }
  }, [financialAccount, financialAccounts])

  useEffect(() => {
    if (!financialAccount) {
      setSourceAccount(null)
      return
    }

    const selectedAccount = financialAccounts.find((account) => account.id === financialAccount)
    setSourceAccount(selectedAccount?.bankId ?? null)
  }, [financialAccount, financialAccounts])

  const sourceBankName =
    banks.find((bank) => bank.id === sourceAccount)?.name ||
    financialAccounts.find((account) => account.id === financialAccount)?.bankName ||
    ''

  const selectedAccountCurrentBalance = useMemo<number | ''>(() => {
    if (!financialAccount) return ''

    const selectedAccount = financialAccounts.find((account) => account.id === financialAccount)
    return typeof selectedAccount?.currentBalance === 'number' ? selectedAccount.currentBalance : ''
  }, [financialAccount, financialAccounts])

  const projectedRunningBalance = useMemo<number | ''>(() => {
    if (!financialAccount || amount === '' || !transactionType) {
      return runningBalance
    }

    const selectedAccount = financialAccounts.find((account) => account.id === financialAccount)
    if (!selectedAccount || typeof selectedAccount.currentBalance !== 'number') {
      return runningBalance
    }

    const fee =
      typeof transactionFee === 'number' && Number.isFinite(transactionFee) ? transactionFee : 0
    const amountNumber = Number(amount)
    if (!Number.isFinite(amountNumber)) return runningBalance

    const signedImpact = (transactionType === 'debit' ? 1 : -1) * (amountNumber + fee)
    let baselineBalance = selectedAccount.currentBalance

    if (
      isEditMode &&
      originalTransactionSnapshot &&
      originalTransactionSnapshot.financialAccount === financialAccount
    ) {
      const originalSignedImpact =
        (originalTransactionSnapshot.transactionType === 'debit' ? 1 : -1) *
        (originalTransactionSnapshot.amount + originalTransactionSnapshot.transactionFee)
      baselineBalance -= originalSignedImpact
    }

    return baselineBalance + signedImpact
  }, [
    amount,
    financialAccount,
    financialAccounts,
    isEditMode,
    originalTransactionSnapshot,
    runningBalance,
    transactionFee,
    transactionType,
  ])

  const handleSave = async () => {
    setFeedback(null)

    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Description is required.' })
      return
    }

    if (!transactionType) {
      setFeedback({ type: 'error', message: 'Transaction type is required.' })
      return
    }

    if (amount === '') {
      setFeedback({ type: 'error', message: 'Amount is required.' })
      return
    }

    if (!financialAccount) {
      setFeedback({ type: 'error', message: 'Financial account is required.' })
      return
    }

    if (!isEditMode && (!receiptReady || !pendingReceiptFile)) {
      setFeedback({ type: 'error', message: 'Receipt must be analyzed before save.' })
      return
    }

    setIsSaving(true)

    const formData = new FormData()
    if (pendingReceiptFile) formData.append('file', pendingReceiptFile)
    formData.append('description', description.trim())
    if (transactionDate) formData.append('transactionDate', transactionDate)
    if (particulars.trim()) formData.append('particulars', particulars.trim())
    formData.append('transactionType', transactionType)
    if (sourceAccount) formData.append('sourceAccount', sourceAccount)
    if (destinationAccount) formData.append('destinationAccount', destinationAccount)
    if (financialAccount) formData.append('financialAccount', financialAccount)
    if (fromValue.trim()) formData.append('from', fromValue.trim())
    if (toValue.trim()) formData.append('to', toValue.trim())
    if (referenceNumber.trim()) formData.append('referenceNumber', referenceNumber.trim())
    formData.append('amount', String(Number(amount)))
    formData.append(
      'transactionFee',
      String(typeof transactionFee === 'number' ? transactionFee : 0),
    )
    formData.append('transactionStatus', transactionStatus || 'completed')
    if (receiptImageId) formData.append('existingReceiptImageId', receiptImageId)
    if (pendingRawOcrText) formData.append('rawOcrText', pendingRawOcrText)

    if (isEditMode && transactionId) {
      const result = await updateTransactionWithReceipt(transactionId, formData)

      if (result.success) {
        setPendingReceiptFile(null)
        setFeedback({ type: 'success', message: 'Transaction updated.' })
        await hydrateFromTransaction()
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to update transaction.' })
      }
    } else {
      const result = await createTransactionWithReceipt(formData)

      if (result.success && result.id) {
        router.push(`/app/records/transactions/${result.id}/edit`)
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to create transaction.' })
      }
    }

    setIsSaving(false)
  }

  const handleProcessReceipt = async () => {
    if (!isEditMode || !transactionId) return
    if (!receiptImageId) {
      setFeedback({ type: 'error', message: 'Save a receipt image first.' })
      return
    }

    setFeedback(null)
    setIsProcessingReceipt(true)

    const result = await processTransactionReceipt(transactionId)
    if (result.success || result.status === 'partial-success') {
      await hydrateFromTransaction()
    }

    if (result.success) {
      setFeedback({ type: 'success', message: 'Receipt processed successfully.' })
    } else if (result.status === 'partial-success') {
      setFeedback({
        type: 'success',
        message: result.error ?? 'Partial success. Retry processing.',
      })
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to process receipt.' })
    }

    setIsProcessingReceipt(false)
  }

  const overlayVisible = isUploadingReceipt || isProcessingReceipt

  return (
    <div className={classes.wrapper}>
      <div className={classes.card} style={{ flex: 1 }}>
        <Group gap="sm" align="center" mb="md">
          <ActionIcon
            variant="default"
            size="lg"
            radius="sm"
            aria-label="Back"
            onClick={() => router.push('/app/records/transactions')}
          >
            <ArrowLeft size={16} />
          </ActionIcon>
          <Title order={5}>{isEditMode ? 'Edit Transaction' : 'New Transaction'}</Title>
        </Group>

        {feedback && (
          <Alert color={feedback.type === 'success' ? 'green' : 'red'} title="Notice" mb="md">
            {feedback.message}
          </Alert>
        )}

        {isLoading ? (
          <Text c="dimmed">Loading...</Text>
        ) : (
          <Group grow align="flex-start" wrap="nowrap" gap="md">
            <Card withBorder radius="md" style={{ flex: 1, position: 'relative' }}>
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
              <Stack gap="sm">
                <Group grow>
                  <Select
                    label="Financial Account"
                    searchable
                    data={financialAccounts.map((account) => ({
                      value: account.id,
                      label: `${account.name} (${account.code})${account.bankName ? ` - ${account.bankName}` : ''}${account.isDefault ? ' (Default)' : ''}`,
                    }))}
                    value={financialAccount}
                    onChange={setFinancialAccount}
                    required
                  />
                  <NumberInput
                    label="Current Balance"
                    value={selectedAccountCurrentBalance}
                    min={0}
                    leftSection="₱"
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator=","
                    hideControls
                    readOnly
                    placeholder="Select financial account"
                  />
                </Group>
                <TextInput
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  required
                />
                <Textarea
                  label="Particulars"
                  value={particulars}
                  onChange={(e) => setParticulars(e.currentTarget.value)}
                  minRows={2}
                />
                <Group grow>
                  <TextInput
                    label="Transaction Date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.currentTarget.value)}
                  />
                  <Select
                    label="Transaction Type"
                    data={[
                      { label: 'Debit', value: 'debit' },
                      { label: 'Credit', value: 'credit' },
                    ]}
                    value={transactionType}
                    onChange={(value) =>
                      setTransactionType((value as TransactionType | null) ?? null)
                    }
                    required
                  />
                </Group>
                <Group grow>
                  <TextInput label="Source Bank" value={sourceBankName} readOnly />
                  <Select
                    label="Destination Bank"
                    searchable
                    data={banks.map((bank) => ({
                      value: bank.id,
                      label: `${bank.name} (${bank.code})`,
                    }))}
                    value={destinationAccount}
                    onChange={setDestinationAccount}
                  />
                </Group>
                <Group grow>
                  <TextInput
                    label="From"
                    value={fromValue}
                    onChange={(e) => setFromValue(e.currentTarget.value)}
                  />
                  <TextInput
                    label="To"
                    value={toValue}
                    onChange={(e) => setToValue(e.currentTarget.value)}
                  />
                </Group>
                <Group grow>
                  <TextInput
                    label="Reference Number"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.currentTarget.value)}
                  />
                  <Select
                    label="Transaction Status"
                    data={[
                      { label: 'Completed', value: 'completed' },
                      { label: 'Failed', value: 'failed' },
                    ]}
                    value={transactionStatus}
                    onChange={(value) =>
                      setTransactionStatus((value as TransactionStatus | null) ?? 'completed')
                    }
                  />
                </Group>
                <Group grow>
                  <NumberInput
                    label="Amount"
                    value={amount}
                    onChange={(value) => setAmount(typeof value === 'number' ? value : '')}
                    min={0}
                    leftSection="₱"
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator=","
                    hideControls
                    required
                  />
                  <NumberInput
                    label="Transaction Fee"
                    value={transactionFee}
                    onChange={(value) => setTransactionFee(typeof value === 'number' ? value : 0)}
                    min={0}
                    leftSection="₱"
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator=","
                    hideControls
                  />
                </Group>
                <div>
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
                    readOnly
                    placeholder="Enter account, type, and amount"
                  />
                </div>
              </Stack>
            </Card>

            <div style={{ minWidth: 320 }}>
              {isEditMode ? (
                <Button
                  fullWidth
                  mb="md"
                  onClick={handleProcessReceipt}
                  loading={isProcessingReceipt}
                  disabled={isSaving || isUploadingReceipt}
                >
                  Process Receipt
                </Button>
              ) : null}

              <input
                hidden
                type="file"
                accept="image/*"
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

              {!receiptImageUrl ? (
                <Card
                  withBorder
                  radius="md"
                  className={classes.uploadCard}
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
                    <Group justify="space-between" align="center">
                      <Text fw={700}>
                        Image preview (
                        {pendingReceiptFile?.name || receiptImageFileName || 'Receipt'})
                      </Text>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() => receiptInputRef.current()}
                          disabled={isSaving || overlayVisible}
                          aria-label="Edit attached image"
                        >
                          <Pencil size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={handleRemoveAttachedImage}
                          disabled={isSaving || overlayVisible}
                          aria-label="Remove attached image"
                        >
                          <Trash2 size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxHeight: '400px',
                        overflow: 'auto',
                      }}
                    >
                      <img
                        src={receiptImageUrl}
                        alt="Receipt preview"
                        style={{
                          width: '100%',
                          height: 'auto',
                          objectFit: 'contain',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </Stack>
                </Card>
              )}
            </div>
          </Group>
        )}
      </div>

      <Card withBorder radius="md" className={classes['footer--fixed']}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {isEditMode
              ? 'Update fields or receipt, then save your changes.'
              : 'Upload and analyze the receipt, then save the transaction.'}
          </Text>
          <Button onClick={handleSave} loading={isSaving || overlayVisible || isLoading}>
            Save
          </Button>
        </Group>
      </Card>
    </div>
  )
}
