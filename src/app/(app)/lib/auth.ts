import { betterAuth } from 'better-auth'
import { MongoClient } from 'mongodb'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { Resend } from 'resend'
import ResetPasswordEmail from '@/app/(app)/email-templates/ResetPasswordEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const client = new MongoClient(process.env.MONGODB_URI as string)
const db = client.db()

export const auth = betterAuth({
  basePath: '/auth/provider',
  database: mongodbAdapter(db),
  emailAndPassword: {
    autoSignIn: false,
    enabled: true,
    minPasswordLength: 4,
    sendResetPassword: async ({ user, token }, request) => {
      const url =
        process.env.NEXT_PUBLIC_SERVER_URL + `/reset-password?token=${token}&email=${user.email}`

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Reset your password',
        react: ResetPasswordEmail({ email: user.email, resetUrl: url }),
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'isEmailVerified',
    },
    additionalFields: {
      isSystemAccount: {
        type: 'boolean',
        defaultValue: false,
      },
    },
  },
})
