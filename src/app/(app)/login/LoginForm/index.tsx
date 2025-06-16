'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Anchor, Button, Container, Divider, FocusTrap, PasswordInput } from '@mantine/core'
import { useAuth } from '../../providers/Auth'
import { isEmail, isNotEmpty, useForm } from '@mantine/form'
import { TextInput } from '@mantine/core'
import { AtSign, CircleAlert, CircleCheck, KeySquare } from 'lucide-react'
import { ErrorMessage } from '~/src/collections/Users/enums'

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: 'super@payloadcms.com',
      password: 'test',
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
    async (data: FormData) => {
      if (!data?.email || !data?.password) return

      setIsAttemptingLogin(true)

      const rawResponse = await fetch('/api/users/account/login', {
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'post',
      })
      const responseData = await rawResponse.json()

      if (rawResponse?.status === 200 && responseData?.user) {
        setTimeout(() => {
          router.push('/app')
        }, 1000)
      } else if (responseData?.errors?.[0]?.message) {
        const { errors } = responseData
        setError(errors[0]?.message)
        setIsAttemptingLogin(false)
      } else {
        setError(ErrorMessage.LOGIN_TRY_AGAIN)
        setIsAttemptingLogin(false)
      }
    },
    [login, router],
  )

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
