export type ReportSectionKey =
  | 'date'
  | 'startingBalance'
  | 'chart'
  | 'netDifferenceBreakdown'
  | 'remainingBalanceBreakdown'

export const REPORT_SECTION_OPTIONS: Array<{ value: ReportSectionKey; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'startingBalance', label: 'Starting balance' },
  { value: 'chart', label: 'Chart' },
  { value: 'netDifferenceBreakdown', label: 'Net difference breakdown' },
  { value: 'remainingBalanceBreakdown', label: 'Remaining balance breakdown' },
]

export const DEFAULT_REPORT_SECTIONS: ReportSectionKey[] = REPORT_SECTION_OPTIONS.map(
  (option) => option.value,
)

const REPORT_SECTION_KEY_SET = new Set<ReportSectionKey>(
  REPORT_SECTION_OPTIONS.map((option) => option.value),
)

export const parseReportSections = (value?: string | null): ReportSectionKey[] => {
  const normalized = String(value || '').trim()

  if (!normalized) return DEFAULT_REPORT_SECTIONS
  if (normalized === 'none') return []

  const parsed = normalized
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is ReportSectionKey =>
      REPORT_SECTION_KEY_SET.has(item as ReportSectionKey),
    )

  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : DEFAULT_REPORT_SECTIONS
}

export const normalizeReportSections = (keys: string[]): ReportSectionKey[] => {
  const valid = keys.filter((item): item is ReportSectionKey =>
    REPORT_SECTION_KEY_SET.has(item as ReportSectionKey),
  )

  return Array.from(new Set(valid))
}

export const serializeReportSections = (keys: string[]): string | null => {
  const normalized = normalizeReportSections(keys)

  if (normalized.length === 0) return 'none'
  if (normalized.length === DEFAULT_REPORT_SECTIONS.length) return null

  return normalized.join(',')
}
