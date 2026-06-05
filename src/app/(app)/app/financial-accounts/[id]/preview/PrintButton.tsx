'use client'

import { ActionIcon } from '@mantine/core'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="sm"
      aria-label="Print"
      style={{ flexShrink: 0 }}
      onClick={() => window.print()}
    >
      <Printer size={16} />
    </ActionIcon>
  )
}
