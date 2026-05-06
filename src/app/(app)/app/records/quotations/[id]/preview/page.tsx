import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@mantine/core'
import { ArrowLeft, Pencil, Share2 } from 'lucide-react'
import { getQuoteById } from '../../actions'
import { QuoteDocument, type QuoteDocumentData } from '../../components/QuoteDocument'
import { PrintButton } from './PrintButton'
import styles from './page.module.scss'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PreviewPage({ params }: Props) {
  const { id } = await params
  const result = await getQuoteById(id)

  if (!result.success || !result.data) {
    redirect('/app/records/quotations')
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
      <div className={styles.toolbar}>
        <Link href="/app/records/quotations">
          <Button variant="default" leftSection={<ArrowLeft size={16} />}>
            Back
          </Button>
        </Link>

        <div className={styles.toolbarRight}>
          <Link href={`/app/records/quotations/${id}/edit`}>
            <Button variant="default" leftSection={<Pencil size={16} />}>
              Edit
            </Button>
          </Link>
          <Link href={`/q/${id}`} target="_blank">
            <Button variant="default" leftSection={<Share2 size={16} />}>
              Share
            </Button>
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className={styles.printAreaWrapper}>
        <div className={styles.printArea}>
          <QuoteDocument quote={documentData} />
        </div>
      </div>
    </div>
  )
}
