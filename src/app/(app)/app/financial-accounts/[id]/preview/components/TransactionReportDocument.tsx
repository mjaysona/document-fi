'use client'

import React from 'react'
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

const renderCellValue = (row: TransactionReportTableRow, column: TransactionReportColumnKey) => {
  if (column === 'referenceNumber') return row.referenceNumber
  if (column === 'transactionDate') return row.transactionDate
  if (column === 'createdAt') return row.createdAt
  if (column === 'updatedAt') return row.updatedAt
  if (column === 'sourceBank') return row.sourceBank
  if (column === 'destinationBank') return row.destinationBank
  if (column === 'fromWithSourceBank') return combineNameAndBank(row.from, row.sourceBank)
  if (column === 'toWithDestinationBank') return combineNameAndBank(row.to, row.destinationBank)
  if (column === 'financialAccount') return row.financialAccount
  if (column === 'from') return row.from
  if (column === 'to') return row.to
  if (column === 'amount') return formatMoney(row.amount)
  if (column === 'fee') return formatMoney(row.fee)
  if (column === 'totalAmount') return formatMoney(row.totalAmount)
  if (column === 'currentBalance') return formatMoney(row.currentBalance)
  if (column === 'runningBalance') return formatMoney(row.runningBalance)
  if (column === 'fundAllocation') return row.isFundAllocation ? 'Yes' : 'No'
  if (column === 'allocatedFunds') return formatAllocatedFunds(row)
  if (column === 'description') return row.description
  if (column === 'particulars') return row.particulars

  if (column === 'type') {
    return (
      <span style={{ color: getTypeColor(row.type), fontWeight: 600 }}>{formatType(row.type)}</span>
    )
  }

  if (column === 'status') {
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

  // Determine starting balance: balance of the first day in the selected date range
  let startingBalance: number | null = null
  if (lineChartData.length > 0 && typeof lineChartData[0].runningBalance === 'number') {
    startingBalance = lineChartData[0].runningBalance
  } else if (rows.length > 0 && typeof rows[0].runningBalance === 'number') {
    startingBalance = rows[0].runningBalance
  }

  return (
    <article className={styles.document} aria-label="Transaction report document">
      <h3 className={styles.header}>{header.title}</h3>
      <div className={styles.documentTitle}>
        <span>
          TRANSACTIONS REPORT
          {header.fromDate || header.toDate ? (
            <>
              {' '}
              ({formatDate(header.fromDate)} - {formatDate(header.toDate)})
            </>
          ) : null}
        </span>
      </div>
      <div className={styles.transactionDetails}>
        <div className={styles.transactionDetail}>
          <p className={styles.transactionDetailLabel}>Starting balance</p>
          <p className={styles.transactionDetailValue}>{formatMoney(startingBalance)}</p>
        </div>
        <div className={styles.transactionDetail}>
          <p className={styles.transactionDetailLabel}>Transactions</p>
          <p className={styles.transactionDetailValue}>{rows.length}</p>
        </div>
      </div>
      <section className={styles.chartSection} aria-label="Charts preview section">
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Running Balance Trend (Line)</p>
            {hasLineData ? (
              <div className={styles.chartViewport}>
                <LineChart
                  h={300}
                  data={lineChartSeries}
                  dataKey="dateLabel"
                  series={[{ name: 'runningBalance', label: 'Running Balance', color: 'teal.6' }]}
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
              <p className={styles.placeholderText}>No running balance data available.</p>
            )}
          </div>

          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Money In vs Money Out (Bar)</p>
            {hasBarData ? (
              <div className={styles.chartViewport}>
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
              <p className={styles.placeholderText}>No transaction amount data available.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.tableSection} aria-label="Transactions table preview section">
        <h2 className={styles.sectionTitle}>Transactions</h2>

        {rows.length === 0 ? (
          <p className={styles.placeholderText}>No transactions available for this report.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {columnHeaders.map((column) => (
                  <th
                    key={column.value}
                    className={isRightAlignedColumn(column.value) ? styles.cellRight : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <React.Fragment
                  key={`${row.referenceNumber}-${row.transactionDate}-${row.createdAt}-${index}`}
                >
                  <tr>
                    {columnHeaders.map((column) => (
                      <td
                        key={`${row.referenceNumber}-${column.value}`}
                        className={
                          isRightAlignedColumn(column.value) ? styles.cellRight : undefined
                        }
                      >
                        {renderCellValue(row, column.value)}
                      </td>
                    ))}
                  </tr>
                  {row.isFundAllocation && row.children && row.children.length > 0 && (
                    <>
                      {row.children.map((child, childIndex) => (
                        <tr
                          key={`${row.referenceNumber}-${child.referenceNumber}-child-${childIndex}`}
                          style={{ backgroundColor: '#f9fafb' }}
                        >
                          {columnHeaders.map((column) => {
                            const shouldIndent = column.value === 'referenceNumber'
                            return (
                              <td
                                key={`${row.referenceNumber}-child-${childIndex}-${column.value}`}
                                className={
                                  isRightAlignedColumn(column.value) ? styles.cellRight : undefined
                                }
                                style={shouldIndent ? { paddingLeft: '32px' } : undefined}
                              >
                                {renderCellValue(child, column.value)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  )
}
