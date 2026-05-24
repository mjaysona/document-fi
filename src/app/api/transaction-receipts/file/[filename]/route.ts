import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '~/payload.config'

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
      console.log('Redirecting to S3 public URL:', s3PublicUrl)
      return NextResponse.redirect(s3PublicUrl, { status: 307 })
    }

    // If S3_PUBLIC_URL is not configured but receipt has a URL, try to use it
    if (receipt.url) {
      console.log('Using receipt URL:', receipt.url)
      return NextResponse.redirect(receipt.url, { status: 307 })
    }

    console.log('No S3 public URL or receipt URL found')
    return new NextResponse('Receipt URL not available', { status: 404 })
  } catch (error) {
    console.error('Failed to serve transaction receipt file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
