'use client'
import { Button } from '@mantine/core'
import { useRouter } from 'next/navigation'
import React from 'react'
import { User } from '~/payload-types'

interface AuthActionsProps {
  user?: Partial<User>
}

export const AuthActions: React.FC<AuthActionsProps> = ({ user }) => {
  const router = useRouter()

  // button to log in if user is not logged in or go to dashboard if user is logged in
  return (
    <Button
      onClick={() => {
        if (user) {
          router.push('/app')
        } else {
          router.push('/login')
        }
      }}
    >
      {user ? 'Dashboard' : 'Login'}
    </Button>
  )
}
