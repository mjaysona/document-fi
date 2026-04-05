export interface ParsedWeightBill {
  date: string
  customer: string
  weightBillNumber: string
  vehicle: string
  amount: number
}

export function parseWeightBillOCR(ocrData: any): ParsedWeightBill {
  // Get the raw markdown text from the OCR response
  const rawText = ocrData?.pages?.[0]?.markdown || ''

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
  output.date = dateMatch ? dateMatch[1].trim() : ''

  // 2. Extract Customer and Weight Bill Number
  const lines = rawText.split('\n')
  if (lines.length >= 1) {
    // Check if the first line contains both customer and weight bill number
    const firstLine = lines[0].trim()
    const weightBillMatchInFirstLine = firstLine.match(/(\d+)/)

    if (weightBillMatchInFirstLine) {
      // Case 1: Customer and weight bill number are in the same line (e.g., "B. PUA 00526834")
      output.weightBillNumber = weightBillMatchInFirstLine[1].trim()
      const customerMatch = firstLine.match(/^([^\d]+)/)
      output.customer = customerMatch ? customerMatch[1].trim() : ''
    } else if (lines.length >= 2) {
      // Case 2: Customer name is on the first line, weight bill number is on the next line (e.g., "GRFC\n00526831")
      output.customer = firstLine
      const secondLine = lines[1].trim()
      const weightBillMatchInSecondLine = secondLine.match(/^(\d+)/)
      output.weightBillNumber = weightBillMatchInSecondLine
        ? weightBillMatchInSecondLine[1].trim()
        : ''
    }
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
