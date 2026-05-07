import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicQuote } from './actions'
import {
  QuoteDocument,
  type QuoteDocumentData,
} from '@/app/(app)/app/records/quotations/components/QuoteDocument'
import { PrintButton } from '@/app/(app)/app/records/quotations/[id]/preview/PrintButton'
import styles from './page.module.scss'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const result = await getPublicQuote(token)
  if (!result.success || !result.data) return { title: 'Quotation' }
  return {
    title: result.data.name,
    description: result.data.clientName
      ? `Quotation for ${result.data.clientName}`
      : 'Quotation document',
  }
}

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params
  const result = await getPublicQuote(token)

  if (!result.success || !result.data) {
    notFound()
  }

  const quote = result.data

  const documentData: QuoteDocumentData = {
    id: quote.id,
    name: quote.name,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    createdAt: quote.date ?? null,
    logoUrl: quote.logoUrl ?? null,
    items: quote.items.map((item) => ({
      name: item.name,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      images: item.images?.map((img) => ({ url: img.url, alt: item.name })) ?? [],
    })),
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <PrintButton />
        </div>
        <main className={styles.main}>
          <QuoteDocument quote={documentData} />
        </main>
      </div>
    </div>
  )
}
