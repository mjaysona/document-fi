'use client'

import { Button } from '@mantine/core'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <Button
      w={{ base: '100%', md: 'auto' }}
      variant="default"
      leftSection={<Printer size={16} />}
      onClick={() => window.print()}
    >
      Print
    </Button>
  )
}
