'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { ArrowLeft, Ban, CheckCircle, Pencil, Trash2, Upload } from 'lucide-react'
import {
  createTransactionWithReceipt,
  getBanks,
  uploadTransactionReceipt,
  type BankOption,
} from '../actions'
import classes from '../../page.module.scss'

type Feedback = { type: 'success' | 'error'; message: string }

export default function AddTransactionPage() {
  const router = useRouter()
  const [banks, setBanks] = useState<BankOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [transactionDate, setTransactionDate] = useState('')
  const [description, setDescription] = useState('')
  const [particulars, setParticulars] = useState('')
  const [transactionType, setTransactionType] = useState<string | null>(null)
  const [sourceBank, setSourceBank] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [moneyIn, setMoneyIn] = useState<number | ''>('')
  const [moneyOut, setMoneyOut] = useState<number | ''>('')
  const [runningBalance, setRunningBalance] = useState<number | ''>('')
  const [currency, setCurrency] = useState('PHP')
  const [isReversed, setIsReversed] = useState(false)
  const [reversalReason, setReversalReason] = useState('')

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

  useEffect(() => {
    getBanks().then((result) => {
      if (result.success) setBanks(result.data)
    })
  }, [])

  const handleSave = async () => {
    setFeedback(null)

    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Description is required.' })
      return
    }

    if (!receiptReady || !pendingReceiptFile) {
      setFeedback({ type: 'error', message: 'Receipt must be processed before save.' })
      return
    }

    setIsSaving(true)

    const formData = new FormData()
    formData.append('file', pendingReceiptFile)
    formData.append('description', description.trim())
    if (transactionDate) formData.append('transactionDate', transactionDate)
    if (particulars.trim()) formData.append('particulars', particulars.trim())
    if (transactionType) formData.append('transactionType', transactionType)
    if (sourceBank) formData.append('sourceBank', sourceBank)
    if (referenceNumber.trim()) formData.append('referenceNumber', referenceNumber.trim())
    if (moneyIn !== '') formData.append('moneyIn', String(Number(moneyIn)))
    if (moneyOut !== '') formData.append('moneyOut', String(Number(moneyOut)))
    if (runningBalance !== '') formData.append('runningBalance', String(Number(runningBalance)))
    formData.append('currency', currency.trim() || 'PHP')
    formData.append('isReversed', String(isReversed))
    if (pendingRawOcrText) formData.append('rawOcrText', pendingRawOcrText)
    if (isReversed && reversalReason.trim()) {
      formData.append('reversalReason', reversalReason.trim())
    }

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
          <Card withBorder radius="md" style={{ flex: 1 }}>
            <Text fw={700} mb="md">
              Transaction Details
            </Text>
            <Stack gap="sm">
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
                  label="Type"
                  data={[
                    { label: 'Debit', value: 'debit' },
                    { label: 'Credit', value: 'credit' },
                    { label: 'Transfer', value: 'transfer' },
                    { label: 'Payment', value: 'payment' },
                    { label: 'Other', value: 'other' },
                  ]}
                  value={transactionType}
                  onChange={setTransactionType}
                />
              </Group>
              <Group grow>
                <Select
                  label="Source Bank"
                  searchable
                  data={banks.map((bank) => ({
                    value: bank.id,
                    label: `${bank.name} (${bank.code})`,
                  }))}
                  value={sourceBank}
                  onChange={setSourceBank}
                />
                <TextInput
                  label="Reference Number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.currentTarget.value)}
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Money In"
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                  value={moneyIn}
                  onChange={(value) => setMoneyIn(typeof value === 'number' ? value : '')}
                />
                <NumberInput
                  label="Money Out"
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                  value={moneyOut}
                  onChange={(value) => setMoneyOut(typeof value === 'number' ? value : '')}
                />
                <NumberInput
                  label="Running Balance"
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                  value={runningBalance}
                  onChange={(value) => setRunningBalance(typeof value === 'number' ? value : '')}
                />
              </Group>
              <TextInput
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.currentTarget.value)}
              />
              <Switch
                label="Mark as reversed"
                checked={isReversed}
                onChange={(e) => setIsReversed(e.currentTarget.checked)}
              />
              {isReversed && (
                <Textarea
                  label="Reversal reason"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.currentTarget.value)}
                  minRows={2}
                  required
                />
              )}
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

                void (async () => {
                  setReceiptImageUrl(URL.createObjectURL(file))
                  setPendingReceiptFile(file)
                  setPendingRawOcrText(undefined)
                  setReceiptReady(false)
                  setFeedback(null)
                  setIsUploadingReceipt(true)

                  const formData = new FormData()
                  formData.append('file', file)
                  const result = await uploadTransactionReceipt(formData)

                  if (result.success) {
                    setPendingRawOcrText(result.rawOcrText)
                    setReceiptReady(true)
                    setFeedback({
                      type: 'success',
                      message: 'Receipt processed successfully. Save to create the transaction.',
                    })
                  } else {
                    setFeedback({
                      type: 'error',
                      message: result.error ?? 'Failed to process receipt.',
                    })
                  }

                  setIsUploadingReceipt(false)
                })()

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
                <Dropzone
                  className={classes.dropzone}
                  radius="md"
                  onDrop={async (files) => {
                    const file = files[0]
                    if (!file) return

                    setReceiptImageUrl(URL.createObjectURL(file))
                    setPendingReceiptFile(file)
                    setPendingRawOcrText(undefined)
                    setReceiptReady(false)
                    setFeedback(null)
                    setIsUploadingReceipt(true)

                    const formData = new FormData()
                    formData.append('file', file)
                    const result = await uploadTransactionReceipt(formData)

                    if (result.success) {
                      setPendingRawOcrText(result.rawOcrText)
                      setReceiptReady(true)
                      setFeedback({
                        type: 'success',
                        message: 'Receipt processed successfully. Save to create the transaction.',
                      })
                    } else {
                      setFeedback({
                        type: 'error',
                        message: result.error ?? 'Failed to process receipt.',
                      })
                    }

                    setIsUploadingReceipt(false)
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
            Upload and process the receipt, then save the transaction.
          </Text>
          <Button onClick={handleSave} loading={isSaving || isUploadingReceipt}>
            Save
          </Button>
        </Group>
      </Card>
    </div>
  )
}
