import type { Collection, Endpoint } from 'payload'

import { headersWithCors } from '@payloadcms/next/utilities'
import { APIError, generatePayloadCookie } from 'payload'

// A custom endpoint that can be reached by POST request
// at: /api/users/external-users/create-account
export const externalUsersAccountCreation: Endpoint = {
  handler: async (req) => {
    let data: { [key: string]: string } = {}

    try {
      if (typeof req.json === 'function') {
        data = await req.json()
      }
    } catch (error) {}

    const { email, password, domain } = data

    if (!email || !password) {
      throw new APIError('Email and password are required for account creation.', 400, null, true)
    }

    const fullTenant = (
      await req.payload.find({
        collection: 'tenants',
        where: {
          domain: {
            equals: domain,
          },
        },
      })
    ).docs[0]

    // Check if user already exists with this email for this tenant
    const existingUser = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          {
            email: {
              equals: email,
            },
          },
          ...(fullTenant
            ? [
                {
                  'tenants.tenant': {
                    equals: fullTenant.id,
                  },
                },
              ]
            : []),
        ],
      },
    })

    if (existingUser.totalDocs > 0) {
      throw new APIError('A user with this email already exists.', 400, null, true)
    }

    try {
      // Create the new user
      const newUser = await req.payload.create({
        collection: 'users',
        data: {
          email,
          password,
          tenants: fullTenant ? [{ tenant: fullTenant.id }] : [],
        },
      })

      // Log in the user after creation
      const loginAttempt = await req.payload.login({
        collection: 'users',
        data: {
          email,
          password,
        },
        req,
      })

      if (loginAttempt?.token) {
        const collection: Collection = (req.payload.collections as { [key: string]: Collection })[
          'users'
        ]
        const cookie = generatePayloadCookie({
          collectionAuthConfig: collection.config.auth,
          cookiePrefix: req.payload.config.cookiePrefix,
          token: loginAttempt.token,
        })

        return Response.json(
          {
            ...loginAttempt,
            user: newUser,
          },
          {
            headers: headersWithCors({
              headers: new Headers({
                'Set-Cookie': cookie,
              }),
              req,
            }),
            status: 201,
          },
        )
      }

      // Return the user without login if token generation failed
      return Response.json(
        {
          user: newUser,
        },
        {
          headers: headersWithCors({
            headers: new Headers(),
            req,
          }),
          status: 201,
        },
      )
    } catch (e) {
      throw new APIError('Unable to create account.', 400, null, true)
    }
  },
  method: 'post',
  path: '/external-users/create-account',
}
