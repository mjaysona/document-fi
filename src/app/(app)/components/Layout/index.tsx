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
import { UserPreference } from '~/payload-types'
import { useMutation } from '@tanstack/react-query'

type LayoutProps = {
  children: React.ReactNode
  userPreferences?: Partial<UserPreference>
}

export default function Layout({ children, userPreferences }: LayoutProps) {
  const { isValidSession } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState<boolean>(
    userPreferences?.sidenavState !== 'collapsed',
  )
  const [opened, { toggle: handleToggleColorScheme }] = useDisclosure()
  const router = useRouter()
  const { setColorScheme } = useMantineColorScheme()
  const colorScheme = useComputedColorScheme('light')
  const mobileBreakpoint = 'sm'

  useEffect(() => {
    logout()
  }, [isValidSession])

  const logout = async () => {
    if (!isValidSession) {
      // TODO: FIX TIHS
      // signOut({
      //   fetchOptions: {
      //     onRequest: () => {
      //       setIsSigningOut(true)
      //     },
      //     onSuccess: () => {
      //       router.push(
      //         `/login?success=${encodeURIComponent('Your session has expired. Please log in again.')}`,
      //       )
      //     },
      //   },
      // })
    }
  }

  const saveUserPreferences = async (newState: boolean) => {
    if (!userPreferences?.id || mutation.isPending) return
    await fetch(`/api/user-preferences/${userPreferences.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sidenavState: newState ? 'expanded' : 'collapsed',
      }),
    })
  }

  const mutation = useMutation({
    mutationFn: saveUserPreferences,
  })

  const handleToggleExpandCollapse = () => {
    setIsExpanded((prev) => {
      const newState = !prev
      mutation.mutate(newState)
      return newState
    })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: isExpanded ? 300 : 62,
        breakpoint: mobileBreakpoint,
        collapsed: { mobile: !opened },
      }}
      padding="lg"
      transitionDuration={0}
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
            onClick={() => {
              handleToggleColorScheme()
              setIsExpanded(true)
            }}
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
      <Navbar
        isExpanded={isExpanded}
        toggleExpandCollapse={handleToggleExpandCollapse}
        mobileBreakpoint={mobileBreakpoint}
      />
      <AppShell.Main style={{ display: 'flex', flexDirection: 'column' }}>
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
