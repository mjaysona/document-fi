'use client'

import { useState } from 'react'
import {
  Button,
  CopyButton,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { Share2, Copy, Check, Link2Off } from 'lucide-react'
import { generateShareToken, revokeShareToken } from '@/app/(app)/app/records/quotations/actions'

type Props = {
  quoteId: string
  initialIsShared: boolean
  initialShareToken?: string
  initialShareExpiresAt?: string
}

type ShareDuration = '1d' | '7d' | '30d' | 'never'

const DURATION_LABELS: Record<ShareDuration, string> = {
  '1d': '1 day',
  '7d': '7 days',
  '30d': '30 days',
  never: 'No expiry',
}

function formatExpiry(expiresAt: string | undefined): string {
  if (!expiresAt) return 'No expiry'
  const d = new Date(expiresAt)
  if (isNaN(d.getTime())) return 'No expiry'
  const now = Date.now()
  if (d.getTime() < now) return 'Expired'
  const diff = d.getTime() - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days === 1 ? 'Expires in 1 day' : `Expires in ${days} days`
}

export function ShareModal({
  quoteId,
  initialIsShared,
  initialShareToken,
  initialShareExpiresAt,
}: Props) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState<ShareDuration>('7d')
  const [isShared, setIsShared] = useState(initialIsShared)
  const [shareToken, setShareToken] = useState(initialShareToken)
  const [shareExpiresAt, setShareExpiresAt] = useState(initialShareExpiresAt)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SERVER_URL ?? '')
  const shareUrl = shareToken ? `${baseUrl}/q/${shareToken}` : null
  const isExpired = isShared && shareExpiresAt ? new Date(shareExpiresAt) < new Date() : false
  const isActive = isShared && !isExpired

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    const result = await generateShareToken(quoteId, duration)
    if (result.success && result.shareToken) {
      setShareToken(result.shareToken)
      const ms: Record<ShareDuration, number | null> = {
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        never: null,
      }
      const expMs = ms[duration]
      setShareExpiresAt(expMs ? new Date(Date.now() + expMs).toISOString() : undefined)
      setIsShared(true)
    } else {
      setError(result.error ?? 'Failed to generate link.')
    }
    setIsGenerating(false)
  }

  const handleRevoke = async () => {
    setIsRevoking(true)
    setError(null)
    const result = await revokeShareToken(quoteId)
    if (result.success) {
      setShareToken(undefined)
      setShareExpiresAt(undefined)
      setIsShared(false)
    } else {
      setError(result.error ?? 'Failed to revoke link.')
    }
    setIsRevoking(false)
  }

  return (
    <>
      <Button variant="default" leftSection={<Share2 size={16} />} onClick={() => setOpen(true)}>
        Share
      </Button>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title="Share quotation"
        size="sm"
        centered
      >
        <Stack gap="md">
          {isActive && shareUrl ? (
            <>
              <Text size="sm" c="dimmed">
                {formatExpiry(shareExpiresAt)}
              </Text>
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  value={shareUrl}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                />
                <CopyButton value={shareUrl} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy link'} withArrow>
                      <ActionIcon
                        variant={copied ? 'filled' : 'default'}
                        color={copied ? 'teal' : undefined}
                        onClick={copy}
                        size="lg"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Group justify="space-between">
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<Link2Off size={14} />}
                  onClick={handleRevoke}
                  loading={isRevoking}
                >
                  Revoke link
                </Button>
                <Button variant="subtle" size="xs" onClick={() => setIsShared(false)}>
                  Regenerate
                </Button>
              </Group>
            </>
          ) : (
            <>
              {isExpired && (
                <Text size="sm" c="red">
                  This link has expired.
                </Text>
              )}
              <Select
                label="Link expires after"
                data={Object.entries(DURATION_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={duration}
                onChange={(v) => v && setDuration(v as ShareDuration)}
              />
              <Button onClick={handleGenerate} loading={isGenerating} fullWidth>
                {isShared ? 'Regenerate link' : 'Generate link'}
              </Button>
            </>
          )}

          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  )
}
