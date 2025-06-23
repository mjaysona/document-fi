'use client'

import { AppShell, Burger, NavLink, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { LogOut } from 'lucide-react'
import { signOut } from '../lib/auth-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ({ params: paramsPromise }: { params: Promise<{ slug: string[] }> }) {
  const [opened, { toggle }] = useDisclosure()
  const [isSigningOut, setIsSigningOut] = useState<Boolean>(false)
  const router = useRouter()

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

      <AppShell.Main>Main</AppShell.Main>
    </AppShell>
  )
}
