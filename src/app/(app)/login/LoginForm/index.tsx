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
import { Tenant } from '~/payload-types'

type LoginFormProps = {
  domain?: Tenant['domain']
}
type FormData = {
  email: string
  password: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ domain }) => {
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
      if (!data?.email || !data?.password) {
        return
      }

      const actionRes = await fetch('/api/users/external-users/login', {
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          domain,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'post',
      })
      const json = await actionRes.json()

      if (actionRes.status === 200 && json.user) {
        if (redirect?.current) {
          router.push(redirect.current)
        } else {
          router.push('/account')
        }
      } else if (actionRes.status === 400 && json?.errors?.[0]?.message) {
        setError(json.errors[0].message)
      } else {
        throw new Error('Something went wrong, please try again.')
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
