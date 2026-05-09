'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  createFinancialAccount,
  getBanksOptions,
  getFinancialAccountById,
  type BankOption,
  updateFinancialAccount,
} from '../actions'

type Feedback = { type: 'success' | 'error'; message: string }

export default function FinancialAccountCreatePage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isEditMode = pathname.endsWith('/financial-accounts/edit')
  const editId = searchParams.get('id') || ''

  const [banks, setBanks] = useState<BankOption[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode))
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [name, setName] = useState('')
  const [bankId, setBankId] = useState<string | null>(null)
  const [startingBalance, setStartingBalance] = useState<number | ''>('')
  const [currentBalance, setCurrentBalance] = useState<number | ''>('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [bankError, setBankError] = useState<string | null>(null)
  const [startingBalanceError, setStartingBalanceError] = useState<string | null>(null)
  const [currentBalanceError, setCurrentBalanceError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const banksResult = await getBanksOptions()
      if (banksResult.success) {
        setBanks(banksResult.data)
      }

      if (!isEditMode) {
        setIsLoading(false)
        return
      }

      if (!editId) {
        setFeedback({ type: 'error', message: 'Missing financial account id.' })
        setIsLoading(false)
        return
      }

      const accountResult = await getFinancialAccountById(editId)
      if (!accountResult.success || !accountResult.data) {
        setFeedback({
          type: 'error',
          message: accountResult.error || 'Failed to load financial account.',
        })
        setIsLoading(false)
        return
      }

      setName(accountResult.data.name)
      setBankId(accountResult.data.bankId)
      setStartingBalance(accountResult.data.startingBalance)
      setCurrentBalance(accountResult.data.currentBalance)
      setIsLoading(false)
    }

    void load()
  }, [editId, isEditMode])

  const bankOptions = useMemo(
    () =>
      banks.map((bank) => ({
        value: bank.id,
        label: `${bank.name} (${bank.code})`,
      })),
    [banks],
  )

  const handleSave = async () => {
    setFeedback(null)
    let hasError = false

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required')
      hasError = true
    } else {
      setNameError(null)
    }

    if (!bankId) {
      setBankError('Bank is required')
      hasError = true
    } else {
      setBankError(null)
    }

    if (startingBalance === '') {
      setStartingBalanceError('Starting Balance is required')
      hasError = true
    } else {
      setStartingBalanceError(null)
    }

    if (currentBalance === '') {
      setCurrentBalanceError('Current Balance is required')
      hasError = true
    } else {
      setCurrentBalanceError(null)
    }

    if (hasError) return

    const validatedBankId = bankId
    if (!validatedBankId) return

    setIsSaving(true)

    if (isEditMode) {
      if (!editId) {
        setFeedback({ type: 'error', message: 'Missing financial account id.' })
        setIsSaving(false)
        return
      }

      const result = await updateFinancialAccount(editId, {
        name: trimmedName,
        bankId: validatedBankId,
        startingBalance: Number(startingBalance),
        currentBalance: Number(currentBalance),
      })

      if (result.success) {
        router.push(`/app/financial-accounts/${editId}`)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to update financial account.',
        })
      }
    } else {
      const result = await createFinancialAccount({
        name: trimmedName,
        bankId: validatedBankId,
        startingBalance: Number(startingBalance),
        currentBalance: Number(currentBalance),
      })

      if (result.success && result.id) {
        router.push(`/app/financial-accounts/${result.id}`)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to create financial account.',
        })
      }
    }

    setIsSaving(false)
  }

  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Group justify="space-between" align="center">
        <Title order={4}>
          {isEditMode ? 'Edit Financial Account' : 'Create Financial Account'}
        </Title>
      </Group>

      {feedback && (
        <Alert color={feedback.type === 'success' ? 'green' : 'red'} title="Notice">
          {feedback.message}
        </Alert>
      )}

      <Card withBorder radius="md">
        {isLoading ? (
          <Text c="dimmed">Loading...</Text>
        ) : (
          <Stack gap="sm">
            <TextInput
              label="Name"
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value)
                setNameError(null)
              }}
              disabled={isSaving}
              error={nameError}
              required
            />

            <Select
              label="Bank"
              data={bankOptions}
              value={bankId}
              onChange={(value) => {
                setBankId(value)
                setBankError(null)
              }}
              searchable
              disabled={isSaving}
              error={bankError}
              required
            />

            <NumberInput
              label="Starting Balance"
              value={startingBalance}
              onChange={(value) => {
                setStartingBalance(typeof value === 'number' ? value : '')
                setStartingBalanceError(null)
              }}
              min={0}
              leftSection="₱"
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator=","
              hideControls
              disabled={isSaving}
              error={startingBalanceError}
              required
            />

            <NumberInput
              label="Current Balance"
              value={currentBalance}
              onChange={(value) => {
                setCurrentBalance(typeof value === 'number' ? value : '')
                setCurrentBalanceError(null)
              }}
              min={0}
              leftSection="₱"
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator=","
              hideControls
              disabled={isSaving}
              error={currentBalanceError}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => router.push('/app/financial-accounts')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} loading={isSaving}>
                {isEditMode ? 'Save Changes' : 'Create Financial Account'}
              </Button>
            </Group>
          </Stack>
        )}
      </Card>
    </Stack>
  )
}
