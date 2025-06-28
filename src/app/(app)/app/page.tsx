'use client'

import { Alert, AppShell, Burger, NavLink, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { CircleCheck, LogOut } from 'lucide-react'
import { signOut } from '../lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ({ params: paramsPromise }: { params: Promise<{ slug: string[] }> }) {
  const [opened, { toggle }] = useDisclosure()
  const [isSigningOut, setIsSigningOut] = useState<Boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified')

  useEffect(() => {
    if (verified) {
      setSuccessMessage('Your account has been verified.')
    }
  }, [verified])

  const logout = async () => {
    await signOut({
      fetchOptions: {
        onRequest: (ctx) => {
          setIsSigningOut(true)
        },
        onSuccess: () => {
          setIsSigningOut(false)
          router.push(`/login?success=${encodeURIComponent('You have been logged out.')}`)
        },
      },
    })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <div>Logo</div>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack
          h={'100%'}
          bg="var(--mantine-color-body)"
          align="stretch"
          justify="space-between"
          gap="md"
        >
          <div>Nav menu</div>
          <NavLink
            label={isSigningOut ? 'Logging out...' : 'Log out'}
            leftSection={<LogOut style={{ transform: 'rotate(180deg)' }} size={16} />}
            onClick={logout}
            disabled={Boolean(isSigningOut)}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {successMessage && (
          <Alert
            variant="light"
            color="green"
            withCloseButton
            icon={<CircleCheck />}
            mb="md"
            onClose={() => {}}
          >
            {successMessage}
          </Alert>
        )}
        <Text>Welcome!</Text>
      </AppShell.Main>
    </AppShell>
  )
}
