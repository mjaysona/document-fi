import { NextResponse } from 'next/server'
import { processImageOCR } from '@/lib/mistralOcr'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const base64Image = body?.base64Image

    if (!base64Image || typeof base64Image !== 'string') {
      return NextResponse.json({ error: 'base64Image is required' }, { status: 400 })
    }

    const ocrResult = await processImageOCR(base64Image)
    return NextResponse.json({ ocrResult })
  } catch (error) {
    console.error('OCR route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
