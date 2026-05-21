'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Badge, Group, MultiSelect, Stack, Text } from '@mantine/core'
import { TRANSACTION_REPORT_COLUMN_OPTIONS, type TransactionReportColumnKey } from './columns'

const REPORT_COLUMN_KEY_SET = new Set<TransactionReportColumnKey>(
  TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => option.value),
)

const parseReportColumnKeys = (value?: string | null): TransactionReportColumnKey[] => {
  const normalized = String(value || '').trim()
  if (!normalized) return []

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TransactionReportColumnKey =>
      REPORT_COLUMN_KEY_SET.has(item as TransactionReportColumnKey),
    )

  return Array.from(new Set(parsed))
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

  const [selectedColumns, setSelectedColumns] = useState<TransactionReportColumnKey[]>(
    parseReportColumnKeys(initialColumns.join(',')),
  )
  const [draggingColumnKey, setDraggingColumnKey] = useState<TransactionReportColumnKey | null>(
    null,
  )

  const pushColumnsToUrl = (nextColumns: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cols', serializeReportColumnKeys(nextColumns))

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleColumnsChange = (nextColumns: string[]) => {
    const parsed = parseReportColumnKeys(nextColumns.join(','))
    setSelectedColumns(parsed)
    pushColumnsToUrl(parsed)
  }

  const reorderSelectedColumns = (
    draggedKey: TransactionReportColumnKey,
    targetKey: TransactionReportColumnKey,
  ) => {
    if (draggedKey === targetKey) return

    const fromIndex = selectedColumns.indexOf(draggedKey)
    const toIndex = selectedColumns.indexOf(targetKey)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...selectedColumns]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)

    setSelectedColumns(next)
    pushColumnsToUrl(next)
  }

  const selectedColumnOptions = useMemo(() => {
    const labelMap = new Map(
      TRANSACTION_REPORT_COLUMN_OPTIONS.map((option) => [option.value, option.label]),
    )
    return selectedColumns.map((key) => ({ key, label: labelMap.get(key) || key }))
  }, [selectedColumns])

  return (
    <Stack gap="xs">
      <MultiSelect
        label="Visible Columns"
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
        size="sm"
        className="reportColumnsFilter"
        styles={{
          root: { minWidth: 280 },
          input: { minHeight: 36 },
        }}
      />
      <Text size="sm">Column order</Text>
      <Group gap="xs" align="center" wrap="wrap">
        {selectedColumnOptions.map((column) => (
          <Badge
            key={column.key}
            draggable
            onDragStart={() => setDraggingColumnKey(column.key)}
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (!draggingColumnKey) return
              reorderSelectedColumns(draggingColumnKey, column.key)
              setDraggingColumnKey(null)
            }}
            onDragEnd={() => setDraggingColumnKey(null)}
            style={{
              cursor: 'grab',
              opacity: draggingColumnKey === column.key ? 0.5 : 1,
              border:
                draggingColumnKey === column.key
                  ? '2px dashed var(--mantine-color-blue-5)'
                  : undefined,
            }}
            variant="light"
          >
            {column.label}
          </Badge>
        ))}
      </Group>
    </Stack>
  )
}
