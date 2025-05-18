import React from 'react'

import './index.scss'
import CustomDefaultViewClient from './index.client'
import { AdminViewProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

export const CustomDefaultView: React.FC<AdminViewProps> = ({
  initPageResult,
  params,
  searchParams,
}) => {
  const { req } = initPageResult
  const { user } = req
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <CustomDefaultViewClient user={user} />
      </Gutter>
    </DefaultTemplate>
  )
}
