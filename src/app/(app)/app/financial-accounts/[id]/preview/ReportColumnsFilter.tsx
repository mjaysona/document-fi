'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MultiSelect } from '@mantine/core'
import {
  parseReportColumnKeys,
  serializeReportColumnKeys,
  TRANSACTION_REPORT_COLUMN_OPTIONS,
  type TransactionReportColumnKey,
} from './columns'

type ReportColumnsFilterProps = {
  initialColumns: TransactionReportColumnKey[]
}

export function ReportColumnsFilter({ initialColumns }: ReportColumnsFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initial = useMemo(() => parseReportColumnKeys(initialColumns.join(',')), [initialColumns])
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initial)

  useEffect(() => {
    setSelectedColumns(initial)
  }, [initial])

  const pushColumnsToUrl = (nextColumns: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cols', serializeReportColumnKeys(nextColumns))

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleColumnsChange = (nextColumns: string[]) => {
    setSelectedColumns(nextColumns)
    pushColumnsToUrl(nextColumns)
  }

  return (
    <MultiSelect
      placeholder="Shown columns"
      data={TRANSACTION_REPORT_COLUMN_OPTIONS.map((column) => ({
        value: column.value,
        label: column.label,
      }))}
      value={selectedColumns}
      onChange={handleColumnsChange}
      hidePickedOptions
      searchable
      clearable={false}
      size="sm"
      className="reportColumnsFilter"
      styles={{
        root: { minWidth: 280 },
        input: { minHeight: 36 },
      }}
    />
  )
}
