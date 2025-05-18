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
import { ROLES } from '../Roles/roles.enum'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { isDeepStrictEqual } from 'util'
import { createUsers, deleteUsers, readUsers, updateUsers } from './access'
import { createFirstTenantUser } from '../Tenants/utilities/createFirstTenantUser'

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
  endpoints: [externalUsersLogin],
  fields: [
    {
      type: 'checkbox',
      name: 'isSystemAccount',
      admin: {
        position: 'sidebar',
        description: 'This user is a system generated account and cannot be deleted.',
      },
      defaultValue: false,
    },
    {
      type: 'relationship',
      admin: {
        disableListColumn: true,
        position: 'sidebar',
        condition: (_data, _siblingData, { user }) => {
          return hasSuperAdminRole(user?.roles)
        },
      },
      label: 'Global Roles',
      name: 'roles',
      relationTo: 'roles',
      hasMany: true,
      defaultValue: async ({ req }) => {
        const selectedUserRole = await req.payload.find({
          collection: 'roles',
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
          return !hasSuperAdminRole(user?.roles)
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
        const userTenant = userTenants.find(
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
          return hasSuperAdminRole(user?.roles)
        },
        disableListColumn: true,
        position: 'sidebar',
      },
      access: {
        read: ({ req }) => {
          return hasSuperAdminRole(req?.user?.roles) || !hasNoSelectedTenant(req)
        },
      },
      defaultValue: async ({ req }) => {
        const selectedTenant = getSelectedTenantId(req) || ''

        if (!selectedTenant) return [{}]

        const defaultTenant = {
          tenant: selectedTenant,
        }

        return [defaultTenant]
      },
    },
  ],
  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation === 'read') {
          const selectedTenantId = getSelectedTenantId(req)

          if (selectedTenantId) {
            const { payload } = req

            const tenantUsers = await payload.find({
              collection: 'users',
              where: {
                'tenants.tenant': {
                  equals: selectedTenantId,
                },
              },
            })

            // If no tenant users exist for a tenant, always create a default user.
            if (!tenantUsers?.docs?.length) {
              const fullTenant = await payload.find({
                collection: 'tenants',
                where: {
                  id: {
                    equals: selectedTenantId,
                  },
                },
              })

              await createFirstTenantUser(req, {
                tenant: selectedTenantId,
                slug: fullTenant.docs[0].slug,
              })
            }
          }
        }
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        let selectedTenantId: string

        try {
          selectedTenantId = (await getSelectedTenantToken()) || ''
        } catch {}

        const selectedTenant = doc.tenants.find(({ tenant }) => {
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
