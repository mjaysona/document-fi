import React from 'react'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { ResetPasswordForm } from './ResetPasswordForm'
import { redirect } from 'next/navigation'

interface PageParams {
  token: string
  email: string
}

export default async function Page({ params }: { params: PageParams }) {
  const title = 'Reset password'
  const { token, email } = params

  if (!token || !email) {
    redirect('/recover-password')
  }

  return (
    <AuthPageWrapper title={title}>
      <ResetPasswordForm token={token} email={email} />
    </AuthPageWrapper>
  )
}
