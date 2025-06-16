import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'
import config from '~/payload.config'
import { RenderParams } from '../components/RenderParams'
import { CreateAccountForm } from './CreateAccountForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'

export default async function CreateAccount() {
  const headers = await getHeaders()
  const host = headers.get('host')
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const title = 'Create a new account'

  if (user) {
    redirect(
      `/account?message=${encodeURIComponent(
        'Cannot create a new account while logged in, please log out and try again.',
      )}`,
    )
  }

  return (
    <AuthPageWrapper title={title}>
      <CreateAccountForm domain={host?.split(':')[0]} />
    </AuthPageWrapper>
  )
}
