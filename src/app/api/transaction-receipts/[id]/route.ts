import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '~/payload.config'

async function proxyRemoteImage(url: string): Promise<NextResponse> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      return new NextResponse('Receipt not found', { status: response.status })
    }

    const body = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const cacheControl = response.headers.get('cache-control') || 'public, max-age=300'

    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': cacheControl,
      },
    })
  } catch (error) {
    console.error('Failed to proxy receipt image:', error)
    return new NextResponse('Failed to fetch receipt image', { status: 502 })
  }
}

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
      return await proxyRemoteImage(s3PublicUrl)
    }

    if (receipt.url) {
      const receiptUrl = String(receipt.url)

      if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
        return await proxyRemoteImage(receiptUrl)
      }

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
