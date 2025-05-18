'use client'

import { useConfig } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

const baseClass = 'after-nav-links nav-group'

const AfterNavLinksClient: React.FC = () => {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  return (
    <div
      className={baseClass}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(var(--base) / 4)',
      }}
    >
      <div className="nav-group_content Custom Routes">
        <Link className="nav__link" href={`${adminRoute}/custom-default-view`}>
          Custom Default View
        </Link>
        <Link className="nav__link" href={`${adminRoute}/dashboard`}>
          Custom Dashboard View
        </Link>
        <Link className="nav__link" href={`${adminRoute}/custom-standalone`}>
          Custom Standalone View
        </Link>
        <Link className="nav__link" href={`${adminRoute}/custom-minimal`}>
          Custom Minimal View
        </Link>
      </div>
    </div>
  )
}

export default AfterNavLinksClient
