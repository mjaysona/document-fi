'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NumberInput } from '@mantine/core'

type StartingBalanceFilterProps = {
  initialStartingBalance?: string
}

const parseOptionalNumber = (value?: string | null): number | '' => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : ''
}

export function StartingBalanceFilter({ initialStartingBalance }: StartingBalanceFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialValue = useMemo(
    () => parseOptionalNumber(initialStartingBalance),
    [initialStartingBalance],
  )

  const [value, setValue] = useState<number | ''>(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const pushValueToUrl = (nextValue: number | '') => {
    const params = new URLSearchParams(searchParams.toString())

    if (typeof nextValue === 'number' && Number.isFinite(nextValue)) {
      params.set('sb', String(nextValue))
    } else {
      params.delete('sb')
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleValueChange = (nextValue: string | number) => {
    const normalizedValue =
      typeof nextValue === 'number' && Number.isFinite(nextValue)
        ? nextValue
        : typeof nextValue === 'string' && nextValue.trim() === ''
          ? ''
          : Number(nextValue)

    const safeValue =
      typeof normalizedValue === 'number' && Number.isFinite(normalizedValue) ? normalizedValue : ''

    setValue(safeValue)
    pushValueToUrl(safeValue)
  }

  return (
    <NumberInput
      placeholder="Starting balance"
      label="Starting balance"
      decimalScale={2}
      fixedDecimalScale={false}
      allowDecimal
      allowNegative
      hideControls
      value={value}
      onChange={handleValueChange}
      size="sm"
    />
  )
}
