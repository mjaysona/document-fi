'use client'

import { Modal, Button, Text, Stack } from '@mantine/core'

export interface ComingSoonModalProps {
  opened: boolean
  onClose: () => void
  title?: string
  message?: string
}

export function ComingSoonModal({
  opened,
  onClose,
  title = 'Feature Coming Soon',
  message = 'This feature is not available yet. We are working on it!',
}: ComingSoonModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Text>{message}</Text>
        <Button onClick={onClose} fullWidth>
          Close
        </Button>
      </Stack>
    </Modal>
  )
}
