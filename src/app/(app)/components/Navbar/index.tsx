'use client'

import { signOut } from '@/app/(app)/lib/auth-client'
import { AppShell, Button, NavLink, Stack } from '@mantine/core'
import {
  ChartPie,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  Rows3,
  Settings,
} from 'lucide-react'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { useState } from 'react'

export const Navbar = () => {
  const [isSigningOut, setIsSigningOut] = useState<Boolean>(false)
  const router = useRouter()
  const activePath = useSelectedLayoutSegment()
  const logout = async () => {
    await signOut({
      fetchOptions: {
        onRequest: () => {
          setIsSigningOut(true)
        },
        onSuccess: () => {
          router.push(`/login?success=${encodeURIComponent('You have been logged out.')}`)
        },
      },
    })
  }
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={16} />,
      path: '/app/dashboard',
      active: activePath === 'dashboard',
    },
    {
      id: 'sets',
      label: 'Sets',
      icon: <Rows3 size={16} />,
      path: '/app/sets',
      active: activePath === 'sets',
    },
    {
      id: 'assessments',
      label: 'Assessments',
      icon: <ListChecks size={16} />,
      path: '/app/assessments',
      active: activePath === 'assessments',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <ChartPie size={16} />,
      path: '/app/analytics',
      active: activePath === 'analytics',
    },
  ]

  return (
    <AppShell.Navbar p="md">
      <Stack
        h={'100%'}
        bg="var(--mantine-color-body)"
        align="stretch"
        justify="space-between"
        gap="md"
      >
        <div>
          <Button
            mb="md"
            fullWidth
            variant="primary"
            onClick={() => {}}
            leftSection={<PlusCircle size={16} />}
          >
            Start an assessment
          </Button>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              active={item.active}
              label={item.label}
              leftSection={item.icon}
              href={item.path}
              variant="subtle"
            />
          ))}
        </div>
        <div>
          <NavLink label="Settings" leftSection={<Settings size={16} />} href="/app/settings" />
          <NavLink
            label={isSigningOut ? 'Logging out...' : 'Log out'}
            leftSection={<LogOut style={{ transform: 'rotate(180deg)' }} size={16} />}
            onClick={logout}
            disabled={Boolean(isSigningOut)}
          />
        </div>
      </Stack>
    </AppShell.Navbar>
  )
}
