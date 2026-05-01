'use client'

import type { PayloadAdminBarProps } from '@payloadcms/admin-bar'
import type { PayloadMeUser } from '@payloadcms/admin-bar'

import { useRouter } from 'next/navigation'
import { PayloadAdminBar } from '@payloadcms/admin-bar'
import React, { useState } from 'react'

import classes from './index.module.scss'
import { Gutter } from '@payloadcms/ui'
import { getClientSideURL } from '@/utilities/getURL'

const collectionLabels = {
  pages: {
    plural: 'Pages',
    singular: 'Page',
  },
}

const Title: React.FC = () => <span>Dashboard</span>

export const AdminBar: React.FC<{
  adminBarProps?: PayloadAdminBarProps
}> = (props) => {
  const { adminBarProps } = props || {}
  const [show, setShow] = useState(false)
  const collection = 'pages'
  const router = useRouter()

  const onAuthChange = React.useCallback((user: PayloadMeUser) => setShow(Boolean(user?.id)), [])

  return (
    <div className={[classes.adminBar, show && classes.show].filter(Boolean).join(' ')}>
      <Gutter className={classes.container}>
        <PayloadAdminBar
          {...adminBarProps}
          cmsURL={getClientSideURL()}
          collectionSlug={collection}
          collectionLabels={{
            plural: collectionLabels[collection]?.plural || 'Pages',
            singular: collectionLabels[collection]?.singular || 'Page',
          }}
          logo={<Title />}
          onAuthChange={onAuthChange}
          onPreviewExit={() => {
            fetch('/next/exit-preview').then(() => {
              router.refresh()
            })
          }}
          style={{
            backgroundColor: 'transparent',
            padding: 0,
            position: 'relative',
            zIndex: 'unset',
          }}
        />
      </Gutter>
    </div>
  )
}
