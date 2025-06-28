import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({
  basePath: '/auth/provider',
})

export const {
  resetPassword,
  requestPasswordReset,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  getSession,
  useSession,
} = authClient
