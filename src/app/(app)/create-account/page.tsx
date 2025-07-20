import config from '~/payload.config'
import { CreateAccountForm } from './CreateAccountForm'
import { AuthPageWrapper } from '../components/AuthPageWrapper'
import { ROLES } from '~/src/collections/UserRoles/roles.enum'
import { getPayload } from 'payload'

export default async function CreateAccount() {
  const payload = await getPayload({ config })
  const title = 'Create a new account'
  const userRole = await payload.find({
    collection: 'user-roles',
    where: {
      label: {
        equals: ROLES.USER,
      },
    },
  })

  return (
    <AuthPageWrapper title={title}>
      <CreateAccountForm defaultRole={userRole?.docs[0].id} />
    </AuthPageWrapper>
  )
}
