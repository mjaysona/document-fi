export interface ParsedWeightBill {
  date: string
  customer: string
  weightBillNumber: string
  vehicle: string
  amount: number
}

function isValidIsoDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  )
}

function normalizeOCRDate(rawDate: string): string {
  const trimmedDate = rawDate.trim()
  const currentYear = new Date().getUTCFullYear()
  const currentCenturyPrefix = currentYear.toString().slice(0, 2)

  if (!trimmedDate) {
    return ''
  }

  const normalizedSeparators = trimmedDate.replace(/[./\s]+/g, '-').replace(/-+/g, '-')
  let dateParts = normalizedSeparators.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateParts) {
    const year = Number(dateParts[1])
    const month = Number(dateParts[2])
    const day = Number(dateParts[3])

    return isValidIsoDateParts(year, month, day)
      ? `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`
      : ''
  }

  dateParts = normalizedSeparators.match(/^(\d{3})-(\d{2})-(\d{2})$/)

  if (dateParts) {
    const leadingYearDigit = new Date().getUTCFullYear().toString().charAt(0)
    const repairedYear = `${leadingYearDigit}${dateParts[1]}`
    const month = Number(dateParts[2])
    const day = Number(dateParts[3])

    return isValidIsoDateParts(Number(repairedYear), month, day)
      ? `${repairedYear}-${dateParts[2]}-${dateParts[3]}`
      : ''
  }

  dateParts = normalizedSeparators.match(/^(\d{2})-(\d{2})-(\d{2})$/)

  if (dateParts) {
    const repairedYear = Number(`${currentCenturyPrefix}${dateParts[1]}`)
    const month = Number(dateParts[2])
    const day = Number(dateParts[3])

    if (repairedYear > currentYear) {
      return ''
    }

    return isValidIsoDateParts(repairedYear, month, day)
      ? `${repairedYear}-${dateParts[2]}-${dateParts[3]}`
      : ''
  }

  return ''
}

function normalizeOCRSectionText(section: unknown): string {
  if (typeof section === 'string') {
    return section
  }

  if (Array.isArray(section)) {
    return section
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text
        }

        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  if (
    section &&
    typeof section === 'object' &&
    'text' in section &&
    typeof section.text === 'string'
  ) {
    return section.text
  }

  return ''
}

function extractCustomerAndWeightBill(sourceText: string): {
  customer: string
  weightBillNumber: string
} {
  const lines = sourceText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      customer: '',
      weightBillNumber: '',
    }
  }

  const firstLine = lines[0]
  const weightBillMatchInFirstLine = firstLine.match(/(\d+)/)

  if (weightBillMatchInFirstLine) {
    const customerMatch = firstLine.match(/^([^\d]+)/)

    return {
      customer: customerMatch ? customerMatch[1].trim() : '',
      weightBillNumber: weightBillMatchInFirstLine[1].trim(),
    }
  }

  if (lines.length >= 2) {
    const secondLine = lines[1]
    const weightBillMatchInSecondLine = secondLine.match(/^(\d+)/)

    return {
      customer: firstLine,
      weightBillNumber: weightBillMatchInSecondLine ? weightBillMatchInSecondLine[1].trim() : '',
    }
  }

  return {
    customer: firstLine,
    weightBillNumber: '',
  }
}

export function parseWeightBillOCR(ocrData: any): ParsedWeightBill {
  // Get the raw markdown text from the OCR response
  const rawText = ocrData?.pages?.[0]?.markdown || ''
  const headerText = normalizeOCRSectionText(ocrData?.pages?.[0]?.header)

  // Initialize the parsed data object
  const output: ParsedWeightBill = {
    date: '',
    customer: '',
    weightBillNumber: '',
    vehicle: '',
    amount: 0,
  }

  // 1. Extract Date (e.g., "2026-02-28")
  const dateMatch = rawText.match(/\|  DATE \| ([^\n|]+)/)
  output.date = dateMatch ? normalizeOCRDate(dateMatch[1]) : ''

  // 2. Extract Customer and Weight Bill Number
  const preWeightBillText = rawText.split(/\|\s*WEIGHT BILL\s*\|/i)[0] || ''
  const primaryCustomerAndWeightBill = extractCustomerAndWeightBill(preWeightBillText)

  if (primaryCustomerAndWeightBill.customer || primaryCustomerAndWeightBill.weightBillNumber) {
    output.customer = primaryCustomerAndWeightBill.customer
    output.weightBillNumber = primaryCustomerAndWeightBill.weightBillNumber
  } else {
    const headerCustomerAndWeightBill = extractCustomerAndWeightBill(headerText)
    output.customer = headerCustomerAndWeightBill.customer
    output.weightBillNumber = headerCustomerAndWeightBill.weightBillNumber
  }

  // 3. Extract Vehicle: Get the first valid keyword after "REMARK"
  const remarkSectionMatch = rawText.match(/\|  REMARK  \|[^\n]*\n\n([^\n]+)/)
  if (remarkSectionMatch) {
    const vehicleText = remarkSectionMatch[1].trim()
    const vehicleKeywords = ['ELF', 'FORWARD', 'KOLONG-KOLONG', 'BABOY']

    // Check if the first word after "REMARK" is a valid keyword
    const firstWordMatch = vehicleText.match(/^([^\s]+)/)
    if (firstWordMatch) {
      const firstWord = firstWordMatch[1]
      if (vehicleKeywords.includes(firstWord)) {
        output.vehicle = firstWord
      }
    }
    // If no valid keyword is found, vehicle remains empty
  }

  // Return the structured data
  return output
}
