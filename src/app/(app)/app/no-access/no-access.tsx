'use client'

import { Button, Flex, Text, Title } from '@mantine/core'
import { useRouter } from 'next/navigation'

export default function NoAccess() {
  const router = useRouter()

  return (
    <Flex direction="column" gap={20}>
      <Title order={1}>Unauthorized access</Title>
      <Text>
        Looks like you are trying to access a page you do not have permission to view. Please
        contact your administrator.
      </Text>
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
