import { BasePayload, CollectionSlug, FieldAccess, type CollectionConfig } from 'payload'
import { noSpecialCharacters } from '../utilities/noSpecialCharacters'
import { hasTenantSelected } from '@/fields/utilities/access/hasTenantSelected'
import { getSelectedTenantId } from '@/utilities/getSelectedTenant'
import { camelCaseFormat } from '../utilities/camelCaseFormat'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import { AccessType } from '@/enums'
import createTenantRoles from './access/create'
import readTenantRoles from './access/read'
import updateTenantRoles from './access/update'
import deleteTenantRoles from './access/delete'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { selectedItemsField } from '@/fields/NonRepeatingArraySelectField'
import { createFirstTenantRole } from '../Tenants/utilities/createFirstTenantRole'

const configurableCollections = [
  'users',
  'tenant-roles',
  'pages',
  'posts',
  'settings',
  'tenant-media',
]

const TenantRoles: CollectionConfig = {
  slug: 'tenant-roles',
  labels: {
    singular: 'User Role',
    plural: 'User Roles',
  },
  access: {
    create: createTenantRoles,
    read: readTenantRoles,
    update: updateTenantRoles,
    delete: deleteTenantRoles,
  },
  admin: {
    // components: {
    //   Description: {
    //     path: '@/collections/components/ViewDescription/ActiveTenantPill/index#ActiveTenantPill',
    //   },
    // },
    description: 'User roles are used to control access to records in the system.',
    useAsTitle: 'label',
    defaultColumns: ['label', 'permissions'],
  },
  fields: [
    createdByField,
    updatedByField,
    {
      name: 'label',
      label: 'Role',
      type: 'text',
      required: true,
      validate: (value: string) => noSpecialCharacters(value),
      access: {
        update: ({ doc, req }) => {
          return hasSuperAdminRole(req.user?.roles) || !doc?.isSystemRole
        },
      },
    },
    {
      name: 'permissions',
      label: 'Permissions',
      type: 'array',
      admin: {
        components: {
          Cell: {
            path: '@/collections/TenantRoles/components/PermissionsCellComponent/index',
          },
        },
      },
      fields: [
        {
          type: 'row',
          admin: {
            width: '50%',
          },
          fields: [
            {
              name: 'group',
              type: 'select',
              admin: {
                hidden: true,
                readOnly: true,
                width: '16%',
              },
              options: [
                {
                  label: 'Globals',
                  value: 'globals',
                },
                {
                  label: 'Appearance',
                  value: 'appearance',
                },
                {
                  label: 'Admin',
                  value: 'admin',
                },
              ],
              hooks: {
                beforeChange: [
                  ({ req, siblingData }) => {
                    const { collectionSlug } = siblingData
                    const { collections } = req.payload

                    if (collectionSlug && collections[collectionSlug as CollectionSlug]) {
                      const collection = collections[collectionSlug as CollectionSlug]

                      return (collection.config.admin.group as { name: string })?.name
                    }

                    return null
                  },
                ],
              },
            },
            {
              name: 'collectionSlug',
              label: 'Feature',
              type: 'text',
              required: true,
              access: {
                update: updateTenantRoles as FieldAccess,
              },
              admin: {
                components: {
                  Field: {
                    path: '@/collections/TenantRoles/components/CollectionsSelectField/index',
                    serverProps: {
                      configurableCollections,
                      permissionsPath: 'permissions',
                      selectFieldName: 'collectionSlug',
                      textFieldName: 'selectedFeatures',
                    },
                  },
                },
                width: '25%',
              },
            },
            {
              name: 'access',
              label: 'Access',
              type: 'select',
              hasMany: true,
              required: true,
              options: [
                {
                  label: 'View',
                  value: AccessType.READ,
                },
                {
                  label: 'Create',
                  value: AccessType.CREATE,
                },
                {
                  label: 'Update',
                  value: AccessType.UPDATE,
                },
                {
                  label: 'Delete',
                  value: AccessType.DELETE,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'isSystemRole',
      type: 'checkbox',
      label: 'Is System Role',
      admin: {
        description: 'This user is a system generated user and cannot be deleted.',
        position: 'sidebar',
      },
      defaultValue: false,
      access: {
        create: ({ req }) => hasSuperAdminRole(req.user?.roles),
        read: ({ doc, req }) => hasSuperAdminRole(req.user?.roles) || doc?.isSystemRole,
        update: ({ req }) => hasSuperAdminRole(req.user?.roles),
      },
    },
    {
      ...selectedItemsField({
        textFieldName: 'selectedFeatures',
        arrayFieldPath: 'permissions',
        selectFieldName: 'collectionSlug',
      }),
      admin: {
        position: 'sidebar',
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

            const tenantRoles = await payload.find({
              collection: 'tenant-roles',
              where: {
                'tenant.id': {
                  equals: selectedTenantId,
                },
              },
            })

            let fullSelectedTenant

            try {
              fullSelectedTenant = await payload.findByID({
                collection: 'tenants',
                id: selectedTenantId,
                depth: 0,
              })
            } catch (e) {}

            // If no tenant roles exist for a tenant, always create a default role.
            if (!tenantRoles?.docs?.length) {
              await createFirstTenantRole(req, {
                tenant: selectedTenantId,
                slug: fullSelectedTenant?.slug,
              })
            }
          }
        }
      },
    ],
    beforeChange: [
      ({ data, req }) => {
        if (hasTenantSelected(req)) {
          return {
            ...data,
            value: camelCaseFormat(data?.label),
            tenant: getSelectedTenantId(req),
          }
        }

        return {
          ...data,
          value: camelCaseFormat(data?.label),
        }
      },
    ],
  },
}

export default TenantRoles
