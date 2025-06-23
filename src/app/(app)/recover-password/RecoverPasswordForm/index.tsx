'use client'

import React, { useCallback, useState } from 'react'
import { Alert, Anchor, Button, FocusTrap, Text, TextInput, Title } from '@mantine/core'
import { isEmail, useForm } from '@mantine/form'
import { AtSign, CircleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ErrorMessage } from '~/src/collections/Users/enums'
import { requestPasswordReset } from '../../lib/auth-client'

type FormData = {
  email: string
}

export const RecoverPasswordForm: React.FC = () => {
  const [error, setError] = useState<null | string>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
    },
  })

  const handleSubmit = useCallback(async (data: FormData) => {
    setIsSubmittingRequest(true)

    requestPasswordReset(
      {
        email: data.email,
      },
      {
        onSuccess: (ctx) => {
          setSuccess(true)
          setError('')
        },
        onError: (ctx) => {
          setSuccess(false)

          if (ctx.error?.message) {
            setError(ctx.error.message)
          } else {
            setError(ErrorMessage.PASSWORD_RESET_GENERIC)
          }
        },
      },
    )
  }, [])

  return (
    <>
      {!success && (
        <form onSubmit={onSubmit(handleSubmit)}>
          <FocusTrap>
            <div>
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
              <Text>Please enter your email address below to receive a password reset link.</Text>
              <TextInput
                data-autofocus
                label="Email"
                leftSection={<AtSign size={12} />}
                mt="md"
                name="email"
                size="md"
                error={errors.email}
                key={key('email')}
                {...getInputProps('email')}
              />
              <Button
                mt="lg"
                mb="lg"
                size="md"
                type="submit"
                fullWidth
                loading={isSubmittingRequest}
              >
                Reset my password
              </Button>
              <Anchor fw={500} mt="md" href={'/login'}>
                I already have an account
              </Anchor>
            </div>
          </FocusTrap>
        </form>
      )}
      {success && (
        <>
          <Title order={5}>Your password reset request has been received.</Title>
          <Text mt="md">Please check your email for a link to securely reset your password.</Text>
          <Button
            variant="outline"
            mt="xl"
            size="md"
            fullWidth
            onClick={() => router.push('/login')}
          >
            Back to login
          </Button>
        </>
      )}
    </>
  )
}
