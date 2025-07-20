'use client'

import {
  ActionIcon,
  AppShell,
  Flex,
  Loader,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import classes from './index.module.css'
import { Logo } from '@/app/(app)/components/Logo'
import { Navbar } from '@/app/(app)/components/Navbar'
import { useAuth } from '@/app/providers/Auth'
import { signOut } from '@/app/(app)/lib/auth-client'
import { useEffect, useState } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isValidSession } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false)
  const [opened, { toggle }] = useDisclosure()
  const router = useRouter()
  const { setColorScheme } = useMantineColorScheme()
  const colorScheme = useComputedColorScheme('light')

  useEffect(() => {
    logout()
  }, [isValidSession])

  const logout = async () => {
    if (!isValidSession) {
      signOut({
        fetchOptions: {
          onRequest: () => {
            setIsSigningOut(true)
          },
          onSuccess: () => {
            router.push(
              `/login?success=${encodeURIComponent('Your session has expired. Please log in again.')}`,
            )
          },
        },
      })
    }
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header className={classes.header}>
        <ActionIcon
          variant="transparent"
          onClick={() => router.push('/app')}
          className={classes.menuButton}
          w="auto"
        >
          <Logo />
        </ActionIcon>
        <div>
          <ActionIcon
            onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            radius="sm"
            aria-label="Toggle color scheme"
          >
            <Sun size={16} className="light" />
            <Moon size={16} className="dark" />
          </ActionIcon>
          <ActionIcon
            onClick={() => toggle()}
            hiddenFrom="sm"
            variant="default"
            size="lg"
            radius="sm"
            aria-label="Toggle navigation"
          >
            <Menu size={16} display={!opened ? 'block' : 'none'} />
            <X size={16} display={opened ? 'block' : 'none'} />
          </ActionIcon>
        </div>
      </AppShell.Header>
      <Navbar />
      <AppShell.Main>
        {!isValidSession ? (
          <>
            <Flex align="center" gap="xs" pb="xl">
              <Loader size={36} />
              <Text>Session expired, logging you out...</Text>
            </Flex>
          </>
        ) : (
          children
        )}
      </AppShell.Main>
    </AppShell>
  )
}
