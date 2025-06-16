'use client'

import React from 'react'
import classes from './index.module.css'
import { Anchor, Grid, GridCol, Paper, Text, Title, useMantineColorScheme } from '@mantine/core'
import Image from 'next/image'

type Props = {
  children: React.ReactNode
  title?: string
  description?: string
}

export const AuthPageWrapper: React.FC<Props> = (props) => {
  const { children, title, description } = props
  const { colorScheme } = useMantineColorScheme()
  const logoUrl =
    colorScheme === 'dark'
      ? '/logo-placeholder-01-light--static.svg'
      : '/logo-placeholder-01-dark--static.svg'

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.wrapper__container} shadow="xs" p="xl">
        <Grid>
          <GridCol span={{ base: 12, md: 7, sm: 6 }}>
            <Anchor href="/">
              <Image alt="Payload Logo" height={30} src={logoUrl} width={150} />
            </Anchor>
            {title && (
              <Title mt="md" order={1}>
                {title}
              </Title>
            )}
            {description && <Text mt="md">{description}</Text>}
          </GridCol>
          <GridCol span={{ base: 12, md: 5, sm: 6 }}>{children}</GridCol>
        </Grid>
      </Paper>
    </div>
  )
}
