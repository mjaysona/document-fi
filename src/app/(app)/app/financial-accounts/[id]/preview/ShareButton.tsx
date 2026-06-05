'use client'

import { useState } from 'react'
import { ActionIcon } from '@mantine/core'
import { Share2 } from 'lucide-react'
import { ComingSoonModal } from './ComingSoonModal'

export function ShareButton() {
  const [modalOpened, setModalOpened] = useState(false)

  return (
    <>
      <ActionIcon
        variant="default"
        size="lg"
        radius="sm"
        aria-label="Share"
        style={{ flexShrink: 0 }}
        onClick={() => setModalOpened(true)}
      >
        <Share2 size={16} />
      </ActionIcon>
      <ComingSoonModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Share Feature Coming Soon"
        message="The ability to share transaction reports is not available yet. We're working on it!"
      />
    </>
  )
}
