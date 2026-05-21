'use client'

import { useRouter } from 'next/navigation'
import { Button, Group, ActionIcon } from '@mantine/core'
import { ArrowLeft, Pencil } from 'lucide-react'

export function PreviewActions({ id }: { id: string }) {
  const router = useRouter()
  return (
    <Group justify="space-between">
      <ActionIcon
        variant="default"
        size="lg"
        radius="sm"
        aria-label="Back"
        onClick={() => router.push(`/app/financial-accounts/${id}`)}
        style={{ flexShrink: 0 }}
      >
        <ArrowLeft size={16} />
      </ActionIcon>
    </Group>
  )
}
