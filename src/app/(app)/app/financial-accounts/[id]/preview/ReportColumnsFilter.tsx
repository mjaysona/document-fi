'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MultiSelect, Stack } from '@mantine/core'
import {
  DEFAULT_TRANSACTION_REPORT_COLUMNS,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from './columns'

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

  const normalizedInitialColumns = useMemo(
    () => parseReportColumnKeys(initialColumns.join(',')),
    [initialColumns],
  )

  const [selectedColumns, setSelectedColumns] =
    useState<TransactionReportColumnKey[]>(normalizedInitialColumns)

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
  }

  return (
    <Stack gap="xs">
      <MultiSelect
        placeholder="Shown columns"
        data={TRANSACTION_REPORT_COLUMN_OPTIONS.map((column) => ({
          value: column.value,
          label: column.label,
        }))}
        value={selectedColumns}
        onChange={handleColumnsChange}
        hidePickedOptions
        searchable
        clearable={false}
        withPillsReorder
        size="sm"
        className="reportColumnsFilter"
        styles={{
          root: { minWidth: 280 },
          input: { minHeight: 36 },
        }}
      />
    </Stack>
  )
}
