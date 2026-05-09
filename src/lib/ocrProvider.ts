/**
 * OCR provider abstraction.
 * All callers use this module — never call mistralOcr directly from app code.
 * Swap the underlying provider here without touching callers.
 */
import { encodeImageBuffer, processImageOCR } from './mistralOcr'

export interface OcrResult {
  /** Concatenated markdown text from all pages */
  rawText: string
}

export async function extractTextFromImageBuffer(imageBuffer: Buffer): Promise<OcrResult> {
  const base64 = encodeImageBuffer(imageBuffer)
  const result = await processImageOCR(base64)

  const rawText = ((result as any)?.pages ?? [])
    .map((page: any) => page?.markdown ?? '')
    .filter(Boolean)
    .join('\n\n')

  return { rawText }
}
