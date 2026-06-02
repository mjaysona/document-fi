'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Image } from '@mantine/core'
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
}

const A4_PAGE_HEIGHT_PX = 1123
const FALLBACK_ROW_HEIGHT = 32
const FALLBACK_NEXT_PAGE_BASE_HEIGHT = 240
const FALLBACK_BREAKDOWN_HEIGHT = 220
const PAGE_BOTTOM_BUFFER_PX = 24

const getValidMeasuredHeight = (height: number | undefined, fallback: number): number => {
  if (typeof height !== 'number') return fallback
  if (!Number.isFinite(height)) return fallback
  return height > 0 ? height : fallback
}

const flattenRowsForDisplay = (rows: TransactionReportTableRow[]): DisplayRow[] => {
  return rows.map((row, index) => ({
    key: `${row.referenceNumber}-${row.transactionDate}-${row.createdAt}-${index}`,
    row,
  }))
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
  return ['amount', 'fee', 'totalAmount', 'currentBalance', 'runningBalance'].includes(column)
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
  if (column === 'isAllocatedFund') return row.isAllocatedFund ? 'Yes' : 'No'
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

  const visibleRows = useMemo(() => rows.filter((row) => !row.isForAllocation), [rows])

  const displayRows = useMemo(() => flattenRowsForDisplay(visibleRows), [visibleRows])
  const [pagedRows, setPagedRows] = useState<DisplayRow[][]>([])

  const measureDocumentRef = useRef<HTMLElement | null>(null)
  const nextPageBaseRef = useRef<HTMLDivElement | null>(null)
  const breakdownMeasureRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Starting balance is the account value before the first transaction in range.
  let startingBalance: number | null = null
  if (visibleRows.length > 0 && typeof visibleRows[0].currentBalance === 'number') {
    startingBalance = visibleRows[0].currentBalance
  } else if (visibleRows.length > 0 && typeof visibleRows[0].runningBalance === 'number') {
    const firstImpact = getRowImpact(visibleRows[0])
    startingBalance =
      typeof firstImpact === 'number'
        ? visibleRows[0].runningBalance - firstImpact
        : visibleRows[0].runningBalance
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
      const breakdownHeight = getValidMeasuredHeight(
        breakdownMeasureRef.current?.getBoundingClientRect().height,
        FALLBACK_BREAKDOWN_HEIGHT,
      )

      const measuredDocumentHeight = getValidMeasuredHeight(
        measureDocumentRef.current?.getBoundingClientRect().height,
        A4_PAGE_HEIGHT_PX,
      )

      const measuredDocumentStyles = measureDocumentRef.current
        ? window.getComputedStyle(measureDocumentRef.current)
        : null
      const verticalPadding = measuredDocumentStyles
        ? Number.parseFloat(measuredDocumentStyles.paddingTop || '0') +
          Number.parseFloat(measuredDocumentStyles.paddingBottom || '0')
        : 0

      const contentHeight = Math.max(0, measuredDocumentHeight - verticalPadding)

      const nextPageCapacity = Math.max(
        24,
        contentHeight - nextPageBaseHeight - PAGE_BOTTOM_BUFFER_PX,
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

      // Reserve room for the breakdown block on the final page.
      if (chunks.length > 0) {
        const finalPageCapacity = Math.max(24, nextPageCapacity - breakdownHeight)
        const lastChunk = [...chunks[chunks.length - 1]]
        let lastChunkHeight = lastChunk.reduce((sum, row) => {
          const rowHeight = getValidMeasuredHeight(
            rowRefs.current[row.key]?.getBoundingClientRect().height,
            FALLBACK_ROW_HEIGHT,
          )
          return sum + rowHeight
        }, 0)

        if (lastChunkHeight > finalPageCapacity && lastChunk.length > 1) {
          const movedRows: DisplayRow[] = []

          // Move only the minimum number of trailing rows so the final page can fit breakdown.
          while (lastChunk.length > 1 && lastChunkHeight > finalPageCapacity) {
            const movedRow = lastChunk.pop()
            if (!movedRow) break

            const movedRowHeight = getValidMeasuredHeight(
              rowRefs.current[movedRow.key]?.getBoundingClientRect().height,
              FALLBACK_ROW_HEIGHT,
            )

            movedRows.unshift(movedRow)
            lastChunkHeight -= movedRowHeight
          }

          if (movedRows.length > 0) {
            chunks[chunks.length - 1] = lastChunk
            chunks.push(movedRows)
          }
        }
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
      <tr key={displayRow.key}>
        {columnHeaders.map((column) => {
          return (
            <td
              key={`${displayRow.key}-${column.value}`}
              className={isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined}
            >
              {renderCellValue(displayRow.row, column.value)}
            </td>
          )
        })}
      </tr>
    )
  }

  // Calculate breakdown values.
  const totalCredits = visibleRows.reduce(
    (sum, row) =>
      row.status === 'completed' && row.type === 'credit' && typeof row.amount === 'number'
        ? sum + row.amount + (typeof row.fee === 'number' ? Math.max(row.fee, 0) : 0)
        : sum,
    0,
  )
  const totalDebits = visibleRows.reduce(
    (sum, row) =>
      row.status === 'completed' && row.type === 'debit' && typeof row.amount === 'number'
        ? sum + row.amount + (typeof row.fee === 'number' ? Math.max(row.fee, 0) : 0)
        : sum,
    0,
  )
  const netChange = totalCredits - totalDebits
  const endingBalance =
    typeof startingBalance === 'number' && Number.isFinite(startingBalance)
      ? startingBalance + netChange
      : null

  const renderTable = (pageRows: DisplayRow[], isContinued: boolean, showBreakdown: boolean) => {
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

        {visibleRows.length === 0 ? (
          <p className={styles.placeholder__text}>No transactions available for this report.</p>
        ) : (
          <>
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

            {showBreakdown ? (
              <div style={{ marginTop: 24 }}>
                <h2 className={styles.section__title}>
                  Breakdown ({formatDate(header.fromDate)} - {formatDate(header.toDate)})
                </h2>
                <div
                  style={{
                    fontSize: 10,
                    display: 'flex',
                    gap: 24,
                    justifyContent: 'space-between',
                    marginTop: 12,
                  }}
                >
                  {/* Left: Credits - Debits breakdown */}
                  <div style={{ flex: 1, minWidth: 180, border: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        color: '#6b7280',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: 8,
                      }}
                    >
                      <span>Credits - Debits</span>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Total credits:</span>
                        <span style={{ color: '#2f9e44' }}>{formatMoney(totalCredits)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Total debits:</span>
                        <span style={{ color: '#e03131' }}>{formatMoney(totalDebits)}</span>
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 500,
                        }}
                      >
                        <span>Net difference:</span>
                        <span style={{ color: netChange < 0 ? '#e03131' : '#2f9e44' }}>
                          {formatMoney(netChange)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Right: Starting balance - (difference from credits - debits) */}
                  <div style={{ flex: 1, minWidth: 180, border: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        color: '#6b7280',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: 8,
                      }}
                    >
                      <span>Remaining balance</span>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Starting balance:</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(startingBalance)}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Net difference:</span>
                        <span style={{ color: netChange < 0 ? '#e03131' : '#2f9e44' }}>
                          {formatMoney(netChange)}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 500,
                        }}
                      >
                        <span>Remaining balance:</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(endingBalance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
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
            <div className={styles.header}>
              <h3 className={styles.header__title}>{header.title}</h3>
              {report.header.logoUrl && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    src={report.header.logoUrl}
                    alt="Primary Logo"
                    h={48}
                    fit="contain"
                    radius="sm"
                  />
                </div>
              )}
            </div>
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
              {renderTable(pageRows, pageIndex > 0, pageIndex === transactionPages.length - 1)}
            </article>
          </div>
        ))}
      </div>

      <div className={styles['measure-layer']} aria-hidden="true">
        <article className={styles.document} ref={measureDocumentRef}>
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
            <div ref={breakdownMeasureRef} style={{ marginTop: 24 }}>
              <h2 className={styles.section__title}>
                Breakdown ({formatDate(header.fromDate)} - {formatDate(header.toDate)})
              </h2>
              <div
                style={{
                  fontSize: 10,
                  display: 'flex',
                  gap: 24,
                  justifyContent: 'space-between',
                  marginTop: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 180, border: '1px solid #f1f5f9' }}>
                  <div
                    style={{
                      backgroundColor: '#f8f9fa',
                      color: '#6b7280',
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      fontSize: 8,
                    }}
                  >
                    <span>Credits - Debits</span>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Total credits:</span>
                      <span style={{ color: '#2f9e44' }}>{formatMoney(totalCredits)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Total debits:</span>
                      <span style={{ color: '#e03131' }}>{formatMoney(totalDebits)}</span>
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 500,
                      }}
                    >
                      <span>Net difference:</span>
                      <span style={{ color: netChange < 0 ? '#e03131' : '#2f9e44' }}>
                        {formatMoney(netChange)}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 180, border: '1px solid #f1f5f9' }}>
                  <div
                    style={{
                      backgroundColor: '#f8f9fa',
                      color: '#6b7280',
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      fontSize: 8,
                    }}
                  >
                    <span>Remaining balance</span>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Starting balance:</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(startingBalance)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Net difference:</span>
                      <span style={{ color: netChange < 0 ? '#e03131' : '#2f9e44' }}>
                        {formatMoney(netChange)}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 500,
                      }}
                    >
                      <span>Remaining balance:</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(endingBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </article>

        <article className={styles.document}>
          <section className={styles.table__section}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columnHeaders.map((column) => (
                    <th
                      key={`measure-rows-header-${column.value}`}
                      className={
                        isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined
                      }
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((displayRow) => (
                  <tr
                    key={`measure-row-${displayRow.key}`}
                    ref={(element) => {
                      rowRefs.current[displayRow.key] = element
                    }}
                  >
                    {columnHeaders.map((column) => {
                      return (
                        <td
                          key={`measure-cell-${displayRow.key}-${column.value}`}
                          className={
                            isRightAlignedColumn(column.value) ? styles['cell--right'] : undefined
                          }
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
