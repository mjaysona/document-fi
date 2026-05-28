// Utility for generating the base auto reference number from a date
// Used in both backend and frontend

export function generateAutoReferenceNumberBase(dateInput?: string | Date): string {
  const date = dateInput
    ? new Date(typeof dateInput === 'string' ? dateInput : dateInput.toISOString())
    : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}${month}${day}${hour}${minute}`
}

// Optionally, add a suffix for uniqueness if needed
export function toAlphabetSuffix(index: number): string {
  let value = index
  let suffix = ''
  do {
    const remainder = value % 26
    suffix = String.fromCharCode(65 + remainder) + suffix
    value = Math.floor(value / 26) - 1
  } while (value >= 0)
  return suffix
}
