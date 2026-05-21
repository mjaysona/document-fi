'use client'

import { BarChart, LineChart } from '@mantine/charts'
import '@mantine/charts/styles.css'
import styles from './TransactionReportDocument.module.scss'
import type { TransactionReportData } from '../reportData'

type TransactionReportDocumentProps = {
  report: TransactionReportData
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

export function TransactionReportDocument({ report }: TransactionReportDocumentProps) {
  const { header, lineChartData, barChartData, rows } = report

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

  return (
    <article className={styles.document} aria-label="Transaction report document">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {header.logoUrl && <img src={header.logoUrl} alt="Logo" className={styles.logo} />}
          <h1 className={styles.title}>{header.title}</h1>
          <p className={styles.meta}>Reference #: {header.referenceNumber || '-'}</p>
        </div>
        <p className={styles.meta}>Date: {formatDate(header.date)}</p>
      </header>
      <h5 className={styles.documentTitle}>TRANSACTIONS REPORT</h5>
      <section className={styles.chartSection} aria-label="Charts preview section">
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Running Balance Trend (Line)</p>
            {hasLineData ? (
              <div className={styles.chartViewport}>
                <LineChart
                  h={200}
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
                  h={200}
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
                <th>Reference #</th>
                <th>Date</th>
                <th>Source Bank</th>
                <th>Destination Bank</th>
                <th>Type</th>
                <th className={styles.cellRight}>Total Amount</th>
                <th className={styles.cellRight}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.referenceNumber}-${row.date}-${index}`}>
                  <td>{row.referenceNumber}</td>
                  <td>{row.date}</td>
                  <td>{row.sourceBank}</td>
                  <td>{row.destinationBank}</td>
                  <td>{formatType(row.type)}</td>
                  <td className={styles.cellRight}>{formatMoney(row.totalAmount)}</td>
                  <td className={styles.cellRight}>{formatMoney(row.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  )
}
