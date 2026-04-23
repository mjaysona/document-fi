'use client'

import { useAuth } from '@/app/providers/Auth'
import { requestPasswordReset } from '@/app/(app)/lib/auth-client'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { isNotEmpty, useForm } from '@mantine/form'
import { CircleAlert, CircleCheck, KeySquare, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { UserRole } from '~/payload-types'

export default function UserProfileClient() {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      name: user?.name || '',
    },
    validate: {
      name: isNotEmpty('Name cannot be empty.'),
    },
  })

  const handleSave = async (values: { name: string }) => {
    if (!user?.id) return
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const res = await fetch(`/api/users/account/${user.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name }),
      })

      if (!res.ok) throw new Error('Failed to update profile.')
      setSaveSuccess(true)
    } catch (e) {
      setSaveError((e as Error).message || 'An error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordReset = () => {
    if (!user?.email) return
    setIsSendingReset(true)
    setResetSuccess(false)
    setResetError(null)

    requestPasswordReset(
      { email: user.email },
      {
        onSuccess: () => {
          setResetSuccess(true)
          setIsSendingReset(false)
        },
        onError: ({ error }) => {
          setResetError(error?.message || 'Failed to send reset email. Please try again.')
          setIsSendingReset(false)
        },
      },
    )
  }

  const roles = (user?.userRoles || [])
    .map((r) => (typeof r !== 'string' ? (r as UserRole) : null))
    .filter(Boolean) as UserRole[]

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <Stack maw={600} gap="md">
      <Title order={4}>My Profile</Title>

      <Card withBorder radius="md" p="lg">
        <Group mb="lg">
          <Avatar size={64} radius="xl" color="blue">
            {initials}
          </Avatar>
          <div>
            <Text fw={700} size="lg">
              {user?.name || '—'}
            </Text>
            <Text c="dimmed" size="sm">
              {user?.email}
            </Text>
          </div>
        </Group>

        <Divider mb="lg" />

        <Stack gap="xs" mb="lg">
          <Group gap="xs">
            <User size={14} />
            <Text size="sm" fw={500}>
              Name
            </Text>
          </Group>
          <form onSubmit={form.onSubmit(handleSave)}>
            <Stack gap="xs">
              {saveSuccess && (
                <Alert color="green" icon={<CircleCheck size={16} />} p="xs">
                  Profile updated successfully.
                </Alert>
              )}
              {saveError && (
                <Alert color="red" icon={<CircleAlert size={16} />} p="xs">
                  {saveError}
                </Alert>
              )}
              <Group align="flex-end" gap="xs">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Your name"
                  key={form.key('name')}
                  {...form.getInputProps('name')}
                />
                <Button type="submit" loading={isSaving} variant="light">
                  Save
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>

        <Stack gap="xs" mb="lg">
          <Group gap="xs">
            <Mail size={14} />
            <Text size="sm" fw={500}>
              Email
            </Text>
          </Group>
          <Group gap="xs">
            <Text size="sm">{user?.email}</Text>
            {user?.isEmailVerified ? (
              <Badge color="green" size="xs" variant="light">
                Verified
              </Badge>
            ) : (
              <Badge color="orange" size="xs" variant="light">
                Unverified
              </Badge>
            )}
          </Group>
        </Stack>

        {roles.length > 0 && (
          <Stack gap="xs" mb="lg">
            <Text size="sm" fw={500}>
              Role{roles.length > 1 ? 's' : ''}
            </Text>
            <Group gap="xs">
              {roles.map((role) => (
                <Badge key={role.id} variant="light" color="blue">
                  {role.label}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}

        <Divider mb="lg" />

        <Stack gap="xs">
          <Group gap="xs">
            <KeySquare size={14} />
            <Text size="sm" fw={500}>
              Password
            </Text>
          </Group>
          {resetSuccess && (
            <Alert color="green" icon={<CircleCheck size={16} />} p="xs">
              Password reset link sent to {user?.email}. Check your inbox.
            </Alert>
          )}
          {resetError && (
            <Alert color="red" icon={<CircleAlert size={16} />} p="xs">
              {resetError}
            </Alert>
          )}
          <Button
            variant="default"
            onClick={handlePasswordReset}
            loading={isSendingReset}
            leftSection={<KeySquare size={14} />}
            style={{ alignSelf: 'flex-start' }}
          >
            Send password reset email
          </Button>
        </Stack>
      </Card>
    </Stack>
  )
}
