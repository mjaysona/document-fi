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
    return new NextResponse('Failed to fetch receipt image', { status: 502 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params
    const decodedFilename = decodeURIComponent(filename)
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'transaction-receipts',
      where: {
        filename: {
          equals: decodedFilename,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const receipt = result.docs[0] as any
    if (!receipt?.filename) {
      return new NextResponse('Receipt not found', { status: 404 })
    }

    // Construct the proper S3 public URL using the configured public URL and S3 key
    if (process.env.S3_PUBLIC_URL && process.env.S3_BUCKET) {
      // The file is stored in S3 with prefix 'app/transactions/' based on Payload config
      const s3PublicUrl = `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/app/transactions/${encodeURIComponent(receipt.filename)}`
      return await proxyRemoteImage(s3PublicUrl)
    }

    // If S3_PUBLIC_URL is not configured but receipt has a URL, try to use it
    if (receipt.url) {
      const receiptUrl = String(receipt.url)
      if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
        return await proxyRemoteImage(receiptUrl)
      }

      return NextResponse.redirect(receiptUrl, { status: 307 })
    }

    return new NextResponse('Receipt URL not available', { status: 404 })
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 })
  }
}
