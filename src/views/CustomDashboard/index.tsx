import React from 'react'

import './index.scss'
import DashboardClient from './index.client'
import { AdminViewProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

export const CustomDashboardView: React.FC<AdminViewProps> = async ({
  initPageResult,
  params,
  searchParams,
}) => {
  const { req } = initPageResult
  const { user, payload } = req
  const { totalDocs } = await payload.count({ collection: 'users' })
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
        <DashboardClient user={user} />
        <div className="collection-list">
          <div className="dashboard">
            <div className="dashboard__wrap">
              <h1 className="dashboard__label">Dashboard</h1>
              <ul className="dashboard__card-list">
                <li>
                  <div className="card">
                    <h3 className="card__title">User count</h3>
                    <h3 className="card__value">{totalDocs}</h3>
                  </div>
                </li>
                <li>
                  <div className="card">
                    <h3 className="card__title">Sales</h3>
                    <h3 className="card__value">PHP 84,813.00</h3>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
