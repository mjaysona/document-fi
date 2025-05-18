'use client'

import React, { Fragment } from 'react'

import './index.scss'
import { Button, SetStepNav, useConfig } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { InitPageResult } from 'payload'
import Link from 'next/link'
import { hasSuperAdminRole } from '@/utilities/getRole'

type Props = {
  user: InitPageResult['req']['user']
}

const CustomDefaultViewClient = ({ user }: Props) => {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  if (!user) {
    return redirect(`${adminRoute}/unauthorized`)
  }

  return (
    <Fragment>
      <SetStepNav nav={[{ label: 'Custom Default' }]} />
      <div className="collection-list">
        <div className="collection-list__wrap">
          <header className="list-header">
            <h1>Custom Default</h1>
            <div className="collection-list__sub-header">Subheader</div>
          </header>
          <p>
            Here is a custom default that was added in the Payload config. It uses the Default
            Template, so the sidebar is rendered.
          </p>
          <div>
            <Link href={`${adminRoute}`}>
              <Button>Go to Homepage</Button>
            </Link>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default CustomDefaultViewClient
