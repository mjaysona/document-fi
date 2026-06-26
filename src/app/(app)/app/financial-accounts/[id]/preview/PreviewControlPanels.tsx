'use client'

import { useMemo, useState } from 'react'
import { ActionIcon, Box, Collapse, Grid, GridCol, Group, Stack } from '@mantine/core'
import { Filter, Settings } from 'lucide-react'
import { ReportColumnsFilter } from './ReportColumnsFilter'
import { ReportSectionsFilter } from './ReportSectionsFilter'
import { StartingBalanceFilter } from './StartingBalanceFilter'
import {
  TransactionTypeFilter,
  type TransactionTypeFilterValue,
} from './TransactionTypeFilter'
import { DEFAULT_REPORT_SECTIONS, normalizeReportSections, type ReportSectionKey } from './reportSections'
import type { TransactionReportColumnKey } from './columns'

type PreviewControlPanelsProps = {
  initialStartingBalance?: string
  initialTransactionType: TransactionTypeFilterValue
  initialSections: ReportSectionKey[]
  initialColumns: TransactionReportColumnKey[]
}

const hasStartingBalanceFilter = (value?: string): boolean => {
  return String(value || '').trim().length > 0
}

export function PreviewControlPanels({
  initialStartingBalance,
  initialTransactionType,
  initialSections,
  initialColumns,
}: PreviewControlPanelsProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [tableConfigOpen, setTableConfigOpen] = useState(false)

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
    (hasCustomSections ? 1 : 0)

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
      <Group justify="flex-end" gap="xs" align="center">
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
                <StartingBalanceFilter initialStartingBalance={initialStartingBalance} />
              </GridCol>
              <GridCol span={{ base: 12, xs: 6, md: 3 }}>
                <TransactionTypeFilter initialTransactionType={initialTransactionType} />
              </GridCol>
              <GridCol span={{ base: 12, xs: 12, md: 6 }}>
                <ReportSectionsFilter initialSections={initialSections} />
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
