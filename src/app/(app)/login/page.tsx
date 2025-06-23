import React from 'react'
import { LoginForm } from './LoginForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'

export default async function Page() {
  const title = 'Log in'
  const description = 'Enter your email and password to log in.'

  return (
    <AuthPageWrapper title={title} description={description}>
      <LoginForm />
    </AuthPageWrapper>
  )
}
