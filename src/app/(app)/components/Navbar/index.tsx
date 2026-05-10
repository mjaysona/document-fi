'use client'

import { signOut } from '@/app/(app)/lib/auth-client'
import { ActionIcon, AppShell, Button, Flex, Menu, NavLink, Stack, Tooltip } from '@mantine/core'
import {
  ArrowLeftToLine,
  ArrowRightFromLine,
  ChevronDown,
  ChevronUp,
  FileText,
  LayoutDashboard,
  Landmark,
  LogOut,
  Settings,
  Weight,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type NavbarProps = {
  isExpanded: boolean
  toggleExpandCollapse: () => void
  mobileBreakpoint?: string
}

export const Navbar = ({ isExpanded, toggleExpandCollapse, mobileBreakpoint }: NavbarProps) => {
  const [isSigningOut, setIsSigningOut] = useState<Boolean>(false)
  const [recordsOpened, setRecordsOpened] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isRecordsActive = pathname.startsWith('/app/records')
  const isWeightBillsActive = pathname.startsWith('/app/records/weight-bills')
  const isQuotationsActive = pathname.startsWith('/app/records/quotations')
  const isTransactionsActive = pathname.startsWith('/app/records/transactions')
  const isFinancialAccountsActive = pathname.startsWith('/app/financial-accounts')

  useEffect(() => {
    if (isRecordsActive) setRecordsOpened(true)
  }, [isRecordsActive])

  const navItems = [
    {
      id: 'financial-accounts',
      label: 'Financial Accounts',
      icon: Landmark,
      path: '/app/financial-accounts',
      active: isFinancialAccountsActive,
    },
    {
      id: 'records',
      label: 'Records',
      icon: LayoutDashboard,
      path: '/app/records',
      active: isRecordsActive && !isWeightBillsActive && !isQuotationsActive,
      opened: recordsOpened,
      children: [
        {
          id: 'weight-bills',
          label: 'Weight Bills',
          icon: Weight,
          path: '/app/records/weight-bills',
          active: isWeightBillsActive,
        },
        {
          id: 'quotations',
          label: 'Quotations',
          icon: FileText,
          path: '/app/records/quotations',
          active: isQuotationsActive,
        },
        {
          id: 'transactions',
          label: 'Transactions',
          icon: FileText,
          path: '/app/records/transactions',
          active: isTransactionsActive,
        },
      ],
    },
  ]

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
                    rightSection={<ChevronUp size={16} />}
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
                  <Menu.Item
                    leftSection={<FileText size={16} />}
                    onClick={() => router.push('/app/records/transactions/add')}
                  >
                    Transaction
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Flex>
          <Flex direction="column">
            {navItems.map(({ id, label, path, active, icon: Icon, children, opened }) => (
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
                  rightSection={
                    isExpanded && children?.length ? (
                      <ChevronUp
                        size={16}
                        style={{
                          transform: opened ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 150ms ease',
                        }}
                      />
                    ) : undefined
                  }
                  variant="subtle"
                  h={40}
                  childrenOffset={20}
                  opened={isExpanded ? opened : undefined}
                  onClick={() => {
                    if (!isExpanded) {
                      router.push(path)
                      return
                    }

                    if (id === 'records' && children?.length) {
                      setRecordsOpened((prev) => !prev)
                      return
                    }

                    router.push(path)
                  }}
                >
                  {children?.map((child) => (
                    <NavLink
                      key={child.id}
                      label={child.label}
                      leftSection={child.icon ? <child.icon size={14} /> : undefined}
                      active={child.active}
                      variant="subtle"
                      onClick={() => router.push(child.path)}
                    />
                  ))}
                </NavLink>
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
