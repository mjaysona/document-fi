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
import { ArrowLeft } from 'lucide-react'
import { createTransaction, getBanks, uploadTransactionReceipt, type BankOption } from '../actions'
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

  const [receiptImageId, setReceiptImageId] = useState<string | undefined>()
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>()
  const receiptInputRef = useRef<HTMLInputElement>(null)

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
    if (!receiptImageId) {
      setFeedback({ type: 'error', message: 'Receipt image is required.' })
      return
    }

    setIsSaving(true)
    const result = await createTransaction({
      transactionDate: transactionDate || undefined,
      description: description.trim(),
      particulars: particulars.trim() || undefined,
      transactionType: (transactionType as 'debit' | 'credit' | 'transfer' | 'payment' | 'other' | null | undefined) || undefined,
      sourceBank: sourceBank || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      moneyIn: moneyIn === '' ? undefined : Number(moneyIn),
      moneyOut: moneyOut === '' ? undefined : Number(moneyOut),
      runningBalance: runningBalance === '' ? undefined : Number(runningBalance),
      currency: currency.trim() || 'PHP',
      receiptImageId,
      isReversed,
      reversalReason: isReversed ? reversalReason.trim() || undefined : undefined,
    })

    if (result.success && result.id) {
      router.push(`/app/records/transactions/${result.id}/edit`)
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Failed to create transaction.' })
    }

    setIsSaving(false)
  }

  return (
    <div className={classes.wrapper}>
      <Stack gap="md" style={{ flex: 1, paddingBottom: 120 }}>
        <Group gap="sm" align="center">
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
          <Alert color={feedback.type === 'success' ? 'green' : 'red'} title="Notice">
            {feedback.message}
          </Alert>
        )}

        <Card withBorder radius="md">
          <Text fw={700} mb="md">
            Receipt
          </Text>
          <Stack gap="sm">
            {receiptImageUrl && (
              <img
                src={receiptImageUrl}
                alt="Receipt preview"
                style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain' }}
              />
            )}
            <Group gap="xs" align="center">
              <Button
                variant="default"
                size="sm"
                loading={isUploadingReceipt}
                disabled={isSaving}
                onClick={() => receiptInputRef.current?.click()}
              >
                {receiptImageUrl ? 'Change Receipt' : 'Upload Receipt'}
              </Button>
            </Group>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0]
                if (!file) return
                setReceiptImageUrl(URL.createObjectURL(file))
                setIsUploadingReceipt(true)

                const formData = new FormData()
                formData.append('file', file)
                const result = await uploadTransactionReceipt(formData)

                if (result.success && result.id) {
                  setReceiptImageId(result.id)
                  if (result.url) setReceiptImageUrl(result.url)
                } else {
                  setFeedback({
                    type: 'error',
                    message: result.error ?? 'Failed to upload receipt.',
                  })
                }

                setIsUploadingReceipt(false)
              }}
            />
          </Stack>
        </Card>

        <Card withBorder radius="md">
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
                onChange={(val) => setMoneyIn(typeof val === 'number' ? val : '')}
              />
              <NumberInput
                label="Money Out"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                value={moneyOut}
                onChange={(val) => setMoneyOut(typeof val === 'number' ? val : '')}
              />
              <NumberInput
                label="Running Balance"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                value={runningBalance}
                onChange={(val) => setRunningBalance(typeof val === 'number' ? val : '')}
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
      </Stack>

      <Card withBorder radius="md" className={classes['footer--fixed']}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Save this draft now. Processing comes next phase.
          </Text>
          <Button onClick={handleSave} loading={isSaving || isUploadingReceipt}>
            Save Draft
          </Button>
        </Group>
      </Card>
    </div>
  )
}
