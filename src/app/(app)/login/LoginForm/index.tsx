'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import { Alert, Anchor, Button, Divider, FocusTrap, PasswordInput, Text } from '@mantine/core'
import { isEmail, isNotEmpty, useForm } from '@mantine/form'
import { TextInput } from '@mantine/core'
import { AtSign, CircleAlert, CircleCheck, KeySquare } from 'lucide-react'
import { BetterAuthStatusCode, ErrorMessage } from '~/src/collections/Users/enums'
import { authClient, signIn } from '../../lib/auth-client'

type LoginFormProps = {
  defaultRole: string
}

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ defaultRole }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<null | string>(null)
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false)
  const [isAttemptingGoogleLogin, setIsAttemptingGoogleLogin] = useState(false)
  const [isEmailForVerification, setIsEmailForVerification] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const form = useForm({
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

  const { errors, getInputProps, key, onSubmit } = form

  useMemo(() => {
    if (searchParams) {
      const successParam = searchParams.get('success')
      if (successParam) {
        setSuccessMessage(decodeURIComponent(successParam))
      }
    }
  }, [searchParams])

  const handleCloseAlert = () => {
    router.replace('/login')
    setSuccessMessage(null)
  }

  const handleSubmit = async (formData: FormData) => {
    if (!formData?.email || !formData?.password) return

    await signIn.email(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        onRequest: () => {
          setIsAttemptingLogin(true)
        },
        onSuccess: async () => {
          setIsAttemptingLogin(false)
          router.push('/app')
        },
        onError: ({ error }) => {
          const errorMessage =
            BetterAuthStatusCode[error?.code as keyof typeof BetterAuthStatusCode] ||
            error?.code ||
            error?.message ||
            ErrorMessage.PASSWORD_RESET_GENERIC

          setError(errorMessage)
          setIsAttemptingLogin(false)
        },
      },
    )
  }

  const loginWithGoogle = () => {
    authClient.signIn.social(
      {
        provider: 'google',
        callbackURL: '/app',
      },
      {
        onRequest: () => {
          setIsAttemptingGoogleLogin(true)
        },
        onError: (ctx) => {
          setIsAttemptingGoogleLogin(false)

          if (ctx.error?.message) {
            setError(ctx.error.message)
          } else {
            setError(ErrorMessage.LOGIN_TRY_AGAIN)
          }

          router.push('/login')
        },
      },
    )
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
          onClose={handleCloseAlert}
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
          {error}{' '}
          {isEmailForVerification && (
            <Text size="sm" component="span">
              If you have not received an email, please check your spam folder or{' '}
              <Anchor href={`/verify-account?email=${form.values.email}`}>verify it again</Anchor>.
            </Text>
          )}
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
