'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Group } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { CalendarSearch } from 'lucide-react'

type DateRange = [string | null, string | null]
type DateObjectRange = [Date | null, Date | null]

type DateRangeFilterProps = {
  logoUrl?: string
  initialFrom?: string
  initialTo?: string
}

const normalizeDateOnly = (value?: string): string | null => {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null

  return normalized
}

const toDateOnly = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeRange = (range: DateRange): DateRange => {
  const [start, end] = range
  if (start && end && start > end) {
    return [end, start]
  }

  return range
}

const toStringRange = (range: DateObjectRange): DateRange => [
  range[0] ? toDateOnly(range[0]) : null,
  range[1] ? toDateOnly(range[1]) : null,
]

const startOfDay = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const getDefaultRangePresets = (): { label: string; value: DateRange }[] => {
  const today = startOfDay(new Date())

  const lastNDays = (days: number): DateObjectRange => {
    const end = today
    const start = new Date(today)
    start.setDate(today.getDate() - (days - 1))
    return [start, end]
  }

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return [
    { label: 'Last 7 days', value: toStringRange(lastNDays(7)) },
    {
      label: 'Last 30 days',
      value: toStringRange(lastNDays(30)),
    },
    {
      label: 'Last 60 days',
      value: toStringRange(lastNDays(60)),
    },
    {
      label: 'This month',
      value: [toDateOnly(startOfMonth), toDateOnly(today)],
    },
  ]
}

export function DateRangeFilter({ logoUrl, initialFrom, initialTo }: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialRange = useMemo<DateRange>(
    () => normalizeRange([normalizeDateOnly(initialFrom), normalizeDateOnly(initialTo)]),
    [initialFrom, initialTo],
  )

  const [range, setRange] = useState<DateRange>(initialRange)

  useEffect(() => {
    setRange(initialRange)
  }, [initialRange])

  const hasSelectedDateRange = Boolean(range[0] || range[1])

  const pushRangeToUrl = (nextRange: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    const [start, end] = normalizeRange(nextRange)

    if (logoUrl) {
      params.set('logoUrl', logoUrl)
    }

    if (start) {
      params.set('from', start)
    } else {
      params.delete('from')
    }

    if (end) {
      params.set('to', end)
    } else {
      params.delete('to')
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleRangeChange = (nextRange: DateRange) => {
    const normalized = normalizeRange(nextRange)
    setRange(normalized)
    pushRangeToUrl(normalized)
  }

  const clearRange = () => {
    setRange([null, null])
    pushRangeToUrl([null, null])
  }

  return (
    <DatePickerInput
      w={{ base: '100%', md: 'auto' }}
      leftSection={<CalendarSearch size={16} />}
      type="range"
      placeholder="Transactions date range"
      value={range}
      onChange={handleRangeChange}
      presets={getDefaultRangePresets()}
      clearable
      size="sm"
    />
  )
}
