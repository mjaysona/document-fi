'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Alert, Button, Flex, MultiSelect, Stack } from '@mantine/core'
import { CircleCheck } from 'lucide-react'
import {
  DEFAULT_TRANSACTION_REPORT_COLUMNS,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from './columns'
import { saveTransactionPreviewTableColumns } from '../../../records/transactions/actions'
import { useMediaQuery } from '@mantine/hooks'

const REPORT_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const parseReportColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return DEFAULT_TRANSACTION_REPORT_COLUMNS

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      REPORT_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
    )

  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : DEFAULT_TRANSACTION_REPORT_COLUMNS
}

const serializeReportColumnKeys = (keys: string[]): string => {
  const valid = keys.filter((item): item is TransactionReportColumnKey =>
    REPORT_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
  )

  return Array.from(new Set(valid)).join(',')
}

type ReportColumnsFilterProps = {
  initialColumns: TransactionReportColumnKey[]
}

export function ReportColumnsFilter({ initialColumns }: ReportColumnsFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 48em)')
  const responsivePillsListStyle = useMemo(
    () =>
      isDesktop
        ? {
            flexWrap: 'nowrap' as const,
            overflowX: 'auto' as const,
          }
        : {
            flexWrap: 'wrap' as const,
            overflowX: 'visible' as const,
          },
    [isDesktop],
  )

  const normalizedInitialColumns = useMemo(
    () => parseReportColumnKeys(initialColumns.join(',')),
    [initialColumns],
  )

  const [selectedColumns, setSelectedColumns] =
    useState<TransactionReportColumnKey[]>(normalizedInitialColumns)
  const [dropdownOpened, setDropdownOpened] = useState(false)
  const [isSavingColumns, setIsSavingColumns] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    setSelectedColumns(normalizedInitialColumns)
  }, [normalizedInitialColumns])

  const pushColumnsToUrl = (nextColumns: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cols', serializeReportColumnKeys(nextColumns))

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleColumnsChange = (nextColumns: string[]) => {
    // When pills are reordered via withPillsReorder, onChange is called with the new order
    const nextColumnKeys = nextColumns as TransactionReportColumnKey[]
    setSelectedColumns(nextColumnKeys)
    pushColumnsToUrl(nextColumnKeys)
    setDropdownOpened(false)
  }

  const handleSaveColumns = async () => {
    setIsSavingColumns(true)
    const result = await saveTransactionPreviewTableColumns(selectedColumns)

    if (!result.success) {
      setFeedback({
        tone: 'error',
        message: result.error ?? 'Failed to save shown columns configuration.',
      })
      setIsSavingColumns(false)
      return
    }

    setFeedback({
      tone: 'success',
      message: 'Shown columns configuration saved.',
    })
    setIsSavingColumns(false)
  }

  return (
    <Stack gap="xs">
      {feedback && (
        <Alert
          variant="outline"
          icon={<CircleCheck size={16} />}
          withCloseButton
          onClose={() => setFeedback(null)}
          color={feedback.tone === 'success' ? 'green' : 'red'}
        >
          {feedback.message}
        </Alert>
      )}
      <Flex wrap="wrap" gap="sm">
        <MultiSelect
          flex={1}
          placeholder="Shown columns"
          data={TRANSACTION_REPORT_COLUMN_OPTIONS.map((column) => ({
            value: column.value,
            label: column.label,
          }))}
          value={selectedColumns}
          onChange={handleColumnsChange}
          dropdownOpened={dropdownOpened}
          onDropdownOpen={() => setDropdownOpened(true)}
          onDropdownClose={() => setDropdownOpened(false)}
          hidePickedOptions
          searchable
          clearable={false}
          withPillsReorder
          size="sm"
          className="reportColumnsFilter"
          styles={{
            root: { minWidth: 280 },
            input: { minHeight: 36 },
            pillsList: responsivePillsListStyle,
          }}
        />
        <Button
          flex={{ base: '100%', xs: 'initial' }}
          variant="default"
          onClick={handleSaveColumns}
          loading={isSavingColumns}
        >
          Save
        </Button>
      </Flex>
    </Stack>
  )
}
