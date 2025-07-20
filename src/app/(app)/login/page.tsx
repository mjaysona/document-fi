import config from '~/payload.config'
import { LoginForm } from './LoginForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { ROLES } from '~/src/collections/UserRoles/roles.enum'
import { getPayload } from 'payload'

export default async function Page() {
  const payload = await getPayload({ config })
  const title = 'Log in'
  const description = 'Enter your email and password to log in.'
  const userRole = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: ROLES.USER,
      },
    },
  })

  return (
    <AuthPageWrapper title={title} description={description}>
      <LoginForm defaultRole={userRole?.docs[0].id} />
    </AuthPageWrapper>
  )
}
