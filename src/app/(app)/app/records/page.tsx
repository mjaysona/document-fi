'use client'

import { Card, Group, SimpleGrid, Text, UnstyledButton } from '@mantine/core'
import { Fragment } from 'react'
import { useRouter } from 'next/navigation'
import classes from './page.module.scss'
import { FileText, ReceiptText, Weight } from 'lucide-react'

export default function Page() {
  const router = useRouter()

  return (
    <Fragment>
      <Card withBorder radius="md" className={classes.card}>
        <Group justify="space-between">
          <Text className={classes.title}>Select record</Text>
          {/* <Anchor c="inherit" size="xs">
            + 21 other services
          </Anchor> */}
        </Group>
        <SimpleGrid cols={8} mt="md">
          <UnstyledButton
            className={classes.item}
            onClick={() => router.push('/app/records/weight-bills')}
          >
            <Weight size={32} />
            <Text size="xs" mt={7}>
              Weight Bill
            </Text>
          </UnstyledButton>
          <UnstyledButton
            className={classes.item}
            onClick={() => router.push('/app/records/quotations')}
          >
            <FileText size={32} />
            <Text size="xs" mt={7}>
              Quotation
            </Text>
          </UnstyledButton>
          <UnstyledButton
            className={classes.item}
            onClick={() => router.push('/app/records/transactions')}
          >
            <ReceiptText size={32} />
            <Text size="xs" mt={7}>
              Transaction
            </Text>
          </UnstyledButton>
        </SimpleGrid>
      </Card>
    </Fragment>
  )
}
