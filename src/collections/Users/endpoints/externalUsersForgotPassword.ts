import type { Endpoint } from 'payload'
import { APIError } from 'payload'
import { ErrorMessage } from '../enums'

// A custom endpoint that can be reached by POST request
// at: /api/users/account/forgot-password
export const externalUsersForgotPassword: Endpoint = {
  handler: async (req) => {
    let data: { [key: string]: string } = {}

    try {
      if (typeof req.json === 'function') {
        data = await req.json()
      }
    } catch (error) {}

    const { email } = data

    if (!email) {
      throw new APIError(ErrorMessage.MISSING_EMAIL, 400)
    }

    const foundUser = await req.payload.find({
      collection: 'users',
      where: {
        or: [
          {
            and: [
              {
                email: {
                  equals: email,
                },
              },
            ],
          },
        ],
      },
    })

    if (foundUser?.totalDocs > 0) {
      return Response.json(foundUser.docs[0].email)
    }

    throw new APIError(ErrorMessage.FORGOT_PASSWORD_EMAIL_NOT_FOUND, 404)
  },
  method: 'post',
  path: '/account/forgot-password',
}
