'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Anchor, Button, Container, Divider, FocusTrap, PasswordInput } from '@mantine/core'
import { useAuth } from '../../providers/Auth'
import { isEmail, isNotEmpty, useForm } from '@mantine/form'
import { TextInput } from '@mantine/core'
import { AtSign, CircleAlert, CircleCheck, KeySquare } from 'lucide-react'
import { ErrorMessage } from '~/src/collections/Users/enums'
import { authClient, signIn } from '../../lib/auth-client'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC = () => {
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<null | string>(null)
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false)
  const [isAttemptingGoogleLogin, setIsAttemptingGoogleLogin] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
      password: isNotEmpty('Please enter a password.'),
    },
  })

  useEffect(() => {
    const successMessage = searchParams.get('success')

    if (successMessage) {
      setSuccessMessage(decodeURIComponent(successMessage))
      // Clear the success message from the URL
      router.replace('/login')
    }
  }, [searchParams])

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      if (!formData?.email || !formData?.password) return

      await signIn.email(
        {
          email: formData.email,
          password: formData.password,
        },
        {
          onRequest: (ctx) => {
            setIsAttemptingLogin(true)
          },
          onSuccess: async (ctx) => {
            setIsAttemptingLogin(false)

            router.push('/app')
          },
          onError: (ctx) => {
            setIsAttemptingLogin(false)

            if (ctx.error?.message) {
              setError(ctx.error.message)
            } else {
              setError(ErrorMessage.LOGIN_TRY_AGAIN)
            }
          },
        },
      )
    },
    [login, router],
  )

  const loginWithGoogle = () => {
    setIsAttemptingGoogleLogin(true)

    authClient.signIn.social({
      provider: 'google',
      callbackURL: '/app',
    })
  }

  return (
    <form onSubmit={onSubmit(handleSubmit)}>
      {successMessage && !error && (
        <Alert
          variant="light"
          color="green"
          withCloseButton
          icon={<CircleCheck />}
          mb="md"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}
      {error && error.length > 0 && (
        <Alert
          variant="light"
          color="red"
          withCloseButton
          icon={<CircleAlert />}
          mb="md"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      <FocusTrap>
        <div>
          <Button
            leftSection={<img src="/google-logo-01.svg" alt="Google Logo" width={20} height={20} />}
            variant="default"
            size="md"
            fullWidth
            loading={isAttemptingGoogleLogin}
            mb="md"
            type="button"
            onClick={loginWithGoogle}
          >
            Continue with Google
          </Button>
          <Divider my="md" label="or" />
          <TextInput
            data-autofocus
            label="Email"
            leftSection={<AtSign size={12} />}
            name="email"
            size="md"
            error={errors.email}
            key={key('email')}
            {...getInputProps('email')}
          />
          <PasswordInput
            mt="md"
            size="md"
            label="Password"
            leftSection={<KeySquare size={12} />}
            name="password"
            error={errors.password}
            key={key('password')}
            {...getInputProps('password')}
          />
          <Button mt="lg" mb="lg" size="md" type="submit" fullWidth loading={isAttemptingLogin}>
            Log in
          </Button>
          <Anchor fw={500} href={'/recover-password'}>
            Forgot password?
          </Anchor>
          <Divider my="md" />
          Don't have an account?{' '}
          <Anchor fw={500} href={'/create-account'}>
            Sign up
          </Anchor>
        </div>
      </FocusTrap>
    </form>
  )
}
