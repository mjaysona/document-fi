'use client'

import React, { useCallback, useState } from 'react'
import { Alert, Anchor, Button, FocusTrap, Text, TextInput, Title } from '@mantine/core'
import { isEmail, useForm } from '@mantine/form'
import { AtSign, CircleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ErrorMessage } from '~/src/collections/Users/enums'

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

    const rawResponse = await fetch('/api/users/account/forgot-password', {
      body: JSON.stringify({
        email: data.email,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'post',
    })
    const responseData = await rawResponse.json()

    if (rawResponse.ok) {
      setSuccess(true)
      setError('')
    } else if (responseData?.errors?.[0]?.message) {
      setSuccess(false)
      setError(responseData.errors[0].message)
    } else {
      setSuccess(false)
      setError(ErrorMessage.LOGIN_TRY_AGAIN)
    }

    setIsSubmittingRequest(false)
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
              <Anchor fw={500} mt="md" href={`/login`}>
                Back to login
              </Anchor>
            </div>
          </FocusTrap>
        </form>
      )}
      {success && (
        <>
          <Title order={5}>Your request to reset your password has been submitted.</Title>
          <Text mt="md">
            Check your email for a link that will allow you to securely reset your password.
          </Text>
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
