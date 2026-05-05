'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { ArrowLeft, Trash2 } from 'lucide-react'
import classes from '../../page.module.scss'
import { createQuote, getEquipmentOptions, type EquipmentOption } from '../actions'
import { calcLineTotal, calcQuoteSummary } from '@/lib/quoteCalculations'

type QuoteFormItem = {
  _key: string
  equipmentId?: string
  name: string
  description: string
  unitPrice: number
  quantity: number
}

type Feedback = { type: 'success' | 'error'; message: string }

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function NewQuotePage() {
  const router = useRouter()

  const [quoteName, setQuoteName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [items, setItems] = useState<QuoteFormItem[]>([])
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [itemsError, setItemsError] = useState<string | null>(null)

  useEffect(() => {
    getEquipmentOptions().then((result) => {
      if (result.success) setEquipmentOptions(result.data)
    })
  }, [])

  const equipmentById = new Map(equipmentOptions.map((e) => [e.id, e]))

  const handleAddEquipment = (value: string | null) => {
    if (!value) return
    const equip = equipmentById.get(value)
    if (!equip) return
    setItems((prev) => [
      ...prev,
      {
        _key: `${value}-${Date.now()}`,
        equipmentId: equip.id,
        name: equip.name,
        description: equip.description ?? '',
        unitPrice: equip.unitPrice,
        quantity: 1,
      },
    ])
    setItemsError(null)
    setSelectedEquipmentId(null)
  }

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item._key !== key))
  }

  const handleItemChange = (
    key: string,
    field: 'unitPrice' | 'quantity',
    value: number | string,
  ) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    if (!Number.isFinite(numValue)) return
    const safeValue =
      field === 'quantity' ? Math.max(1, Math.floor(numValue)) : Math.max(0, numValue)
    setItems((prev) => prev.map((item) => (item._key === key ? { ...item, [field]: safeValue } : item)))
  }

  const summary = calcQuoteSummary(items)

  const handleSave = async () => {
    setFeedback(null)
    let hasError = false

    if (!quoteName.trim()) {
      setNameError('Quote name is required')
      hasError = true
    } else {
      setNameError(null)
    }

    if (items.length === 0) {
      setItemsError('Add at least one item')
      hasError = true
    } else {
      setItemsError(null)
    }

    if (hasError) return

    setIsSaving(true)
    try {
      const result = await createQuote({
        name: quoteName.trim(),
        clientName: clientName.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        items: items.map((item) => ({
          equipmentId: item.equipmentId,
          name: item.name,
          description: item.description || undefined,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      })

      if (result.success && result.id) {
        // Phase 9 will implement the edit route — until then this redirects to the list
        router.push(`/app/records/quotations/${result.id}/edit`)
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to save quote.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save quote.' })
    } finally {
      setIsSaving(false)
    }
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
            onClick={() => router.push('/app/records/quotations')}
          >
            <ArrowLeft size={16} />
          </ActionIcon>
          <Title order={5}>New Quote</Title>
        </Group>

        {feedback && (
          <Alert
            color={feedback.type === 'success' ? 'green' : 'red'}
            title={feedback.type === 'success' ? 'Success' : 'Error'}
          >
            {feedback.message}
          </Alert>
        )}

        {/* Quote details */}
        <Card withBorder radius="md">
          <Text fw={700} mb="md">
            Quote Details
          </Text>
          <Stack gap="sm">
            <TextInput
              label="Quote Name"
              placeholder="e.g. Proposal for ABC Corp"
              value={quoteName}
              onChange={(e) => {
                setQuoteName(e.currentTarget.value)
                setNameError(null)
              }}
              error={nameError}
              required
              disabled={isSaving}
            />
            <TextInput
              label="Client Name"
              placeholder="Client or company name"
              value={clientName}
              onChange={(e) => setClientName(e.currentTarget.value)}
              disabled={isSaving}
            />
            <TextInput
              label="Client Email"
              placeholder="client@example.com"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.currentTarget.value)}
              disabled={isSaving}
            />
          </Stack>
        </Card>

        {/* Items */}
        <Card withBorder radius="md">
          <Text fw={700} mb="md">
            Items
          </Text>

          <Select
            label="Add equipment"
            placeholder="Search and select equipment to add…"
            searchable
            clearable
            data={equipmentOptions.map((opt) => ({
              value: opt.id,
              label: opt.name,
            }))}
            renderOption={({ option }) => {
              const equip = equipmentById.get(option.value)
              return (
                <Stack gap={2} py={2}>
                  <Text size="sm" fw={500}>
                    {option.label}
                  </Text>
                  {equip?.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {equip.description}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed">
                    {formatCurrency(equip?.unitPrice ?? 0)}
                  </Text>
                </Stack>
              )
            }}
            value={selectedEquipmentId}
            onChange={handleAddEquipment}
            disabled={isSaving}
            mb="md"
            nothingFoundMessage="No equipment found"
          />

          {itemsError && (
            <Text c="red" size="sm" mb="sm">
              {itemsError}
            </Text>
          )}

          {items.length > 0 && (
            <Stack gap="xs">
              {/* Column header */}
              <Group gap="xs" wrap="nowrap" px={4}>
                <Text size="xs" c="dimmed" fw={600} style={{ flex: 1 }}>
                  ITEM
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  style={{ width: 120, textAlign: 'right' }}
                >
                  UNIT PRICE
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  style={{ width: 80, textAlign: 'right' }}
                >
                  QTY
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  style={{ width: 110, textAlign: 'right' }}
                >
                  LINE TOTAL
                </Text>
                <div style={{ width: 28 }} />
              </Group>

              <Divider />

              {items.map((item) => {
                const lineTotal = calcLineTotal({ unitPrice: item.unitPrice, quantity: item.quantity })
                return (
                  <Group key={item._key} gap="xs" wrap="nowrap" align="flex-start" px={4}>
                    <Stack gap={2} style={{ flex: 1, paddingTop: 4 }}>
                      <Text size="sm" fw={500}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text size="xs" c="dimmed">
                          {item.description}
                        </Text>
                      )}
                    </Stack>

                    <NumberInput
                      value={item.unitPrice}
                      onChange={(val) => handleItemChange(item._key, 'unitPrice', val)}
                      min={0}
                      prefix="₱"
                      decimalScale={2}
                      fixedDecimalScale
                      hideControls
                      disabled={isSaving}
                      style={{ width: 120 }}
                      styles={{ input: { textAlign: 'right' } }}
                      aria-label="Unit price"
                    />

                    <NumberInput
                      value={item.quantity}
                      onChange={(val) => handleItemChange(item._key, 'quantity', val)}
                      min={1}
                      decimalScale={0}
                      hideControls
                      disabled={isSaving}
                      style={{ width: 80 }}
                      styles={{ input: { textAlign: 'right' } }}
                      aria-label="Quantity"
                    />

                    <Text
                      size="sm"
                      fw={500}
                      style={{ width: 110, textAlign: 'right', paddingTop: 6 }}
                    >
                      {formatCurrency(lineTotal)}
                    </Text>

                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemoveItem(item._key)}
                      disabled={isSaving}
                      aria-label="Remove item"
                      mt={2}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Group>
                )
              })}

              <Divider mt="xs" />

              {/* Subtotal */}
              <Group justify="flex-end" gap="xs" px={4}>
                <Text size="sm" c="dimmed" style={{ width: 80, textAlign: 'right' }}>
                  Subtotal
                </Text>
                <Text size="sm" fw={600} style={{ width: 110, textAlign: 'right' }}>
                  {formatCurrency(summary.subtotal)}
                </Text>
                <div style={{ width: 28 }} />
              </Group>

              {/* Total */}
              <Group justify="flex-end" gap="xs" px={4}>
                <Text size="sm" fw={700} style={{ width: 80, textAlign: 'right' }}>
                  Total
                </Text>
                <Text size="sm" fw={700} style={{ width: 110, textAlign: 'right' }}>
                  {formatCurrency(summary.total)}
                </Text>
                <div style={{ width: 28 }} />
              </Group>
            </Stack>
          )}
        </Card>
      </Stack>

      {/* Fixed footer */}
      <Card className={classes['footer--fixed']} withBorder>
        <div className={classes.footer__actions}>
          <Button variant="default" disabled title="Available after saving">
            Preview
          </Button>
          <Button variant="default" disabled title="Available after saving">
            Share
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save Quote
          </Button>
        </div>
      </Card>
    </div>
  )
}
