import React from 'react'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { RecoverPasswordForm } from './RecoverPasswordForm'

export default async function Page() {
  const title = 'Recover password'

  return (
    <AuthPageWrapper title={title}>
      <RecoverPasswordForm />
    </AuthPageWrapper>
  )
}
