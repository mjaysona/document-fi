'use client'

import React, { useCallback, useState } from 'react'
import { Alert, Anchor, Button, FocusTrap, Text, TextInput, Title } from '@mantine/core'
import { isEmail, useForm } from '@mantine/form'
import { AtSign, CircleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BetterAuthStatusCode, ErrorMessage } from '~/src/collections/Users/enums'
import { sendVerificationEmail } from '../../lib/auth-client'

interface VerifyAccountFormProps {
  email?: string
}

type FormData = {
  email: string | undefined
}

export const VerifyAccountForm: React.FC<VerifyAccountFormProps> = ({ email }) => {
  const [error, setError] = useState<null | string>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email,
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
    },
  })

  const handleSubmit = useCallback(async (data: FormData) => {
    sendVerificationEmail(
      {
        email: data.email ?? '',
        callbackURL: '/app?verified=true',
      },
      {
        onRequest: () => {
          setIsSubmittingRequest(true)
          setError(null)
        },
        onSuccess: () => {
          setSuccess(true)
          setError(null)
          setIsSubmittingRequest(false)
        },
        onError: ({ error }) => {
          setSuccess(false)

          const errorMessage =
            BetterAuthStatusCode[error?.code as keyof typeof BetterAuthStatusCode] ||
            error?.code ||
            error?.message ||
            ErrorMessage.VERIFY_GENERIC

          setError(errorMessage)
          setIsSubmittingRequest(false)
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
                  style={{ wordBreak: 'break-word' }}
                >
                  {error}
                </Alert>
              )}
              <Text>Please enter your email address below to receive a verification link.</Text>
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
                Verify my email
              </Button>
              <Anchor fw={500} mt="md" href={'/login'}>
                Back to login
              </Anchor>
            </div>
          </FocusTrap>
        </form>
      )}
      {success && (
        <>
          <Title order={5}>Your verification email has been sent.</Title>
          <Text mt="md">Please check your email for a link to verify your account.</Text>
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
