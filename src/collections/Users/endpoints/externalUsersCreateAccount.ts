import type { Endpoint } from 'payload'
import { headersWithCors } from 'payload'
import { APIError } from 'payload'
import { ErrorMessage } from '../enums'

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

    const { email, password, passwordConfirm } = data

    if (!email || !password || !passwordConfirm) {
      if (password !== passwordConfirm) {
        throw new APIError(ErrorMessage.MISMATCHING_PASSWORDS, 400)
      }

      throw new APIError(ErrorMessage.MISSING_EMAIL_OR_PASSWORD, 400)
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
      throw new APIError(ErrorMessage.CREATE_ACCOUNT_EMAIL_ALREADY_EXISTS, 400)
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

      // Return the user without login
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
      throw new APIError(ErrorMessage.GENERIC, 400)
    }
  },
  method: 'post',
  path: '/account/create',
}
