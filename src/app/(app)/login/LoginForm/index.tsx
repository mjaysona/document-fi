'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useRef } from 'react'
import { Button } from '@/app/(app)/components/Button'
import { Input } from '@/app/(app)/components/Input'
import { Message } from '@/app/(app)/components/Message'
import { useAuth } from '../../providers/Auth'
import classes from './index.module.scss'
import { useForm } from 'react-hook-form'
import { Tenant } from '@payload-types'

type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC = () => {
  const searchParams = useSearchParams()
  const allParams = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const redirect = useRef(searchParams.get('redirect'))
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = React.useState<null | string>(null)

  const {
    formState: { errors, isLoading },
    handleSubmit,
    register,
  } = useForm<FormData>({
    defaultValues: {
      email: 'demo@payloadcms.com',
      password: 'demo',
    },
  })

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!data?.email || !data?.password) return

      const response = await fetch('/api/users/account/login', {
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'post',
      })
      const responseData = await response.json()

      console.log('responseData', responseData)
      console.log('response', response)

      if (response?.status === 200 && responseData?.user) {
        console.log('Login1')
        if (redirect?.current) {
          router.push(redirect.current)
        } else {
          router.push('/account')
        }
      } else if (response.status === 401 && responseData?.errors?.[0]?.message) {
        const { errors } = responseData || 'There was a problem logging in on your account.'

        console.log('Login2')

        if (errors.length > 1) {
          setError(errors)
        } else {
          setError(errors[0]?.message || 'There was a problem logging in on your account.')
        }
      } else {
        console.log('Login3')
        throw new Error('There was a problem logging in on your account.')
      }
    },
    [login, router],
  )

  return (
    <form className={classes.form} onSubmit={handleSubmit(onSubmit)}>
      <p>
        {'To log in, use the email '}
        <b>demo@payloadcms.com</b>
        {' with the password '}
        <b>demo</b>
        {'. To manage your users, '}
        <Link href={`${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/users`}>
          login to the admin dashboard
        </Link>
        .
      </p>
      <Message className={classes.message} error={error} />
      <Input
        error={errors.email}
        label="Email Address"
        name="email"
        register={register}
        required
        type="email"
      />
      <Input
        error={errors.password}
        label="Password"
        name="password"
        register={register}
        required
        type="password"
      />
      <Button
        appearance="primary"
        className={classes.submit}
        disabled={isLoading}
        label={isLoading ? 'Processing' : 'Login'}
        type="submit"
      />
      <div>
        <Link href={`/create-account${allParams}`}>Create an account</Link>
        <br />
        <Link href={`/recover-password${allParams}`}>Recover your password</Link>
      </div>
    </form>
  )
}
