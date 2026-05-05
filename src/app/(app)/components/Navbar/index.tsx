'use client'

import { signOut } from '@/app/(app)/lib/auth-client'
import { ActionIcon, AppShell, Button, Flex, Menu, NavLink, Stack, Tooltip } from '@mantine/core'
import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { useState } from 'react'

type NavbarProps = {
  isExpanded: boolean
  toggleExpandCollapse: () => void
  mobileBreakpoint?: string
}

export const Navbar = ({ isExpanded, toggleExpandCollapse, mobileBreakpoint }: NavbarProps) => {
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
      id: 'records',
      label: 'Records',
      icon: LayoutDashboard,
      path: '/app/records',
      active: activePath === 'records',
    },
  ]

  return (
    <AppShell.Navbar p="xs">
      <Stack
        h={'100%'}
        bg="var(--mantine-color-body)"
        align="stretch"
        justify="space-between"
        gap="md"
      >
        <Flex gap={'sm'} direction="column">
          <Flex gap={'sm'}>
            <ActionIcon
              variant="default"
              aria-label="Collapse"
              size={42}
              onClick={toggleExpandCollapse}
              display={{ base: 'none', [mobileBreakpoint || 'sm']: 'block' }}
            >
              {isExpanded ? <ArrowLeftToLine size={16} /> : <ArrowRightFromLine size={16} />}
            </ActionIcon>
            {isExpanded && (
              <Menu shadow="md" width={220} position="bottom-start">
                <Menu.Target>
                  <Button
                    fullWidth
                    variant="primary"
                    rightSection={<ChevronDown size={16} />}
                    justify="space-between"
                    size="md"
                  >
                    New record
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<LayoutDashboard size={16} />}
                    onClick={() => router.push('/app/records/weight-bills/new')}
                  >
                    Weight Bill
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<FileText size={16} />}
                    onClick={() => router.push('/app/records/quotations/add')}
                  >
                    Quotation
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Flex>
          <Flex direction="column">
            {navItems.map(({ id, label, path, active, icon: Icon }) => (
              <Tooltip
                key={id}
                arrowOffset={30}
                arrowSize={4}
                label={label}
                withArrow
                position="right"
                disabled={isExpanded}
              >
                <NavLink
                  styles={{
                    body: { display: isExpanded ? 'block' : 'none' },
                    section: { marginInlineEnd: isExpanded ? 'var(--mantine-spacing-xs)' : '0' },
                  }}
                  active={active}
                  label={isExpanded ? label : undefined}
                  leftSection={<Icon size={16} />}
                  onClick={() => router.push(path)}
                  variant="subtle"
                  h={40}
                />
              </Tooltip>
            ))}
          </Flex>
        </Flex>
        <Flex direction="column">
          <Tooltip
            arrowOffset={30}
            arrowSize={4}
            label="Settings"
            withArrow
            position="right"
            disabled={isExpanded}
          >
            <NavLink
              styles={{
                body: { display: isExpanded ? 'block' : 'none' },
                section: { marginInlineEnd: isExpanded ? 'var(--mantine-spacing-xs)' : '0' },
              }}
              label={isExpanded ? 'Settings' : undefined}
              leftSection={<Settings size={16} />}
              onClick={() => router.push('/app/settings')}
              variant="subtle"
              h={40}
            />
          </Tooltip>
          <Tooltip
            arrowOffset={30}
            arrowSize={4}
            label="Settings"
            withArrow
            position="right"
            disabled={isExpanded}
          >
            <NavLink
              styles={{
                root: { whiteSpace: 'nowrap' },
                body: { display: isExpanded ? 'block' : 'none' },
                section: { marginInlineEnd: isExpanded ? 'var(--mantine-spacing-xs)' : '0' },
              }}
              label={isExpanded ? (isSigningOut ? 'Logging out...' : 'Log out') : undefined}
              leftSection={<LogOut style={{ transform: 'rotate(180deg)' }} size={16} />}
              onClick={logout}
              disabled={Boolean(isSigningOut)}
              variant="subtle"
              h={40}
            />
          </Tooltip>
        </Flex>
      </Stack>
    </AppShell.Navbar>
  )
}
