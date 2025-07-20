import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Gutter } from '../Gutter'
import { AuthActions } from './AuthActions'
import classes from './index.module.scss'

export const Header = () => {
  return (
    <header className={classes.header}>
      <Gutter className={classes.wrap}>
        <Link className={classes.logo} href="/">
          <picture>
            <source
              media="(prefers-color-scheme: dark)"
              srcSet="/logo-placeholder-01-light--static.svg"
            />
            <Image
              alt="Payload Logo"
              height={30}
              src="/logo-placeholder-01-dark--static.svg"
              width={150}
              priority
            />
          </picture>
        </Link>
        <AuthActions />
      </Gutter>
    </header>
  )
}
