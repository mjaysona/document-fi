import { Card, Group, SimpleGrid, Text, UnstyledButton } from '@mantine/core'
import { Fragment } from 'react'
import classes from './page.module.scss'
import { Weight } from 'lucide-react'

export default async function Page() {
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
          <UnstyledButton className={classes.item}>
            <Weight size={32} />
            <Text size="xs" mt={7}>
              Weight Bill
            </Text>
          </UnstyledButton>
        </SimpleGrid>
      </Card>
    </Fragment>
  )
}
