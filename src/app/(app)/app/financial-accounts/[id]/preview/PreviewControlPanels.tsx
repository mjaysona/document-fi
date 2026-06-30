'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ActionIcon, Box, Collapse, Grid, GridCol, Group, MultiSelect, Stack } from '@mantine/core'
import { Filter, Settings } from 'lucide-react'
import { useMediaQuery } from '@mantine/hooks'
import { ReportColumnsFilter } from './ReportColumnsFilter'
import { ReportSectionsFilter } from './ReportSectionsFilter'
import { TransactionTypeFilter, type TransactionTypeFilterValue } from './TransactionTypeFilter'
import {
  DEFAULT_REPORT_SECTIONS,
  normalizeReportSections,
  type ReportSectionKey,
} from './reportSections'
import type { TransactionReportColumnKey } from './columns'
import { ShareButton } from '@/app/(app)/app/financial-accounts/[id]/preview/ShareButton'
import { PrintButton } from '@/app/(app)/app/records/quotations/[id]/preview/PrintButton'

type Option = {
  value: string
  label: string
}

type PreviewControlPanelsProps = {
  initialStartingBalance?: string
  initialTransactionType: TransactionTypeFilterValue
  initialSections: ReportSectionKey[]
  initialColumns: TransactionReportColumnKey[]
  initialStatuses: Array<'completed' | 'failed'>
  initialTransactionPurposes: string[]
  initialSourceAccounts: string[]
  initialDestinationAccounts: string[]
  transactionPurposeOptions: Option[]
  bankOptions: Option[]
  toolbarLeft?: ReactNode
}

const hasStartingBalanceFilter = (value?: string): boolean => {
  return String(value || '').trim().length > 0
}

const serializeCsv = (values: string[]): string => {
  return [...values].filter(Boolean).sort().join(',')
}

export function PreviewControlPanels({
  initialStartingBalance,
  initialTransactionType,
  initialSections,
  initialColumns,
  initialStatuses,
  initialTransactionPurposes,
  initialSourceAccounts,
  initialDestinationAccounts,
  transactionPurposeOptions,
  bankOptions,
  toolbarLeft,
}: PreviewControlPanelsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 48em)')

  const [filterOpen, setFilterOpen] = useState(false)
  const [tableConfigOpen, setTableConfigOpen] = useState(false)
  const [statuses, setStatuses] = useState<string[]>(initialStatuses)
  const [transactionPurposes, setTransactionPurposes] = useState<string[]>(
    initialTransactionPurposes,
  )
  const [sourceAccounts, setSourceAccounts] = useState<string[]>(initialSourceAccounts)
  const [destinationAccounts, setDestinationAccounts] = useState<string[]>(
    initialDestinationAccounts,
  )
  const [openMultiSelect, setOpenMultiSelect] = useState<string | null>(null)

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
  const normalizedDefaultSections = useMemo(
    () => normalizeReportSections(DEFAULT_REPORT_SECTIONS),
    [],
  )

  const hasCustomSections = useMemo(() => {
    if (normalizedInitialSections.length !== normalizedDefaultSections.length) return true

    return normalizedInitialSections.some(
      (section, index) => section !== normalizedDefaultSections[index],
    )
  }, [normalizedDefaultSections, normalizedInitialSections])

  const activeFilterCount =
    (hasStartingBalanceFilter(initialStartingBalance) ? 1 : 0) +
    (initialTransactionType !== 'all' ? 1 : 0) +
    (hasCustomSections ? 1 : 0) +
    initialStatuses.length +
    initialTransactionPurposes.length +
    initialSourceAccounts.length +
    initialDestinationAccounts.length

  useEffect(() => {
    setStatuses(initialStatuses)
  }, [initialStatuses])

  useEffect(() => {
    setTransactionPurposes(initialTransactionPurposes)
  }, [initialTransactionPurposes])

  useEffect(() => {
    setSourceAccounts(initialSourceAccounts)
  }, [initialSourceAccounts])

  useEffect(() => {
    setDestinationAccounts(initialDestinationAccounts)
  }, [initialDestinationAccounts])

  const pushFiltersToUrl = (next: {
    statuses?: string[]
    transactionPurposes?: string[]
    sourceAccounts?: string[]
    destinationAccounts?: string[]
  }) => {
    const nextStatuses = next.statuses ?? statuses
    const nextPurposes = next.transactionPurposes ?? transactionPurposes
    const nextSourceAccounts = next.sourceAccounts ?? sourceAccounts
    const nextDestinationAccounts = next.destinationAccounts ?? destinationAccounts

    const params = new URLSearchParams(searchParams.toString())

    const serializedStatuses = serializeCsv(nextStatuses)
    if (serializedStatuses) params.set('statuses', serializedStatuses)
    else params.delete('statuses')

    const serializedPurposes = serializeCsv(nextPurposes)
    if (serializedPurposes) params.set('transactionPurposes', serializedPurposes)
    else params.delete('transactionPurposes')

    const serializedSourceAccounts = serializeCsv(nextSourceAccounts)
    if (serializedSourceAccounts) params.set('sourceAccounts', serializedSourceAccounts)
    else params.delete('sourceAccounts')

    const serializedDestinationAccounts = serializeCsv(nextDestinationAccounts)
    if (serializedDestinationAccounts)
      params.set('destinationAccounts', serializedDestinationAccounts)
    else params.delete('destinationAccounts')

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const toggleFilterCollapse = () => {
    setFilterOpen((open) => {
      const next = !open
      if (next) setTableConfigOpen(false)
      return next
    })
  }

  const toggleTableConfigCollapse = () => {
    setTableConfigOpen((open) => {
      const next = !open
      if (next) setFilterOpen(false)
      return next
    })
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" gap="xs" align="flex-end" wrap="wrap">
        <Box>{toolbarLeft}</Box>
        <Group gap="xs" align="center" style={{ flexShrink: 0 }}>
          <ActionIcon
            variant={filterOpen || activeFilterCount > 0 ? 'filled' : 'default'}
            size={36}
            aria-label="Toggle filters"
            onClick={toggleFilterCollapse}
          >
            <Filter size={16} />
          </ActionIcon>
          <ActionIcon
            variant={tableConfigOpen ? 'filled' : 'default'}
            size={36}
            aria-label="Table configuration"
            onClick={toggleTableConfigCollapse}
          >
            <Settings size={16} />
          </ActionIcon>
          <PrintButton />
          <ShareButton />
        </Group>
      </Group>

      <Box>
        <Collapse expanded={filterOpen} transitionDuration={0}>
          <Stack
            gap="xs"
            p="sm"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          >
            <Grid>
              <GridCol span={{ base: 12, xs: 6, md: 3 }}>
                <TransactionTypeFilter initialTransactionType={initialTransactionType} />
              </GridCol>
              <GridCol span={{ base: 12, xs: 12, md: 9 }}>
                <ReportSectionsFilter initialSections={initialSections} />
              </GridCol>

              <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                <MultiSelect
                  label="Status"
                  placeholder="All statuses"
                  data={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                  value={statuses}
                  onChange={(nextValues) => {
                    setStatuses(nextValues)
                    setOpenMultiSelect(null)
                    pushFiltersToUrl({ statuses: nextValues })
                  }}
                  dropdownOpened={openMultiSelect === 'status'}
                  onDropdownOpen={() => setOpenMultiSelect('status')}
                  onDropdownClose={() => setOpenMultiSelect(null)}
                  clearable
                />
              </GridCol>

              <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                <MultiSelect
                  label="Purpose"
                  placeholder="All purposes"
                  data={transactionPurposeOptions}
                  value={transactionPurposes}
                  onChange={(nextValues) => {
                    setTransactionPurposes(nextValues)
                    setOpenMultiSelect(null)
                    pushFiltersToUrl({ transactionPurposes: nextValues })
                  }}
                  dropdownOpened={openMultiSelect === 'transactionPurpose'}
                  onDropdownOpen={() => setOpenMultiSelect('transactionPurpose')}
                  onDropdownClose={() => setOpenMultiSelect(null)}
                  clearable
                  searchable
                />
              </GridCol>

              <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                <MultiSelect
                  label="Source account"
                  placeholder="All source accounts"
                  data={bankOptions}
                  value={sourceAccounts}
                  onChange={(nextValues) => {
                    setSourceAccounts(nextValues)
                    setOpenMultiSelect(null)
                    pushFiltersToUrl({ sourceAccounts: nextValues })
                  }}
                  dropdownOpened={openMultiSelect === 'sourceAccount'}
                  onDropdownOpen={() => setOpenMultiSelect('sourceAccount')}
                  onDropdownClose={() => setOpenMultiSelect(null)}
                  clearable
                  searchable
                  styles={{
                    pillsList: responsivePillsListStyle,
                  }}
                />
              </GridCol>

              <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                <MultiSelect
                  label="Destination account"
                  placeholder="All destination accounts"
                  data={bankOptions}
                  value={destinationAccounts}
                  onChange={(nextValues) => {
                    setDestinationAccounts(nextValues)
                    setOpenMultiSelect(null)
                    pushFiltersToUrl({ destinationAccounts: nextValues })
                  }}
                  dropdownOpened={openMultiSelect === 'destinationAccount'}
                  onDropdownOpen={() => setOpenMultiSelect('destinationAccount')}
                  onDropdownClose={() => setOpenMultiSelect(null)}
                  clearable
                  searchable
                  styles={{
                    pillsList: responsivePillsListStyle,
                  }}
                />
              </GridCol>
            </Grid>
          </Stack>
        </Collapse>

        <Collapse expanded={tableConfigOpen} transitionDuration={0}>
          <Stack
            gap="xs"
            p="sm"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          >
            <ReportColumnsFilter initialColumns={initialColumns} />
          </Stack>
        </Collapse>
      </Box>
    </Stack>
  )
}
