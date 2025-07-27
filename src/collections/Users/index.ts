import type { CollectionConfig, User } from 'payload'
import { externalUsersLogin } from './endpoints/externalUsersLogin'
import { setCookieBasedOnDomain } from './hooks/setCookieBasedOnDomain'
import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { isSuperAdmin } from '../utilities/access/isSuperAdmin'
import {
  getSelectedTenantId,
  getSelectedTenantToken,
  hasNoSelectedTenant,
} from '@/utilities/getSelectedTenant'
import { isTenantAdmin } from '../utilities/access/isTenantAdmin'
import { ROLES } from '../UserRoles/roles.enum'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { isDeepStrictEqual } from 'util'
import { createUsers, deleteUsers, readUsers, updateUsers } from './access'
import { externalUsersCreateAccount } from './endpoints/externalUsersCreateAccount'
import { hasMultiTenancyFeature } from '../utilities/hasMultitenancyFeature'
import { externalUsersUpdateAccount } from './endpoints/externalUsersUpdateAccount'
import { externalUsersForgotPassword } from './endpoints/externalUsersForgotPassword'
import { externalUsersAuthProvider } from './endpoints/externalUsersAuthProvider'
import { externalUsersMe } from '@/collections/Users/endpoints/externalUsersMe'

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: 'tenants',
  tenantsArrayTenantFieldName: 'tenant',
  tenantsCollectionSlug: 'tenants',
  arrayFieldAccess: {},
  tenantFieldAccess: {
    create: ({ req }) => {
      return isSuperAdmin(req)
    },
    update: ({ req }) => {
      const selectedTenant = getSelectedTenantId(req) || ''
      return isSuperAdmin(req) && !selectedTenant
    },
  },
  rowFields: [
    {
      admin: {
        condition: (_data, siblingData) => {
          return Boolean(siblingData.tenant)
        },
      },
      name: 'roles',
      type: 'relationship',
      relationTo: 'tenant-roles',
      hasMany: true,
      required: true,
      filterOptions: ({ siblingData }) => {
        return {
          'tenant.id': { equals: siblingData?.tenant },
        }
      },
      hooks: {
        beforeChange: [
          async ({ data, previousValue, req, siblingData, value }) => {
            const selectedTenantId = getSelectedTenantId(req)

            if (siblingData.tenant === selectedTenantId) {
              if (!isDeepStrictEqual(previousValue, value)) return value

              return data?.assignedRoles
            }

            return value
          },
        ],
      },
    },
  ],
})

const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: createUsers,
    delete: deleteUsers,
    read: readUsers,
    update: updateUsers,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'assignedRoles', 'tenants'],
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
          const selectedTenant = getSelectedTenantId(req) || ''
          return isSuperAdmin(req) || isTenantAdmin(req.user, selectedTenant)
        },
      },
      filterOptions: ({ req }) => {
        if (!hasNoSelectedTenant(req)) {
          return {
            label: { not_equals: ROLES.SUPER_ADMIN },
          }
        }

        return true
      },
    },
    {
      type: 'relationship',
      admin: {
        condition: (_data, _siblingData, { user }) => {
          return !hasSuperAdminRole(user?.userRoles)
        },
        position: 'sidebar',
      },
      access: {
        read: ({ req }) => {
          return !hasNoSelectedTenant(req)
        },
      },
      name: 'assignedRoles',
      relationTo: 'tenant-roles',
      hasMany: true,
      virtual: true,
      defaultValue: async ({ req, user }) => {
        const selectedTenant = getSelectedTenantId(req) || ''
        const userTenants = user?.tenants || []
        const userTenant = userTenants?.find(
          ({ tenant }) => typeof tenant !== 'string' && tenant?.id === selectedTenant,
        )
        const assignedRoles = userTenant?.roles?.map((role) => role) || []

        return assignedRoles
      },
      filterOptions: ({ req }) => {
        const selectedTenant = getSelectedTenantId(req) || ''

        return {
          'tenant.id': { equals: selectedTenant },
        }
      },
    },
    {
      ...defaultTenantArrayField,
      type: 'array',
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        condition: (_data, _siblingData, { user }) => {
          return hasSuperAdminRole(user?.userRoles)
        },
        disableListColumn: true,
        position: 'sidebar',
      },
      access: {
        read: ({ req }) => {
          return (
            (hasSuperAdminRole(req?.user?.userRoles) || !hasNoSelectedTenant(req)) &&
            hasMultiTenancyFeature(req)
          )
        },
      },
      defaultValue: async ({ req }) => {
        const selectedTenant = getSelectedTenantId(req) || ''

        if (!selectedTenant) return

        const defaultTenant = {
          tenant: selectedTenant,
        }

        return [defaultTenant]
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
            readOnly: true,
          },
          defaultValue: false,
        },
        {
          type: 'checkbox',
          name: 'isEmailVerified',
          admin: {
            readOnly: true,
          },
          defaultValue: false,
        },
        {
          type: 'checkbox',
          name: 'isFresh',
          // admin: {
          //   readOnly: true,
          // },
          defaultValue: true,
        },
      ],
    },
  ],
  hooks: {
    afterRead: [
      async ({ doc, req }) => {
        let selectedTenantId: string

        try {
          selectedTenantId = (await getSelectedTenantToken()) || ''
        } catch {}

        const selectedTenant = doc.tenants?.find(({ tenant }) => {
          return tenant === selectedTenantId
        })
        const assignedTenantRoles = selectedTenant?.roles

        doc.assignedRoles = assignedTenantRoles

        return doc
      },
    ],
    // The following hook sets a cookie based on the domain a user logs in from.
    // It checks the domain and matches it to a tenant in the system, then sets
    // a 'payload-tenant' cookie for that tenant.
    afterLogin: [setCookieBasedOnDomain],
  },
}

export default Users
