import { calcLineTotal, calcQuoteSummary } from '@/lib/quoteCalculations'
import styles from './QuoteDocument.module.scss'

export type QuoteDocumentImage = {
  url: string
  alt?: string
}

export type QuoteDocumentItem = {
  name: string
  description?: string | null
  unitPrice: number
  quantity: number
  images?: Array<QuoteDocumentImage | string> | null
}

export type QuoteDocumentData = {
  id?: string
  name: string
  clientName?: string | null
  clientEmail?: string | null
  createdAt?: string | null
  items: QuoteDocumentItem[]
}

type QuoteDocumentProps = {
  quote: QuoteDocumentData
  currency?: string
}

const formatMoney = (value: number, currency: string): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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

const getImageUrl = (image: QuoteDocumentImage | string): string => {
  return typeof image === 'string' ? image : image.url
}

const getImageAlt = (image: QuoteDocumentImage | string, fallback: string): string => {
  if (typeof image === 'string') return fallback
  return image.alt || fallback
}

export function QuoteDocument({ quote, currency = 'PHP' }: QuoteDocumentProps) {
  const summary = calcQuoteSummary(
    quote.items.map((item) => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  )

  return (
    <article className={styles.document} aria-label="Quotation document">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{quote.name || 'Untitled Quote'}</h1>
          <p className={styles.meta}>Quote ID: {quote.id || '-'}</p>
        </div>
        <p className={styles.meta}>Date: {formatDate(quote.createdAt)}</p>
      </header>

      <section className={styles.clientBlock} aria-label="Client details">
        <p className={styles.clientLabel}>Client</p>
        <p className={styles.clientValue}>{quote.clientName || '-'}</p>
        <p className={styles.clientValue}>{quote.clientEmail || '-'}</p>
      </section>

      <section aria-label="Quote items">
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '48%' }}>Item</th>
              <th className={styles.cellRight} style={{ width: '16%' }}>
                Unit Price
              </th>
              <th className={styles.cellRight} style={{ width: '12%' }}>
                Qty
              </th>
              <th className={styles.cellRight} style={{ width: '24%' }}>
                Line Total
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, idx) => {
              const lineTotal = calcLineTotal({
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              })
              const images = item.images || []

              return (
                <tr key={`${item.name}-${idx}`}>
                  <td>
                    <p className={styles.itemName}>{item.name}</p>
                    {item.description && (
                      <p className={styles.itemDescription}>{item.description}</p>
                    )}
                    {images.length > 0 && (
                      <div className={styles.thumbs}>
                        {images.map((image, imageIdx) => {
                          const src = getImageUrl(image)
                          if (!src) return null
                          return (
                            <img
                              key={`${src}-${imageIdx}`}
                              src={src}
                              alt={getImageAlt(image, `${item.name} image ${imageIdx + 1}`)}
                              className={styles.thumb}
                            />
                          )
                        })}
                      </div>
                    )}
                  </td>
                  <td className={styles.cellRight}>{formatMoney(item.unitPrice || 0, currency)}</td>
                  <td className={styles.cellRight}>{item.quantity || 0}</td>
                  <td className={styles.cellRight}>{formatMoney(lineTotal, currency)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className={styles.summary} aria-label="Totals">
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <strong>{formatMoney(summary.subtotal, currency)}</strong>
        </div>
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Total</span>
          <strong>{formatMoney(summary.total, currency)}</strong>
        </div>
      </section>
    </article>
  )
}
