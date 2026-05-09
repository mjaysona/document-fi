import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import config from '~/payload.config'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })

    const uploadCollections = Object.values(payload.collections).filter(
      (collection) => collection?.config?.upload,
    )

    let uploadDoc: any = null
    let uploadCollection: (typeof uploadCollections)[number] | null = null

    for (const collection of uploadCollections) {
      try {
        const doc = await payload.findByID({
          collection: collection.config.slug as any,
          id,
          depth: 0,
        })

        if (doc) {
          uploadDoc = doc
          uploadCollection = collection
          break
        }
      } catch {
        continue
      }
    }

    const filename = typeof uploadDoc?.filename === 'string' ? uploadDoc.filename : null
    if (!filename || !uploadCollection) {
      return new NextResponse('Uploaded file not found', { status: 404 })
    }

    const staticDir =
      typeof uploadCollection.config.upload === 'object' && uploadCollection.config.upload.staticDir
        ? uploadCollection.config.upload.staticDir
        : uploadCollection.config.slug
    const filePath = path.resolve(process.cwd(), staticDir, filename)

    const fileBuffer = await fs.readFile(filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': uploadDoc.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Failed to serve media by id:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
