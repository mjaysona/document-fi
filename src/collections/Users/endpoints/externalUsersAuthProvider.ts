import type { Endpoint } from 'payload'
import { headersWithCors } from 'payload'
import { APIError } from 'payload'
import { ErrorMessage } from '../enums'
import type { User } from '@payload-types'

// A custom endpoint that can be reached by POST request
// at: /api/account/auth/provider
export const externalUsersAuthProvider: Endpoint = {
  handler: async (req) => {
    let data: { [key: string]: string } = {}

    try {
      if (typeof req.json === 'function') {
        data = (await req.json()) as { email: string; id: string }
      }
    } catch (error) {}

    const { createdAt, email, id } = data

    if (!email || !id) {
      throw new APIError(ErrorMessage.LOGIN_FAILED_GOOGLE, 400)
    }

    // Check if user already exists with this email
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

    console.log('User found:', existingUser)

    if (existingUser.totalDocs > 0) {
      // Check if user has already logged in with this provider
      const user = existingUser.docs[0] as User

      if (user.providers?.google?.id === id) {
        return Response.json(
          {
            user,
          },
          {
            headers: headersWithCors({
              headers: new Headers(),
              req,
            }),
            status: 201,
          },
        )
      } else {
        console.log('User exists but has not logged in with this provider, updating user:', user)

        // User exists but has not logged in with this provider, update the user
        await req.payload.update({
          id: user.id,
          collection: 'users',
          data: {
            providers: {
              google: {
                id,
                email,
                linkedAt: createdAt,
              },
            },
          },
        })

        console.log('User updated with new provider information:', user)

        return Response.json(
          {
            user,
          },
          {
            headers: headersWithCors({
              headers: new Headers(),
              req,
            }),
            status: 201,
          },
        )
      }
    } else {
      const newUser = await req.payload.create({
        collection: 'users',
        data: {
          email,
          providers: {
            google: {
              email,
              id,
              linkedAt: createdAt,
            },
          },
        },
      })

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
    }
  },
  method: 'post',
  path: '/account/auth/provider',
}
