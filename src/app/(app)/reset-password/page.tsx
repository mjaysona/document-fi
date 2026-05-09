import React from 'react'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { ResetPasswordForm } from './ResetPasswordForm'
import { redirect } from 'next/navigation'

interface SearchParams {
  token: string
  email: string
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const title = 'Reset password'
  const { token, email } = searchParams

  if (!token || !email) {
    redirect('/recover-password')
  }

  return (
    <AuthPageWrapper title={title}>
      <ResetPasswordForm token={token} email={email} />
    </AuthPageWrapper>
  )
}
