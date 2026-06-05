'use client'

import { Box, Checkbox, Flex, Pagination, Table, Text, ScrollArea, Grid } from '@mantine/core'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import styles from './index.module.css'

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
  /** Enable client-side pagination when server pagination is not provided. */
  enableClientPagination?: boolean
  /** Page size for client-side pagination. Defaults to 10. */
  clientPageSize?: number
  /** Controlled current page for client-side pagination. */
  clientPage?: number
  /** Called when client-side page changes in controlled mode. */
  onClientPageChange?: (page: number) => void
  /** When provided, a leading checkbox column is rendered for row selection. */
  selectedIds?: string[]
  onToggleSelectAll?: (checked: boolean) => void
  onToggleSelectRow?: (id: string, checked: boolean) => void
  onRowClick?: (row: T) => void
  isRowExpanded?: (row: T) => boolean
  renderExpandedRow?: (row: T) => ReactNode
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
  enableClientPagination = false,
  clientPageSize = 10,
  clientPage,
  onClientPageChange,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onRowClick,
  isRowExpanded,
  renderExpandedRow,
}: Props<T>) {
  const [internalClientPage, setInternalClientPage] = useState(1)
  const previousClientPageSizeRef = useRef<number | null>(null)
  const pointerDownRef = useRef<{
    rowKey: string
    x: number
    y: number
    at: number
  } | null>(null)
  const didDragRef = useRef(false)
  const hasSelection = selectedIds !== undefined

  const effectiveClientPageSize = Math.max(1, clientPageSize)
  const clientTotalPages = Math.max(1, Math.ceil(data.length / effectiveClientPageSize))
  const shouldUseClientPagination = !pagination && enableClientPagination
  const isClientPageControlled =
    typeof clientPage === 'number' && Number.isFinite(clientPage) && !!onClientPageChange
  const rawClientPage = isClientPageControlled ? clientPage : internalClientPage
  const effectiveClientPage = Math.min(Math.max(1, rawClientPage), clientTotalPages)

  const setEffectiveClientPage = (page: number, source: 'system' | 'user' = 'system') => {
    const nextPage = Math.min(Math.max(1, page), clientTotalPages)
    if (isClientPageControlled) {
      if (source === 'user') {
        onClientPageChange?.(nextPage)
      }
      return
    }
    setInternalClientPage(nextPage)
  }

  useEffect(() => {
    if (!shouldUseClientPagination) {
      return
    }
    if (rawClientPage > clientTotalPages || rawClientPage < 1) {
      setEffectiveClientPage(rawClientPage > clientTotalPages ? clientTotalPages : 1)
    }
  }, [rawClientPage, clientTotalPages, shouldUseClientPagination])

  useEffect(() => {
    if (!shouldUseClientPagination) {
      return
    }
    if (previousClientPageSizeRef.current === null) {
      previousClientPageSizeRef.current = effectiveClientPageSize
      return
    }
    if (previousClientPageSizeRef.current === effectiveClientPageSize) {
      return
    }
    previousClientPageSizeRef.current = effectiveClientPageSize
    setEffectiveClientPage(1)
  }, [effectiveClientPageSize, shouldUseClientPagination])

  const visibleData = useMemo(() => {
    if (!shouldUseClientPagination) {
      return data
    }

    const start = (effectiveClientPage - 1) * effectiveClientPageSize
    return data.slice(start, start + effectiveClientPageSize)
  }, [effectiveClientPage, data, effectiveClientPageSize, shouldUseClientPagination])

  const allVisibleSelected =
    hasSelection &&
    visibleData.length > 0 &&
    visibleData.every((row) => selectedIds!.includes(getRowKey(row)))
  const someVisibleSelected =
    hasSelection && visibleData.some((row) => selectedIds!.includes(getRowKey(row)))

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
    <Box>
      <ScrollArea>
        <Table striped={striped} highlightOnHover withTableBorder>
          <Table.Thead style={{ verticalAlign: 'top' }}>
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
          <Table.Tbody style={{ verticalAlign: 'top' }}>
            {visibleData.map((row) => {
              const rowKey = getRowKey(row)
              const customBg = getRowBg?.(row)
              const selectionBg =
                hasSelection && selectedIds!.includes(rowKey)
                  ? 'var(--mantine-color-blue-light)'
                  : undefined
              return (
                <Fragment key={rowKey}>
                  <Table.Tr
                    bg={customBg ?? selectionBg}
                    onMouseDown={(event) => {
                      pointerDownRef.current = {
                        rowKey,
                        x: event.clientX,
                        y: event.clientY,
                        at: Date.now(),
                      }
                      didDragRef.current = false
                    }}
                    onMouseMove={(event) => {
                      const pointerDown = pointerDownRef.current
                      if (!pointerDown || pointerDown.rowKey !== rowKey) return

                      const deltaX = Math.abs(event.clientX - pointerDown.x)
                      const deltaY = Math.abs(event.clientY - pointerDown.y)
                      if (deltaX > 4 || deltaY > 4) {
                        didDragRef.current = true
                      }
                    }}
                    onMouseLeave={() => {
                      pointerDownRef.current = null
                    }}
                    onClick={() => {
                      if (!onRowClick) return

                      const pointerDown = pointerDownRef.current
                      const pressedForMs = pointerDown ? Date.now() - pointerDown.at : 0

                      const hasSelectionRange =
                        typeof window !== 'undefined' &&
                        Boolean(window.getSelection && window.getSelection()?.toString().trim())

                      if (didDragRef.current || pressedForMs > 250 || hasSelectionRange) {
                        didDragRef.current = false
                        pointerDownRef.current = null
                        return
                      }

                      didDragRef.current = false
                      pointerDownRef.current = null
                      onRowClick(row)
                    }}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
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
                  {renderExpandedRow && isRowExpanded?.(row) && (
                    <Table.Tr>
                      <Table.Td colSpan={columns.length + (hasSelection ? 1 : 0)}>
                        {renderExpandedRow(row)}
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              )
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <Grid justify="space-between" align="start" mt="lg">
          <Grid.Col span={{ base: 12, sm: 5 }} visibleFrom="sm">
            <Text size="sm" c="dimmed">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.totalDocs)} of{' '}
              {pagination.totalDocs} records
            </Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <Box style={{ minWidth: 200, maxWidth: '100%' }}>
              <Pagination
                className={styles['data-table__pagination']}
                value={pagination.page}
                onChange={onPageChange}
                total={pagination.totalPages}
                withEdges
                layout="responsive"
              />
            </Box>
          </Grid.Col>
        </Grid>
      )}
      {!pagination && shouldUseClientPagination && clientTotalPages > 1 && (
        <Flex justify="space-between" align="center" mt="lg">
          <Text size="sm" c="dimmed">
            Showing {(effectiveClientPage - 1) * effectiveClientPageSize + 1}–
            {Math.min(effectiveClientPage * effectiveClientPageSize, data.length)} of {data.length}{' '}
            records
          </Text>
          <Pagination
            value={effectiveClientPage}
            onChange={(page) => setEffectiveClientPage(page, 'user')}
            total={clientTotalPages}
            withEdges
            boundaries={1}
          />
        </Flex>
      )}
    </Box>
  )
}
