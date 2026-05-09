'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { ArrowLeft, Ban, CheckCircle, Pencil, Trash2, Upload } from 'lucide-react'
import {
  analyzeReceiptFile,
  createTransactionWithReceipt,
  getBanks,
  getFinancialAccounts,
  type BankOption,
  type FinancialAccountOption,
  type TransactionStatus,
  type TransactionType,
} from '../actions'
import classes from '../../page.module.scss'

type Feedback = { type: 'success' | 'error'; message: string }

export default function AddTransactionPage() {
  const router = useRouter()
  const [banks, setBanks] = useState<BankOption[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
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
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>('completed')

  const [receiptReady, setReceiptReady] = useState(false)
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>()
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null)
  const [pendingRawOcrText, setPendingRawOcrText] = useState<string | undefined>()
  const receiptInputRef = useRef<() => void>(() => {})

  const handleRemoveAttachedImage = () => {
    setReceiptImageUrl(undefined)
    setPendingReceiptFile(null)
    setPendingRawOcrText(undefined)
    setReceiptReady(false)
  }

  const handleFileAnalysis = async (file: File) => {
    setReceiptImageUrl(URL.createObjectURL(file))
    setPendingReceiptFile(file)
    setPendingRawOcrText(undefined)
    setReceiptReady(false)
    setFeedback(null)
    setIsUploadingReceipt(true)

    const formData = new FormData()
    formData.append('file', file)
    const result = await analyzeReceiptFile(formData)

    if (result.success || result.rawOcrText) {
      setPendingRawOcrText(result.rawOcrText)
      setReceiptReady(true)

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
      if (result.transactionStatus) setTransactionStatus(result.transactionStatus)

      setFeedback({
        type: result.error ? 'error' : 'success',
        message: result.error
          ? `OCR complete. ${result.error}`
          : 'Receipt analyzed. Fields auto-filled. Save to create the transaction.',
      })
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to analyze receipt.' })
    }

    setIsUploadingReceipt(false)
  }

  useEffect(() => {
    Promise.all([getBanks(), getFinancialAccounts()]).then(([banksResult, accountsResult]) => {
      if (banksResult.success) setBanks(banksResult.data)
      if (accountsResult.success) setFinancialAccounts(accountsResult.data)
    })
  }, [])

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

    if (!receiptReady || !pendingReceiptFile) {
      setFeedback({ type: 'error', message: 'Receipt must be analyzed before save.' })
      return
    }

    setIsSaving(true)

    const formData = new FormData()
    formData.append('file', pendingReceiptFile)
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
    formData.append('transactionStatus', transactionStatus || 'completed')
    if (pendingRawOcrText) formData.append('rawOcrText', pendingRawOcrText)

    const result = await createTransactionWithReceipt(formData)

    if (result.success && result.id) {
      router.push(`/app/records/transactions/${result.id}/edit`)
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to create transaction.' })
    }

    setIsSaving(false)
  }

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
          <Title order={5}>New Transaction</Title>
        </Group>

        {feedback && (
          <Alert color={feedback.type === 'success' ? 'green' : 'red'} title="Notice" mb="md">
            {feedback.message}
          </Alert>
        )}

        <Group grow align="flex-start" wrap="nowrap" gap="md">
          <Card withBorder radius="md" style={{ flex: 1, position: 'relative' }}>
            <LoadingOverlay
              visible={isUploadingReceipt}
              zIndex={100}
              overlayProps={{ radius: 'md', blur: 2 }}
            />
            {isUploadingReceipt && (
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
                Analyzing receipt
              </Text>
            )}
            <Text fw={700} mb="md">
              Transaction Details
            </Text>
            <Stack gap="sm">
              <Select
                label="Financial Account"
                searchable
                data={financialAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} ${account.bankName ? ` - ${account.bankName}` : ''}${account.isDefault ? ' (Default)' : ''}`,
                }))}
                value={financialAccount}
                onChange={setFinancialAccount}
                required
              />
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
              <Text size="sm" c="dimmed">
                Debit increases the selected financial account balance. Credit decreases it.
              </Text>
            </Stack>
          </Card>

          <div style={{ minWidth: 320 }}>
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
                  visible={isUploadingReceipt}
                  zIndex={100}
                  overlayProps={{ radius: 'md', blur: 2 }}
                />
                {isUploadingReceipt && (
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
                    Analyzing image
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
                    setFeedback({ type: 'error', message: 'Invalid file. Please upload an image.' })
                  }}
                  maxFiles={1}
                  accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp]}
                  disabled={isSaving || isUploadingReceipt}
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
                  visible={isUploadingReceipt}
                  zIndex={100}
                  overlayProps={{ radius: 'md', blur: 2 }}
                />
                {isUploadingReceipt && (
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
                    Analyzing image
                  </Text>
                )}
                <Text fw={700} mb="md">
                  Receipt
                </Text>
                <Stack gap="sm">
                  <Group justify="space-between" align="center" mb="md">
                    <Text fw={700}>Image preview ({pendingReceiptFile?.name || 'Receipt'})</Text>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => receiptInputRef.current()}
                        disabled={isSaving || isUploadingReceipt}
                        aria-label="Edit attached image"
                      >
                        <Pencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={handleRemoveAttachedImage}
                        disabled={isSaving || isUploadingReceipt}
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
      </div>

      <Card withBorder radius="md" className={classes['footer--fixed']}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Upload and analyze the receipt, then save the transaction.
          </Text>
          <Button onClick={handleSave} loading={isSaving || isUploadingReceipt}>
            Save
          </Button>
        </Group>
      </Card>
    </div>
  )
}
