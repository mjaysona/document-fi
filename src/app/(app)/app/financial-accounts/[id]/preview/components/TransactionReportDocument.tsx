'use client'

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BarChart, LineChart } from '@mantine/charts'
import '@mantine/charts/styles.css'
import styles from './TransactionReportDocument.module.scss'
import {
  DEFAULT_TRANSACTION_REPORT_COLUMNS,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from '../columns'
import type { TransactionReportData, TransactionReportTableRow } from '../reportData'

type TransactionReportDocumentProps = {
  report: TransactionReportData
  visibleColumns?: TransactionReportColumnKey[]
}

type DisplayRow = {
  key: string
  row: TransactionReportTableRow
  indent: boolean
  shaded: boolean
}

const A4_PAGE_HEIGHT_PX = 1123
const FALLBACK_ROW_HEIGHT = 32
const FALLBACK_NEXT_PAGE_BASE_HEIGHT = 240
const PAGE_BOTTOM_BUFFER_PX = 24

const getValidMeasuredHeight = (height: number | undefined, fallback: number): number => {
  if (typeof height !== 'number') return fallback
  if (!Number.isFinite(height)) return fallback
  return height > 0 ? height : fallback
}

const flattenRowsForDisplay = (rows: TransactionReportTableRow[]): DisplayRow[] => {
  const flattened: DisplayRow[] = []

  rows.forEach((row, index) => {
    const parentKey = `${row.referenceNumber}-${row.transactionDate}-${row.createdAt}-${index}`
    flattened.push({
      key: parentKey,
      row,
      indent: false,
      shaded: false,
    })

    if (row.isFundAllocation && row.children && row.children.length > 0) {
      row.children.forEach((child, childIndex) => {
        flattened.push({
          key: `${parentKey}-child-${child.referenceNumber}-${childIndex}`,
          row: child,
          indent: true,
          shaded: true,
        })
      })
    }
  })

  return flattened
}

const formatDate = (value?: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatMoney = (value: number | null): string => {
  if (typeof value !== 'number') return '-'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatType = (value: string): string => {
  if (value === 'credit') return 'Credit'
  if (value === 'debit') return 'Debit'
  return '-'
}

const getTypeColor = (value: string): string | undefined => {
  if (value === 'credit') return '#2f9e44'
  if (value === 'debit') return '#e03131'
  return undefined
}

const getStatusColor = (value: string): string | undefined => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'completed') return '#2f9e44'
  if (normalized === 'failed') return '#e03131'
  return undefined
}

const isRightAlignedColumn = (column: TransactionReportColumnKey): boolean => {
  return [
    'amount',
    'fee',
    'totalAmount',
    'currentBalance',
    'runningBalance',
    'allocatedFunds',
  ].includes(column)
}

const formatAllocatedFunds = (row: TransactionReportTableRow): string => {
  if (!row.isFundAllocation) return '-'

  const allocated = (row.children || []).reduce((sum, child) => {
    return sum + (typeof child.totalAmount === 'number' ? child.totalAmount : 0)
  }, 0)

  if (typeof row.amount === 'number') {
    return `${formatMoney(allocated)} / ${formatMoney(row.amount)}`
  }

  return formatMoney(allocated)
}

const combineNameAndBank = (name: string, bank: string): string => {
  const normalizedName = String(name || '').trim()
  const normalizedBank = String(bank || '').trim()

  const hasName = normalizedName && normalizedName !== '-'
  const hasBank = normalizedBank && normalizedBank !== '-'

  if (hasName && hasBank) return `${normalizedName} (${normalizedBank})`
  if (hasName) return normalizedName
  if (hasBank) return normalizedBank
  return '-'
}

const getRowImpact = (row: TransactionReportTableRow): number | null => {
  if (row.status !== 'completed') return null
  if (typeof row.amount !== 'number') return null

  const fee = typeof row.fee === 'number' ? Math.max(row.fee, 0) : 0
  const total = row.amount + fee

  if (row.type === 'credit') return total
  if (row.type === 'debit') return -total
  return null
}

const renderCellValue = (row: TransactionReportTableRow, column: TransactionReportColumnKey) => {
  if (column === 'referenceNumber') return row.referenceNumber
  if (column === 'transactionDate') return row.transactionDate
  if (column === 'sourceAccount') return row.sourceBank
  if (column === 'destinationAccount') return row.destinationBank
  if (column === 'financialAccount') return row.financialAccount
  if (column === 'from') return row.from
  if (column === 'to') return row.to
  if (column === 'sender') return row.sender
  if (column === 'receiver') return row.receiver
  if (column === 'amount') return formatMoney(row.amount)
  if (column === 'transactionFee') return formatMoney(row.fee)
  if (column === 'totalAmount') return formatMoney(row.totalAmount)
  if (column === 'currentBalance') return formatMoney(row.currentBalance)
  if (column === 'runningBalance') return formatMoney(row.runningBalance)
  if (column === 'isFundAllocation') return row.isFundAllocation ? 'Yes' : 'No'
  if (column === 'allocatedFunds') return formatAllocatedFunds(row)
  if (column === 'description') return row.description
  if (column === 'particulars') return row.particulars

  if (column === 'transactionType') {
    return (
      <span style={{ color: getTypeColor(row.type), fontWeight: 600 }}>{formatType(row.type)}</span>
    )
  }

  if (column === 'transactionStatus') {
    return (
      <span style={{ color: getStatusColor(row.status), fontWeight: 600 }}>
        {row.status === '-' ? '-' : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
      </span>
    )
  }

  return '-'
}

export function TransactionReportDocument({
  report,
  visibleColumns = DEFAULT_TRANSACTION_REPORT_COLUMNS,
}: TransactionReportDocumentProps) {
  const { header, lineChartData, barChartData, rows } = report
  const selectedColumns =
    visibleColumns.length > 0 ? visibleColumns : DEFAULT_TRANSACTION_REPORT_COLUMNS
  const columnHeaders = selectedColumns.map(
    (columnKey) => TRANSACTION_REPORT_COLUMN_OPTIONS.find((option) => option.value === columnKey)!,
  )

  const hasLineData = lineChartData.some((point) => typeof point.runningBalance === 'number')
  const hasBarData = barChartData.length > 0

  const lineChartSeries = lineChartData.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date),
  }))

  const barChartSeries = barChartData.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date),
  }))

  const displayRows = useMemo(() => flattenRowsForDisplay(rows), [rows])
  const [pagedRows, setPagedRows] = useState<DisplayRow[][]>([])

  const nextPageBaseRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Starting balance is the account value before the first transaction in range.
  let startingBalance: number | null = null
  if (rows.length > 0 && typeof rows[0].currentBalance === 'number') {
    startingBalance = rows[0].currentBalance
  } else if (rows.length > 0 && typeof rows[0].runningBalance === 'number') {
    const firstImpact = getRowImpact(rows[0])
    startingBalance =
      typeof firstImpact === 'number'
        ? rows[0].runningBalance - firstImpact
        : rows[0].runningBalance
  } else if (lineChartData.length > 0 && typeof lineChartData[0].runningBalance === 'number') {
    startingBalance = lineChartData[0].runningBalance
  }

  useLayoutEffect(() => {
    const paginateRows = () => {
      if (displayRows.length === 0) {
        setPagedRows([[]])
        return
      }

      const nextPageBaseHeight = getValidMeasuredHeight(
        nextPageBaseRef.current?.getBoundingClientRect().height,
        FALLBACK_NEXT_PAGE_BASE_HEIGHT,
      )

      const nextPageCapacity = Math.max(
        24,
        A4_PAGE_HEIGHT_PX - nextPageBaseHeight - PAGE_BOTTOM_BUFFER_PX,
      )

      const chunks: DisplayRow[][] = []
      let currentChunk: DisplayRow[] = []
      let usedHeight = 0
      let currentCapacity = nextPageCapacity

      displayRows.forEach((displayRow) => {
        const rowHeight = getValidMeasuredHeight(
          rowRefs.current[displayRow.key]?.getBoundingClientRect().height,
          FALLBACK_ROW_HEIGHT,
        )

        const shouldStartNewPage =
          currentChunk.length > 0 && usedHeight + rowHeight > currentCapacity

        if (shouldStartNewPage) {
          chunks.push(currentChunk)
          currentChunk = []
          usedHeight = 0
          currentCapacity = nextPageCapacity
        }

        currentChunk.push(displayRow)
        usedHeight += rowHeight
      })

      if (currentChunk.length > 0) {
        chunks.push(currentChunk)
      }

      setPagedRows(chunks)
    }

    const rafId = window.requestAnimationFrame(paginateRows)
    window.addEventListener('resize', paginateRows)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', paginateRows)
    }
  }, [displayRows, selectedColumns])

  const renderTableRow = (displayRow: DisplayRow) => {
    return (
      <tr
        key={displayRow.key}
        style={displayRow.shaded ? { backgroundColor: '#f9fafb' } : undefined}
      >
        {columnHeaders.map((column) => {
          const shouldIndent = displayRow.indent && column.value === 'referenceNumber'
          return (
            <td
              key={`${displayRow.key}-${column.value}`}
              className={isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined}
              style={shouldIndent ? { paddingLeft: '32px' } : undefined}
            >
              {renderCellValue(displayRow.row, column.value)}
            </td>
          )
        })}
      </tr>
    )
  }

  const renderTable = (pageRows: DisplayRow[], isContinued: boolean) => {
    return (
      <section
        className={`${styles.table__section} ${isContinued ? styles['table__section--continued'] : ''}`.trim()}
        aria-label="Transactions table preview section"
      >
        <h2 className={styles.section__title}>
          {isContinued
            ? `Transactions (continued) (${formatDate(header.fromDate)} - ${formatDate(header.toDate)})`
            : `Transactions (${formatDate(header.fromDate)} - ${formatDate(header.toDate)})`}
        </h2>

        {rows.length === 0 ? (
          <p className={styles.placeholder__text}>No transactions available for this report.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {columnHeaders.map((column) => (
                  <th
                    key={column.value}
                    className={
                      isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined
                    }
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{pageRows.map((displayRow) => renderTableRow(displayRow))}</tbody>
          </table>
        )}
      </section>
    )
  }

  const transactionPages = pagedRows

  return (
    <>
      <div className={styles.pages}>
        <div className={styles['page-scale-wrap']}>
          <article className={styles.document} aria-label="Transaction report document page 1">
            <h3 className={styles.header}>{header.title}</h3>
            <div className={styles.document__title}>
              <span>TRANSACTIONS REPORT</span>
            </div>
            <div className={styles.transaction__details}>
              <div className={styles.transaction__detail}>
                <p className={styles['transaction__detail-label']}>Date</p>
                <p className={styles['transaction__detail-value']}>
                  {formatDate(header.fromDate)} - {formatDate(header.toDate)}
                </p>
              </div>
              <div className={styles.transaction__detail}>
                <p className={styles['transaction__detail-label']}>Starting balance</p>
                <p className={styles['transaction__detail-value']}>
                  {formatMoney(startingBalance)}
                </p>
              </div>
            </div>
            <section className={styles.chart__section} aria-label="Charts preview section">
              <div className={styles.chart__grid}>
                <div className={styles.chart__card}>
                  <p className={styles.chart__title}>Running Balance Trend (Line)</p>
                  {hasLineData ? (
                    <div className={styles.chart__viewport}>
                      <LineChart
                        h={300}
                        data={lineChartSeries}
                        dataKey="dateLabel"
                        series={[
                          {
                            name: 'runningBalance',
                            label: 'Running Balance',
                            color: 'teal.6',
                          },
                        ]}
                        curveType="linear"
                        withLegend={false}
                        withTooltip={false}
                        tickLine="none"
                        yAxisProps={{
                          width: 72,
                          tickFormatter: (value) =>
                            new Intl.NumberFormat('en-PH', {
                              style: 'currency',
                              currency: 'PHP',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(Number(value || 0)),
                        }}
                        valueFormatter={(value) =>
                          new Intl.NumberFormat('en-PH', {
                            style: 'currency',
                            currency: 'PHP',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(Number(value || 0))
                        }
                      />
                    </div>
                  ) : (
                    <p className={styles.placeholder__text}>No running balance data available.</p>
                  )}
                </div>

                <div className={styles.chart__card}>
                  <p className={styles.chart__title}>Money In vs Money Out (Bar)</p>
                  {hasBarData ? (
                    <div className={styles.chart__viewport}>
                      <BarChart
                        h={300}
                        data={barChartSeries}
                        dataKey="dateLabel"
                        series={[
                          { name: 'credit', label: 'Credit', color: 'green.6' },
                          { name: 'debit', label: 'Debit', color: 'red.6' },
                        ]}
                        withLegend
                        withTooltip={false}
                        tickLine="none"
                        yAxisProps={{
                          width: 72,
                          tickFormatter: (value) =>
                            new Intl.NumberFormat('en-PH', {
                              style: 'currency',
                              currency: 'PHP',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(Number(value || 0)),
                        }}
                        valueFormatter={(value) =>
                          new Intl.NumberFormat('en-PH', {
                            style: 'currency',
                            currency: 'PHP',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(Number(value || 0))
                        }
                      />
                    </div>
                  ) : (
                    <p className={styles.placeholder__text}>
                      No transaction amount data available.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </article>
        </div>

        {transactionPages.map((pageRows, pageIndex) => (
          <div className={styles['page-scale-wrap']} key={`transaction-page-wrap-${pageIndex}`}>
            <article
              className={styles.document}
              aria-label={`Transaction report document page ${pageIndex + 2}`}
              key={`transaction-page-${pageIndex}`}
            >
              {renderTable(pageRows, pageIndex > 0)}
            </article>
          </div>
        ))}
      </div>

      <div className={styles['measure-layer']} aria-hidden="true">
        <article className={styles.document}>
          <div ref={nextPageBaseRef}>
            <section className={`${styles.table__section} ${styles['table__section--continued']}`}>
              <h2 className={styles.section__title}>
                Transactions ({formatDate(header.fromDate)} - {formatDate(header.toDate)})
              </h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {columnHeaders.map((column) => (
                      <th key={`measure-next-${column.value}`}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </section>
          </div>
        </article>

        <article className={styles.document}>
          <section className={styles.table__section}>
            <table className={styles.table}>
              <tbody>
                {displayRows.map((displayRow) => (
                  <tr
                    key={`measure-row-${displayRow.key}`}
                    ref={(element) => {
                      rowRefs.current[displayRow.key] = element
                    }}
                    style={displayRow.shaded ? { backgroundColor: '#f9fafb' } : undefined}
                  >
                    {columnHeaders.map((column) => {
                      const shouldIndent = displayRow.indent && column.value === 'referenceNumber'
                      return (
                        <td
                          key={`measure-cell-${displayRow.key}-${column.value}`}
                          className={
                            isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined
                          }
                          style={shouldIndent ? { paddingLeft: '32px' } : undefined}
                        >
                          {renderCellValue(displayRow.row, column.value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </article>
      </div>
    </>
  )
}
