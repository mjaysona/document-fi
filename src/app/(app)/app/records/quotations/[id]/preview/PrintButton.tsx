'use client'

import { ActionIcon } from '@mantine/core'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <ActionIcon variant="default" size="lg" aria-label="Print" onClick={() => window.print()}>
      <Printer size={16} />
    </ActionIcon>
  )
}
