import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'
import config from '~/payload.config'
import { CreateAccountForm } from './CreateAccountForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { ROLES } from '~/src/collections/UserRoles/roles.enum'

export default async function CreateAccount() {
  const payload = await getPayload({ config })
  const title = 'Create a new account'
  const userRole = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: ROLES.USER,
      },
    },
  })

  return (
    <AuthPageWrapper title={title}>
      <CreateAccountForm defaultRole={userRole?.docs[0].id} />
    </AuthPageWrapper>
  )
}
