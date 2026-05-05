'use client'

import { Checkbox, Flex, Pagination, Table, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export type DataTableColumn<T> = {
  key: string
  label: ReactNode
  width?: number | string
  /** Custom cell renderer. Receives the row object, returns a ReactNode. */
  render?: (row: T) => ReactNode
}

export type DataTablePaginationState = {
  page: number
  pageSize: number
  totalDocs: number
  totalPages: number
}

type Props<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  loadingText?: string
  emptyText?: string
  /** Striped rows. Defaults to true. */
  striped?: boolean
  /** Extract a unique string key for each row. Defaults to `(row) => (row as any).id`. */
  getRowKey?: (row: T) => string
  /** Custom per-row background colour. Takes priority over selection highlight. */
  getRowBg?: (row: T) => string | undefined
  /** Optional pagination state. When provided, pagination controls are rendered. */
  pagination?: DataTablePaginationState
  onPageChange?: (page: number) => void
  /** When provided, a leading checkbox column is rendered for row selection. */
  selectedIds?: string[]
  onToggleSelectAll?: (checked: boolean) => void
  onToggleSelectRow?: (id: string, checked: boolean) => void
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  loadingText = 'Loading…',
  emptyText = 'No records found.',
  striped = true,
  getRowKey = (row) => String((row as Record<string, unknown>).id ?? ''),
  getRowBg,
  pagination,
  onPageChange,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
}: Props<T>) {
  const hasSelection = selectedIds !== undefined

  const allVisibleSelected =
    hasSelection && data.length > 0 && data.every((row) => selectedIds!.includes(getRowKey(row)))
  const someVisibleSelected =
    hasSelection && data.some((row) => selectedIds!.includes(getRowKey(row)))

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text c="dimmed">{loadingText}</Text>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text c="dimmed">{emptyText}</Text>
      </div>
    )
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <Table striped={striped} highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              {hasSelection && (
                <Table.Th style={{ width: 40 }}>
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    onChange={(e) => onToggleSelectAll?.(e.currentTarget.checked)}
                  />
                </Table.Th>
              )}
              {columns.map((col) => (
                <Table.Th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) => {
              const rowKey = getRowKey(row)
              const customBg = getRowBg?.(row)
              const selectionBg =
                hasSelection && selectedIds!.includes(rowKey)
                  ? 'var(--mantine-color-blue-light)'
                  : undefined
              return (
                <Table.Tr key={rowKey} bg={customBg ?? selectionBg}>
                  {hasSelection && (
                    <Table.Td>
                      <Checkbox
                        aria-label={`Select row ${rowKey}`}
                        checked={selectedIds!.includes(rowKey)}
                        onChange={(e) => onToggleSelectRow?.(rowKey, e.currentTarget.checked)}
                      />
                    </Table.Td>
                  )}
                  {columns.map((col) => (
                    <Table.Td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </Table.Td>
                  ))}
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <Flex justify="space-between" align="center" mt="lg">
          <Text size="sm" c="dimmed">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.totalDocs)} of{' '}
            {pagination.totalDocs} records
          </Text>
          <Pagination
            value={pagination.page}
            onChange={onPageChange}
            total={pagination.totalPages}
            withEdges
          />
        </Flex>
      )}
    </>
  )
}
