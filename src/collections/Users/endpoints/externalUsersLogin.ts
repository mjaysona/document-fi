import type { Collection, Endpoint } from 'payload'
import { headersWithCors } from 'payload'
import { APIError, generatePayloadCookie } from 'payload'
import { ErrorMessage } from '../enums'

// A custom endpoint that can be reached by POST request
// at: /api/users/account/login
export const externalUsersLogin: Endpoint = {
  handler: async (req) => {
    let data: { [key: string]: string } = {}

    try {
      if (typeof req.json === 'function') {
        data = await req.json()
      }
    } catch (error) {}

    const { email, password } = data

    if (!email || !password) {
      throw new APIError(ErrorMessage.MISSING_EMAIL_OR_PASSWORD, 401, null, false)
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

    if (foundUser.totalDocs === 0) {
      throw new APIError(ErrorMessage.LOGIN_INCORRECT_EMAIL_OR_PASSWORD, 401)
    }

    if (foundUser.totalDocs > 0) {
      let loginAttempt

      try {
        loginAttempt = await req.payload.login({
          collection: 'users',
          data: {
            email: foundUser.docs[0].email,
            password,
          },
          req,
        })
      } catch (error) {
        if (error?.name === 'LockedAuth') {
          throw new APIError(ErrorMessage.LOGIN_ACCOUNT_LOCKED, 401)
        }

        throw new APIError(ErrorMessage.LOGIN_INCORRECT_EMAIL_OR_PASSWORD, 401)
      }

      if (loginAttempt?.token) {
        const collection: Collection = (req.payload.collections as { [key: string]: Collection })[
          'users'
        ]
        const cookie = generatePayloadCookie({
          collectionAuthConfig: collection.config.auth,
          cookiePrefix: req.payload.config.cookiePrefix,
          token: loginAttempt.token,
        })

        return Response.json(loginAttempt, {
          headers: headersWithCors({
            headers: new Headers({
              'Set-Cookie': cookie,
            }),
            req,
          }),
          status: 200,
        })
      } else {
        throw new APIError(ErrorMessage.LOGIN_TRY_AGAIN, 400, null, false)
      }
    }

    throw new APIError(ErrorMessage.GENERIC, 401)
  },
  method: 'post',
  path: '/account/login',
}
