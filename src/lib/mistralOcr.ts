import { Mistral } from '@mistralai/mistralai'
import fs from 'fs'

const apiKey = process.env.MISTRAL_API_KEY
if (!apiKey) {
  throw new Error('Missing MISTRAL_API_KEY in environment')
}

const client = new Mistral({ apiKey })

export async function encodeImage(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath)
  return imageBuffer.toString('base64')
}

export function encodeImageBuffer(imageBuffer: Buffer): string {
  return imageBuffer.toString('base64')
}

export async function processImageOCR(base64Image: string) {
  const result = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: {
      type: 'image_url',
      imageUrl: 'data:image/jpeg;base64,' + base64Image,
    },
    extractHeader: true,
    includeImageBase64: true,
  })

  return result
}
