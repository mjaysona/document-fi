import fs from 'fs/promises'
import path from 'path'
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
      collection: 'media',
      where: {
        filename: {
          equals: decodedFilename,
        },
      },
      limit: 1,
      depth: 0,
    })

    const media = result.docs[0] as any
    if (!media?.filename) {
      return new NextResponse('Media not found', { status: 404 })
    }

    const mediaCollection = payload.collections['media']
    const staticDir =
      typeof mediaCollection?.config.upload === 'object' && mediaCollection.config.upload.staticDir
        ? mediaCollection.config.upload.staticDir
        : 'media'
    const filePath = path.resolve(process.cwd(), staticDir, media.filename)
    const fileBuffer = await fs.readFile(filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': media.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Failed to serve media file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
