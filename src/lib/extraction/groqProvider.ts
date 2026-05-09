export type BankEntry = {
  id: string
  name: string
  code: string
}

export type GroqExtractedTransaction = {
  transactionDate?: string
  description?: string
  particulars?: string
  transactionType?: 'debit' | 'credit'
  referenceNumber?: string
  amount?: number
  transactionStatus?: 'completed' | 'failed'
  from?: string
  to?: string
}

export type GroqExtractionResult = {
  extracted: GroqExtractedTransaction
  detectedSourceBankCode?: string
  detectedDestinationBankCode?: string
  confidence: number
  rawJson: unknown
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

function sanitizeTransactionType(value?: string): GroqExtractedTransaction['transactionType'] {
  const normalized = String(value || '')
    .toLowerCase()
    .trim()

  if (normalized === 'debit' || normalized === 'credit') {
    return normalized
  }

  return undefined
}

function sanitizeTransactionStatus(value?: string): GroqExtractedTransaction['transactionStatus'] {
  const normalized = String(value || '')
    .toLowerCase()
    .trim()

  if (normalized === 'completed' || normalized === 'failed') {
    return normalized
  }

  return undefined
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }

  return undefined
}

export async function extractTransactionWithGroq(params: {
  rawOcrText: string
  banks: BankEntry[]
}): Promise<GroqExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment.')
  }

  const bankList = params.banks.map((bank) => `${bank.code}: ${bank.name}`).join('\n')

  const prompt = `You are extracting financial transaction fields from OCR text for a Philippine account receipt or statement.

Available banks (code: name):
${bankList}

Return ONLY strict JSON with these keys:
{
  "sourceBankCode": string|null,
  "destinationBankCode": string|null,
  "transactionDate": string|null,
  "description": string|null,
  "particulars": string|null,
  "transactionType": "debit"|"credit"|null,
  "referenceNumber": string|null,
  "amount": number|null,
  "transactionStatus": "completed"|"failed"|null,
  "from": string|null,
  "to": string|null,
  "confidence": number
}
Rules:
- sourceBankCode and destinationBankCode must be exactly one of the codes from the Available banks list above, or null if not identifiable
- description should be a short summary (for example: transfer, cash in, purchase)
- particulars should contain the detailed narration, merchant/payment context, or notes; if only one text description exists, use that value for particulars
- transactionType must be debit or credit only
- amount must be a positive number
- transactionStatus should default to completed unless the OCR clearly indicates failure, reversal, or cancellation
- do not hallucinate; use null when missing
- confidence must be between 0 and 100

OCR text:
${params.rawOcrText}`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Groq extraction failed (${response.status}): ${message}`)
  }

  const payload = (await response.json()) as any
  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Groq response did not include message content.')
  }

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Groq returned malformed JSON.')
  }

  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0))
  const validCodes = new Set(params.banks.map((bank) => bank.code))

  const detectedSourceBankCode =
    typeof parsed.sourceBankCode === 'string' && validCodes.has(parsed.sourceBankCode)
      ? parsed.sourceBankCode
      : undefined

  const detectedDestinationBankCode =
    typeof parsed.destinationBankCode === 'string' && validCodes.has(parsed.destinationBankCode)
      ? parsed.destinationBankCode
      : undefined

  const extracted: GroqExtractedTransaction = {
    transactionDate: parsed.transactionDate || undefined,
    description: parsed.description || undefined,
    particulars: parsed.particulars || undefined,
    transactionType: sanitizeTransactionType(parsed.transactionType),
    referenceNumber: parsed.referenceNumber || undefined,
    amount: asOptionalNumber(parsed.amount),
    transactionStatus: sanitizeTransactionStatus(parsed.transactionStatus),
    from: parsed.from || undefined,
    to: parsed.to || undefined,
  }

  return {
    extracted,
    detectedSourceBankCode,
    detectedDestinationBankCode,
    confidence,
    rawJson: parsed,
  }
}
