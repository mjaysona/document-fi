'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@mantine/core'

export type TransactionTypeFilterValue = 'all' | 'debit' | 'credit'

type TransactionTypeFilterProps = {
  initialTransactionType?: TransactionTypeFilterValue
}

const parseTransactionTypeValue = (value?: string | null): TransactionTypeFilterValue => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized === 'debit') return 'debit'
  if (normalized === 'credit') return 'credit'
  return 'all'
}

export function TransactionTypeFilter({
  initialTransactionType = 'all',
}: TransactionTypeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialValue = useMemo(
    () => parseTransactionTypeValue(initialTransactionType),
    [initialTransactionType],
  )

  const [value, setValue] = useState<TransactionTypeFilterValue>(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const pushValueToUrl = (nextValue: TransactionTypeFilterValue) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextValue === 'all') {
      params.delete('tt')
    } else {
      params.set('tt', nextValue)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleValueChange = (nextValue: string | null) => {
    const safeValue = parseTransactionTypeValue(nextValue)
    setValue(safeValue)
    pushValueToUrl(safeValue)
  }

  return (
    <Select
      label="Transaction type"
      placeholder="All transactions"
      data={[
        { value: 'all', label: 'All transactions' },
        { value: 'debit', label: 'Debit only' },
        { value: 'credit', label: 'Credit only' },
      ]}
      value={value}
      onChange={handleValueChange}
      allowDeselect={false}
      size="sm"
    />
  )
}
