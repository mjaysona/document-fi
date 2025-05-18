'use client'

import React, { Fragment } from 'react'

import { SetStepNav, useConfig } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { InitPageResult } from 'payload'
import { hasSuperAdminRole } from '@/utilities/getRole'

type Props = {
  user: InitPageResult['req']['user']
}

const DashboardClient = ({ user }: Props) => {
  console.log('dashboard client')

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
      <SetStepNav nav={[{ label: 'Dashboard' }]} />
    </Fragment>
  )
}

export default DashboardClient
