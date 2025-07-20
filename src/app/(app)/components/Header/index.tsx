import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { AuthActions } from './AuthActions'
import { auth } from '@/app/(app)/lib/auth'
import { headers } from 'next/headers'
import { Group } from '@mantine/core'

export const Header: React.FC = async () => {
  let session
  let user

  try {
    session = await auth.api.getSession({
      headers: await headers(),
    })
    user = session?.user
  } catch (error) {
    console.error('Error fetching session:', error)
  }

  return (
    <header>
      <Group justify="space-between" py={16}>
        <Link href="/">
          <Image
            alt="Payload Logo"
            height={30}
            src="/logo-placeholder-01-dark--static.svg"
            width={150}
          />
        </Link>
        <AuthActions />
      </Group>
    </header>
  )
}
