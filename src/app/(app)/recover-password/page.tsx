import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { RenderParams } from '../components/RenderParams'
import classes from './index.module.scss'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { RecoverPasswordForm } from './RecoverPasswordForm'

export default async function Login() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const title = 'Reset password'

  if (user) redirect('/app')

  return (
    <AuthPageWrapper title={title}>
      <RecoverPasswordForm />
    </AuthPageWrapper>
  )
}
