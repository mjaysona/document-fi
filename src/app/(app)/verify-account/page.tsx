import React from 'react'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { VerifyAccountForm } from './VerifyAccountForm'

interface SearchParams {
  email?: string
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const title = 'Verify Account'
  const { email } = await searchParams

  return (
    <AuthPageWrapper title={title}>
      <VerifyAccountForm email={email} />
    </AuthPageWrapper>
  )
}
