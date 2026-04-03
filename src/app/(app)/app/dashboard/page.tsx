'use client'

import { Badge, Button } from '@mantine/core'
import { Fragment } from 'react'

import { Card, Group, Text } from '@mantine/core'
import classes from './page.module.scss'

const mockdata = {
  image:
    'https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80',
  title: 'Weight Bill',
  country: 'Croatia',
  description:
    'Completely renovated for the season 2020, Arena Verudela Bech Apartments are fully equipped and modernly furnished 4-star self-service apartments located on the Adriatic coastline by one of the most beautiful beaches in Pula.',
  badges: [
    { label: 'ID' },
    { label: 'Date' },
    { label: 'Vehicle' },
    { label: 'Operator' },
    { label: 'Amount' },
    { label: 'Payment Status' },
  ],
}

export default function Page() {
  const { title, badges } = mockdata
  const features = badges.map((badge) => (
    <Badge variant="light" key={badge.label}>
      {badge.label}
    </Badge>
  ))

  return (
    <Fragment>
      <Card withBorder radius="md" p="md" className={classes.card}>
        <Card.Section className={classes.section} pt="md">
          <Group justify="apart">
            <Text fz="lg" fw={500}>
              {title}
            </Text>
          </Group>
          <Text mt="md" className={classes.label} c="dimmed">
            Fields
          </Text>
          <Group gap={7} mt={5}>
            {features}
          </Group>
        </Card.Section>

        <Group mt="md">
          <Button radius="md" style={{ flex: 1 }}>
            Upload {title}
          </Button>
        </Group>
      </Card>
    </Fragment>
  )
}
