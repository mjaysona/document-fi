'use client'

import { Button, Flex, Text, Title } from '@mantine/core'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <Flex direction="column" gap={20}>
      <Title order={1}>Looks like you got lost.</Title>
      <Text>The page you are looking for does not exist.</Text>
      <div>
        <Button
          onClick={() => {
            router.push('/app/dashboard')
          }}
          variant="outline"
        >
          Back to Dashboard
        </Button>
      </div>
    </Flex>
  )
}
