import type { Endpoint } from 'payload'
import { headersWithCors } from 'payload'
import { APIError } from 'payload'

// A custom endpoint that can be reached by POST request
// at: /api/users/account/update
export const externalUsersUpdateAccount: Endpoint = {
  handler: async (req) => {
    let data: { [key: string]: string } = {}
    const userId = req?.routeParams?.id

    console.log('Updating user account with ID:', userId)

    if (!userId) {
      throw new APIError('User ID is required to update account.', 400, null, true)
    }

    try {
      if (typeof req.json === 'function') {
        data = await req.json()
      }
    } catch (error) {
      console.log('Error parsing JSON data:', error)
    }

    const { firstName, lastName } = data

    try {
      // Find the user by email
      await req.payload.update({
        collection: 'users',
        where: {
          id: {
            equals: userId,
          },
        },
        data: {
          personalDetails: {
            firstName,
            lastName,
          },
        },
      })

      const updatedUser = await req.payload.find({
        collection: 'users',
        where: {
          id: {
            equals: userId,
          },
        },
      })

      return Response.json(
        {
          updatedUser,
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
      throw new APIError('Unable to update account.', 400, null, true)
    }
  },
  method: 'patch',
  path: '/account/:id/update',
}
