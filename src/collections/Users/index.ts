import type { CollectionConfig, User } from 'payload'
import { externalUsersLogin } from './endpoints/externalUsersLogin'
import { isSuperAdmin } from '../utilities/access/isSuperAdmin'
import { ROLES } from '../UserRoles/roles.enum'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { createUsers, deleteUsers, readUsers, updateUsers } from './access'
import { externalUsersCreateAccount } from './endpoints/externalUsersCreateAccount'
import { externalUsersUpdateAccount } from './endpoints/externalUsersUpdateAccount'
import { externalUsersForgotPassword } from './endpoints/externalUsersForgotPassword'
import { externalUsersAuthProvider } from './endpoints/externalUsersAuthProvider'
import { externalUsersMe } from '@/collections/Users/endpoints/externalUsersMe'

const Users: CollectionConfig = {
  slug: 'users',
  // access: {
  //   create: createUsers,
  //   delete: deleteUsers,
  //   read: readUsers,
  //   update: updateUsers,
  // },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'assignedRoles'],
  },
  auth: true,
  endpoints: [
    externalUsersAuthProvider,
    externalUsersCreateAccount,
    externalUsersForgotPassword,
    externalUsersLogin,
    externalUsersMe,
    externalUsersUpdateAccount,
  ],
  fields: [
    {
      type: 'relationship',
      admin: {
        disableListColumn: true,
        position: 'sidebar',
        condition: (_data, _siblingData, { user }) => {
          return hasSuperAdminRole(user?.userRoles)
        },
      },
      label: 'User Roles',
      name: 'userRoles',
      relationTo: 'user-roles',
      hasMany: true,
      defaultValue: async ({ req }) => {
        const selectedUserRole = await req.payload?.find({
          collection: 'user-roles',
          where: {
            label: {
              equals: ROLES.USER,
            },
          },
        })

        return selectedUserRole.docs?.length ? [selectedUserRole.docs[0].id] : []
      },
      access: {
        update: ({ req }) => {
          return isSuperAdmin(req)
        },
      },
    },
    {
      type: 'group',
      label: 'Personal Details',
      admin: {},
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              label: 'Name',
              type: 'text',
            },
            {
              name: 'image',
              label: 'Image',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          type: 'checkbox',
          name: 'isSystemAccount',
          admin: {
            condition: (_data, _siblingData, { user }) => {
              return hasSuperAdminRole(user?.userRoles)
            },
          },
          defaultValue: false,
        },
        {
          type: 'checkbox',
          name: 'isEmailVerified',
          admin: {
            condition: (_data, _siblingData, { user }) => {
              return hasSuperAdminRole(user?.userRoles)
            },
          },
          defaultValue: false,
        },
        {
          type: 'checkbox',
          name: 'isFresh',
          admin: {
            condition: (_data, _siblingData, { user }) => {
              return hasSuperAdminRole(user?.userRoles)
            },
          },
          defaultValue: true,
        },
      ],
    },
  ],
}

export default Users
