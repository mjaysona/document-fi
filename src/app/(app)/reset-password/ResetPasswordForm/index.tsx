'use client'

import React, { useCallback, useState } from 'react'
import { Alert, Anchor, Button, FocusTrap, PasswordInput, Text } from '@mantine/core'
import { isNotEmpty, matchesField, useForm } from '@mantine/form'
import { CircleAlert, KeySquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ErrorMessage } from '~/src/collections/Users/enums'
import { resetPassword } from '@/app/(app)/lib/auth-client'

interface ResetPasswordFormProps {
  token: string
  email: string
}

type FormData = {
  password: string
  passwordConfirm: string
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, email }) => {
  const [error, setError] = useState<null | string>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      password: '',
      passwordConfirm: '',
    },
    validate: {
      password: isNotEmpty('Password field cannot not be empty.'),
      passwordConfirm: matchesField('password', 'Passwords do not match.'),
    },
  })

  const handleSubmit = useCallback(async (data: FormData) => {
    setIsSubmittingRequest(true)

    resetPassword(
      {
        newPassword: data.password,
        token: token || '',
      },
      {
        onSuccess: (ctx) => {
          setSuccess(true)
          setIsSubmittingRequest(false)
          setError('')
          router.push(
            `/login?success=${encodeURIComponent(`Your password has been reset. You can now log in with your new password.`)}`,
          )
        },
        onError: (ctx) => {
          setSuccess(false)
          setIsSubmittingRequest(false)

          const errorMessage =
            ctx.error?.message && ctx.error?.code === 'INVALID_TOKEN'
              ? ErrorMessage.INVALID_TOKEN_GENERIC
              : ErrorMessage.PASSWORD_RESET_GENERIC

          setError(errorMessage)
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
                  {error} Please{' '}
                  <Anchor fz="sm" fw={500} mt="md" href={'/recover-password'}>
                    request a new password reset link
                  </Anchor>
                  .
                </Alert>
              )}
              <Text>
                Please enter your{' '}
                <Text component="span" fw={700}>
                  new password
                </Text>{' '}
                for your account{' '}
                <Text component="span" fw={700} td={'underline'}>
                  {email}
                </Text>
                .
              </Text>
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
              <PasswordInput
                mt="md"
                size="md"
                label="Confirm Password"
                leftSection={<KeySquare size={12} />}
                name="passwordConfirm"
                error={errors.passwordConfirm}
                key={key('passwordConfirm')}
                {...getInputProps('passwordConfirm')}
              />
              <Button
                mt="lg"
                mb="sm"
                size="md"
                type="submit"
                fullWidth
                loading={isSubmittingRequest}
              >
                Reset my password
              </Button>
              <Button variant="outline" size="md" fullWidth onClick={() => router.push('/login')}>
                Cancel
              </Button>
            </div>
          </FocusTrap>
        </form>
      )}
    </>
  )
}
