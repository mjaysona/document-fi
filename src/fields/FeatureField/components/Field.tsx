import type { Payload, TextFieldClientProps } from 'payload'

import { cookies as getCookies, headers as getHeaders } from 'next/headers'
import React from 'react'

import { TenantFieldComponentClient } from './Field.client'

type Props = {
  payload: Payload
} & TextFieldClientProps

export const TenantFieldComponent: React.FC<Props> = async (props) => {
  const cookies = await getCookies()
  const headers = await getHeaders()
  const { user } = await props.payload.auth({ headers })
  const { path, readOnly } = props
  const payloadTenant = cookies.get('payload-tenant')?.value || undefined

  if (
    user &&
    ((Array.isArray(user.tenants) && user.tenants.length > 1) ||
      user?.roles?.includes('super-admin'))
  ) {
    return (
      <TenantFieldComponentClient initialValue={payloadTenant} path={path} readOnly={readOnly} />
    )
  }

  return null
}
