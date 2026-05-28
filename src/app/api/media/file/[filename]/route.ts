import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '~/payload.config'

async function proxyRemoteMedia(url: string): Promise<NextResponse> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      return new NextResponse('Media not found', { status: response.status })
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
    console.error('Failed to proxy media file:', error)
    return new NextResponse('Failed to fetch media file', { status: 502 })
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
      collection: 'media',
      where: {
        filename: {
          equals: decodedFilename,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const media = result.docs[0] as any
    if (!media?.filename) {
      return new NextResponse('Media not found', { status: 404 })
    }

    if (process.env.S3_PUBLIC_URL && process.env.S3_BUCKET) {
      const s3PublicUrl = `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/admin/${encodeURIComponent(media.filename)}`
      return await proxyRemoteMedia(s3PublicUrl)
    }

    if (media.url) {
      const mediaUrl = String(media.url)
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        return await proxyRemoteMedia(mediaUrl)
      }

      if (mediaUrl.startsWith('/') && !mediaUrl.startsWith('/api/media/file/')) {
        return NextResponse.redirect(mediaUrl, { status: 307 })
      }
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
