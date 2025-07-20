'use client'

import React from 'react'
import classes from './index.module.css'
import { Anchor, Paper, Text, Title, useMantineColorScheme } from '@mantine/core'
import Image from 'next/image'

type Props = {
  children: React.ReactNode
  title?: string
  description?: string
}

export const AuthPageWrapper: React.FC<Props> = (props) => {
  const { children, title, description } = props

  return (
    <div className={classes['auth-page-wrapper']}>
      <div>
        <Paper className={classes['auth-page-wrapper__content']} shadow="xs">
          <div>
            <Anchor href="/">
              <Image
                alt="Payload Logo"
                height={30}
                src="/logo-placeholder-01-light--static.svg"
                width={150}
                className="light"
                priority
              />
              <Image
                alt="Payload Logo"
                height={30}
                src="/logo-placeholder-01-dark--static.svg"
                width={150}
                className="dark"
                priority
              />
            </Anchor>
            {title && <Title order={1}>{title}</Title>}
            {description && <Text>{description}</Text>}
          </div>
          <div>{children}</div>
        </Paper>
        <Text className={classes['auth-page-wrapper__footer']}>
          Copyright © {new Date().getFullYear()} Your Company
        </Text>
      </div>
    </div>
  )
}
