type BankCandidate = {
  id: string
  name: string
  code?: string
}

export type BankDetectionResult = {
  bankId?: string
  bankName: string
  confidence: number
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
}

export function detectBankFromOcrText(
  rawText: string,
  banks: BankCandidate[],
): BankDetectionResult {
  const haystack = normalize(rawText)

  let best: BankDetectionResult = {
    bankName: 'Unknown',
    confidence: 0,
  }

  for (const bank of banks) {
    const name = normalize(bank.name)
    const code = normalize(bank.code || '')

    let score = 0
    if (name && haystack.includes(name)) score += 0.8
    if (code && haystack.includes(code)) score += 0.45

    const words = name.split(' ').filter((token) => token.length > 2)
    if (words.length > 0) {
      const matchedWords = words.filter((word) => haystack.includes(word)).length
      score += Math.min(0.4, (matchedWords / words.length) * 0.4)
    }

    score = Math.min(1, score)

    if (score > best.confidence) {
      best = {
        bankId: bank.id,
        bankName: bank.name,
        confidence: score,
      }
    }
  }

  return best
}
