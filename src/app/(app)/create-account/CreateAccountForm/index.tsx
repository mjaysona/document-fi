'use client'

import React, { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { hasLength, isEmail, useForm } from '@mantine/form'
import { useAuth } from '../../providers/Auth'
import { Tenant } from '@payload-types'
import {
  Alert,
  Anchor,
  Button,
  FocusTrap,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { AtSign, CheckCircle, CircleAlert, KeySquare } from 'lucide-react'
import { ErrorMessage } from '~/src/collections/Users/enums'

type CreateAccountFormProps = {
  tenant?: Tenant['id']
}

type FormData = {
  email: string
  password: string
  passwordConfirm: string
  tenant?: CreateAccountFormProps['tenant']
}

export const CreateAccountForm: React.FC<CreateAccountFormProps> = ({ tenant }) => {
  const searchParams = useSearchParams()
  const { login } = useAuth()
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
      passwordConfirm: (value, values) => {
        if (value !== values.password) {
          return ErrorMessage.MISMATCHING_PASSWORDS
        }
      },
    },
  })

  const handleSubmit = useCallback(
    async (data: FormData) => {
      setIsCreatingAccount(true)

      const rawResponse = await fetch('/api/users/account/create', {
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const responseData = await rawResponse.json()

      if ((rawResponse?.status === 200 || rawResponse?.status === 201) && responseData?.user) {
        router.push(
          `/login?success=${encodeURIComponent('You have successfully created an account, to continue please log in.')}`,
        )
      } else if (responseData?.errors?.[0]?.message) {
        const { errors } = responseData
        setError(errors[0]?.message)
      } else {
        setError(ErrorMessage.CREATE_ACCOUNT_TRY_AGAIN)
      }

      setIsCreatingAccount(false)
    },
    [login, router, searchParams],
  )

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
            >
              {error}
            </Alert>
          )}
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
