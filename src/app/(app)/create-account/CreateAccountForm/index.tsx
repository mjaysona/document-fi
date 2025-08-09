'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasLength, isEmail, matchesField, useForm } from '@mantine/form'
import {
  Alert,
  Anchor,
  Button,
  Divider,
  FocusTrap,
  PasswordInput,
  Text,
  TextInput,
} from '@mantine/core'
import { AtSign, CircleAlert, KeySquare } from 'lucide-react'
import { BetterAuthStatusCode, ErrorMessage } from '~/src/collections/Users/enums'
import { signUp } from '@/app/(app)/lib/auth-client'

type CreateAccountFormProps = {
  defaultRole: string
}

type FormData = {
  email: string
  password: string
  passwordConfirm: string
}

export const CreateAccountForm: React.FC<CreateAccountFormProps> = ({ defaultRole }) => {
  const router = useRouter()
  const [error, setError] = useState<null | string | string[]>(null)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const { errors, getInputProps, key, onSubmit } = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
      passwordConfirm: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
      password: hasLength({ min: 4 }, 'Password must be at least 4 characters long.'),
      passwordConfirm: matchesField('password', 'Passwords do not match.'),
    },
  })

  const handleSubmit = async (formData: FormData) => {
    await signUp.email(
      {
        email: formData.email,
        password: formData.password,
        name: '',
      },
      {
        onRequest: () => {
          setIsCreatingAccount(true)
        },
        onSuccess: async ({ data }) => {
          const response = await fetch(`/api/users/account/${data?.user?.id}/update`, {
            body: JSON.stringify({
              role: [defaultRole],
            }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          })

          if (!response?.ok) {
            console.error('Failed to update user role after account creation.')
          }

          router.push(
            '/login?success=' +
              encodeURIComponent(
                'You have created an account. Please check your email to verify it.',
              ),
          )
        },
        onError: ({ error }) => {
          const errorMessage =
            BetterAuthStatusCode[error?.code as keyof typeof BetterAuthStatusCode] ||
            error?.code ||
            error?.message ||
            ErrorMessage.CREATE_ACCOUNT_TRY_AGAIN

          setError(errorMessage)
          setIsCreatingAccount(false)
        },
      },
    )
  }

  return (
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
          <Button
            leftSection={<img src="/google-logo-01.svg" alt="Google Logo" width={20} height={20} />}
            variant="default"
            size="md"
            fullWidth
            mb="md"
            type="button"
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
          <Button mt="lg" mb="lg" size="md" type="submit" fullWidth loading={isCreatingAccount}>
            Create my account
          </Button>
          <Text>
            Already have an account?{' '}
            <Anchor fw={500} href="/login">
              Log in
            </Anchor>
          </Text>
        </div>
      </FocusTrap>
    </form>
  )
}
