'use client'

import { useAuth } from '@/app/providers/Auth'
import { Text, Title } from '@mantine/core'
import { useState } from 'react'

const PageClient: React.FC = () => {
  const { user } = useAuth()
  const [isNewUser, setIsNewUser] = useState(true)

  return (
    <>
      <Title order={1} mb="md">
        {isNewUser ? 'Welcome' : 'Hello'}, {user?.name || user?.email} 👋
      </Title>
      <Text>Let's get you started!</Text>
    </>
  )
}

export default PageClient
