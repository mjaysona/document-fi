'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MultiSelect } from '@mantine/core'
import {
  REPORT_SECTION_OPTIONS,
  normalizeReportSections,
  serializeReportSections,
  type ReportSectionKey,
} from './reportSections'
import { useMediaQuery } from '@mantine/hooks'

type ReportSectionsFilterProps = {
  initialSections: ReportSectionKey[]
}

export function ReportSectionsFilter({ initialSections }: ReportSectionsFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 48em)')
  const responsivePillsListStyle = useMemo(
    () =>
      isDesktop
        ? {
            flexWrap: 'nowrap' as const,
            overflowX: 'auto' as const,
          }
        : {
            flexWrap: 'wrap' as const,
            overflowX: 'visible' as const,
          },
    [isDesktop],
  )

  const normalizedInitialSections = useMemo(
    () => normalizeReportSections(initialSections),
    [initialSections],
  )

  const [selectedSections, setSelectedSections] =
    useState<ReportSectionKey[]>(normalizedInitialSections)

  useEffect(() => {
    setSelectedSections(normalizedInitialSections)
  }, [normalizedInitialSections])

  const pushSectionsToUrl = (nextSections: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    const serialized = serializeReportSections(nextSections)

    if (!serialized) {
      params.delete('sections')
    } else {
      params.set('sections', serialized)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleSectionsChange = (nextSections: string[]) => {
    const safeSections = normalizeReportSections(nextSections)
    setSelectedSections(safeSections)
    pushSectionsToUrl(safeSections)
  }

  return (
    <MultiSelect
      label="Report sections"
      placeholder="Select report sections"
      data={REPORT_SECTION_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      value={selectedSections}
      onChange={handleSectionsChange}
      hidePickedOptions={false}
      clearable={false}
      size="sm"
      styles={{
        pillsList: responsivePillsListStyle,
      }}
    />
  )
}
