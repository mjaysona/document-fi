import type { Collection, Endpoint } from 'payload'
import { headersWithCors } from 'payload'
import { APIError, generatePayloadCookie } from 'payload'

// A custom endpoint that can be reached by POST request
// at: /api/account/create
export const externalUsersCreateAccount: Endpoint = {
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
      throw new APIError('There was a problem creating your account.', 400, null, true)
    }
  },
  method: 'post',
  path: '/account/create',
}
