import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import React, { Fragment } from 'react'

import config from '~/payload.config'
import { HydrateClientUser } from '@/app/(app)/components/HydrateClientUser'
import { Gutter } from './components/Gutter'

export default async function HomePage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { permissions, user } = await payload.auth({ headers })

  return (
    <Fragment>
      <HydrateClientUser permissions={permissions} user={user} />
      <Gutter>
        <h1>Homepage Example - Auth</h1>
        <p>This is a homepage example that uses payload auth</p>
        <h3>Files and folders relevant to this functionalities are:</h3>
        <ul>
          <li>
            <code>src/app/(app)/providers/Auth</code> - Contains the auth provider and related
            functions
          </li>
          <li>
            <code>src/app/(app)/components/HydrateClientUser</code> - Hydrates the user and
            permissions on the client side
          </li>
          <li>
            <code>src/app/(app)/page.tsx</code> - The main page that uses the auth provider
          </li>
          <li>
            <code>src/app/(app)/layout.tsx</code> - The layout that wraps the auth provider around
            the main content
          </li>
          <li>
            <code>src/app/(app)/login</code> - The login page that uses the auth provider to log in
            users
          </li>
          <li>
            <code>src/app/(app)/logout</code> - The logout page that uses the auth provider to log
            out users
          </li>
          <li>
            <code>src/app/(app)/create-account</code> - The create account page that uses the auth
            provider to create new users
          </li>
          <li>
            <code>src/app/(app)/reset-password</code> - The reset password page that uses the auth
            provider to reset user passwords
          </li>
          <li>
            <code>src/app/(app)/recover-password</code> - The forgot password page that uses the
            auth provider to send password reset emails
          </li>
        </ul>
      </Gutter>
    </Fragment>
  )
}
