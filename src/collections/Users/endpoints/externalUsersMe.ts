import type { Endpoint } from 'payload'
import { APIError } from 'payload'
import { ErrorMessage } from '../enums'

// A custom endpoint that can be reached by POST request
// at: /api/users/account/:id/me
export const externalUsersMe: Endpoint = {
  handler: async (req) => {
    const userId = req?.routeParams?.id

    if (!userId) {
      throw new APIError(ErrorMessage.UNAUTHORIZED, 404)
    }

    const userDoc = await req.payload.find({
      collection: 'users',
      where: {
        id: {
          equals: userId,
        },
      },
    })
    const user = userDoc?.docs?.[0]

    if (!user) {
      throw new APIError(ErrorMessage.USER_NOT_FOUND, 404)
    }

    return Response.json({
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isFresh: user.isFresh,
      name: user.name,
      userRoles: user.userRoles,
    })
  },
  method: 'get',
  path: '/account/:id/me',
}
