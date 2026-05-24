import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '~/payload.config'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })

    const receipt = (await payload.findByID({
      collection: 'transaction-receipts',
      id,
      depth: 0,
      overrideAccess: true,
    })) as any

    if (!receipt?.id) {
      return new NextResponse('Receipt not found', { status: 404 })
    }

    if (process.env.S3_PUBLIC_URL && process.env.S3_BUCKET && receipt.filename) {
      const s3PublicUrl = `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/app/transactions/${encodeURIComponent(String(receipt.filename))}`
      return NextResponse.redirect(s3PublicUrl, { status: 307 })
    }

    if (receipt.url) {
      const receiptUrl = String(receipt.url)
      return NextResponse.redirect(receiptUrl, { status: 307 })
    }

    if (receipt.filename) {
      const fileRoute = `/api/transaction-receipts/file/${encodeURIComponent(String(receipt.filename))}`
      return NextResponse.redirect(fileRoute, { status: 307 })
    }

    return new NextResponse('Receipt URL not available', { status: 404 })
  } catch (error) {
    console.error('Failed to serve transaction receipt by id:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
