import type { CollectionConfig } from 'payload'
import { noSpecialCharacters } from '../utilities/noSpecialCharacters'
import { hasSuperAdminRole } from '@/utilities/getRole'

const Roles: CollectionConfig = {
  slug: 'roles',
  access: {
    create: ({ req }) => hasSuperAdminRole(req?.user?.roles),
    update: ({ req }) => hasSuperAdminRole(req?.user?.roles),
    delete: ({ req }) => hasSuperAdminRole(req?.user?.roles),
  },
  admin: {
    useAsTitle: 'label',
    group: {
      label: 'Super Admin',
      name: 'super-admin',
    },
    hidden: ({ user }) => !hasSuperAdminRole(user?.roles),
  },
  fields: [
    {
      name: 'label',
      label: 'Role',
      type: 'text',
      required: true,
      validate: (value: string) => {
        return noSpecialCharacters(value)
      },
    },
  ],
  versions: true,
}

export default Roles
