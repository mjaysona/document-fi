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
      collection: 'weight-bill-receipts',
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
      // The file is stored in S3 with prefix 'app/weight-bills/' based on Payload config
      const s3PublicUrl = `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/app/weight-bills/${encodeURIComponent(receipt.filename)}`
      return NextResponse.redirect(s3PublicUrl, { status: 307 })
    }

    // If S3_PUBLIC_URL is not configured but receipt has a URL, try to use it
    if (receipt.url) {
      return NextResponse.redirect(receipt.url, { status: 307 })
    }

    return new NextResponse('Receipt URL not available', { status: 404 })
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 })
  }
}
