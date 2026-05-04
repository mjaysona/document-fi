import { betterAuth } from 'better-auth'
import { openAPI } from 'better-auth/plugins'
import { MongoClient } from 'mongodb'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { Resend } from 'resend'
import ResetPasswordEmail from '@/app/(app)/email-templates/ResetPasswordEmail'
import VerifyEmail from '../email-templates/VerifyEmail'
import { nextCookies } from 'better-auth/next-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const client = new MongoClient(process.env.MONGODB_URI as string)
const db = client.db()

export const auth = betterAuth({
  account: {
    modelName: 'accounts',
  },
  basePath: '/auth/provider',
  trustedOrigins: [
    process.env.NEXT_PUBLIC_SERVER_URL as string,
    `${process.env.NEXT_PUBLIC_SERVER_URL}:3000`,
    'http://localhost:3000',
  ],
  database: mongodbAdapter(db),
  emailAndPassword: {
    autoSignIn: false,
    enabled: true,
    minPasswordLength: 4,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
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
  emailVerification: {
    autoSignInAfterVerification: true,
    callbackURL: '/app?verified=true',
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: 'Verify your email address',
        react: VerifyEmail({ email: user.email, verificationUrl: url }),
      })
    },
  },
  plugins: [openAPI(), nextCookies()],
  session: {
    modelName: 'sessions',
    expiresIn: 604800, // 7 days,
    updateAge: 86400, // 1 day
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
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
      isFresh: {
        type: 'boolean',
        defaultValue: true,
      },
    },
  },
})
