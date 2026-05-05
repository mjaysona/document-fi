'use client'

import { Button } from '@mantine/core'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <Button variant="default" leftSection={<Printer size={16} />} onClick={() => window.print()}>
      Print
    </Button>
  )
}
