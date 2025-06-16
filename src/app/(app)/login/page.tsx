import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { RenderParams } from '../components/RenderParams'
import classes from './index.module.scss'
import { LoginForm } from './LoginForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'

export default async function Login() {
  const headers = await getHeaders()
  const host = headers.get('host')
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  const title = 'Log in'
  const description = 'Enter your email and password to log in.'

  if (user) redirect(`/app`)

  return (
    <AuthPageWrapper title={title} description={description}>
      <LoginForm domain={host?.split(':')[0]} />
    </AuthPageWrapper>
  )
}
