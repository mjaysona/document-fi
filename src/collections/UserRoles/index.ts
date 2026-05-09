import { CollectionSlug, FieldAccess, type CollectionConfig } from 'payload'
import { noSpecialCharacters } from '../utilities/noSpecialCharacters'
import { camelCaseFormat } from '../utilities/camelCaseFormat'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import { AccessType } from '@/enums'
import createUserRoles from './access/create'
import readUserRoles from './access/read'
import updateUserRoles from './access/update'
import deleteUserRoles from './access/delete'
import { hasSuperAdminRole } from '@/utilities/getRole'
import { selectedItemsField } from '@/fields/NonRepeatingArraySelectField'

const configurableCollections = [
  'accounts',
  'banks',
  'equipment',
  'equipment-media',
  'media',
  'pages',
  'posts',
  'quotes',
  'sessions',
  'session-uploads',
  'transactions',
  'transaction-receipts',
  'users',
  'user-preferences',
  'user-roles',
  'vehicles',
  'weight-bills',
  'weight-bill-receipts',
]

const configurableGlobals = ['dashboard-customization']
const configurableCollectionGroups = ['globals', 'appearance', 'admin']

const UserRoles: CollectionConfig = {
  slug: 'user-roles',
  labels: {
    singular: 'User Role',
    plural: 'User Roles',
  },
  // access: {
  //   create: createUserRoles,
  //   read: readUserRoles,
  //   update: updateUserRoles,
  //   delete: deleteUserRoles,
  // },
  admin: {
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
      // validate: (value: string) => noSpecialCharacters(value),
      access: {
        update: ({ doc, req }) => {
          return hasSuperAdminRole(req.user?.userRoles) || !doc?.isSystemRole
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
            path: '@/collections/UserRoles/components/PermissionsCellComponent/index',
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
            // {
            //   name: 'group',
            //   type: 'select',
            //   admin: {
            //     hidden: true,
            //     readOnly: true,
            //     width: '16%',
            //   },
            //   options: [
            //     {
            //       label: 'Globals',
            //       value: 'globals',
            //     },
            //     {
            //       label: 'Appearance',
            //       value: 'appearance',
            //     },
            //     {
            //       label: 'Admin',
            //       value: 'admin',
            //     },
            //   ],
            //   hooks: {
            //     beforeChange: [
            //       ({ req, siblingData }) => {
            //         const { collectionSlug } = siblingData
            //         const { collections } = req.payload

            //         if (collectionSlug && collections[collectionSlug as CollectionSlug]) {
            //           const collection = collections[collectionSlug as CollectionSlug]

            //           return (collection.config.admin.group as { name: string })?.name
            //         }

            //         return null
            //       },
            //     ],
            //   },
            // },
            {
              name: 'collectionSlug',
              label: 'Feature',
              type: 'text',
              required: true,
              access: {
                update: updateUserRoles as FieldAccess,
              },
              admin: {
                components: {
                  Field: {
                    path: '@/collections/UserRoles/components/CollectionsSelectField/index',
                    serverProps: {
                      configurableCollections,
                      configurableGlobals,
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
      name: 'groupedPermissions',
      label: 'Group Permissions',
      type: 'array',
      admin: {
        hidden: true,
        components: {
          Cell: {
            path: '@/collections/UserRoles/components/PermissionsCellComponent/index',
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
              label: 'Group',
              type: 'text',
              required: true,
              access: {
                update: updateUserRoles as FieldAccess,
              },
              admin: {
                components: {
                  Field: {
                    path: '@/collections/UserRoles/components/CollectionGroupsSelectField/index',
                    serverProps: {
                      configurableCollectionGroups,
                      groupedPermissionsPath: 'groupedPermissions',
                      selectFieldName: 'group',
                      textFieldName: 'selectedFeatures',
                    },
                  },
                },
                width: '25%',
              },
            },
            {
              name: 'collections',
              type: 'text',
              hasMany: true,
              admin: {
                hidden: true,
                readOnly: true,
              },
              hooks: {
                beforeChange: [
                  ({ req, siblingData }) => {
                    const group = siblingData?.group

                    if (!group) {
                      return []
                    }

                    const collections = Object.values(req.payload.collections)
                      .filter((collection) => {
                        const collectionGroup = collection.config.admin.group
                        return (
                          typeof collectionGroup === 'object' &&
                          collectionGroup &&
                          collectionGroup.name === group
                        )
                      })
                      .map((collection) => collection.config.slug)

                    return collections
                  },
                ],
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
        create: ({ req }) => hasSuperAdminRole(req.user?.userRoles),
        read: ({ doc, req }) => hasSuperAdminRole(req.user?.userRoles) || doc?.isSystemRole,
        update: ({ req }) => hasSuperAdminRole(req.user?.userRoles),
      },
    },
    {
      ...selectedItemsField({
        textFieldName: 'selectedFeatures',
        arrayFieldPath: 'permissions',
        selectFieldName: 'collectionSlug',
      }),
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        return {
          ...data,
          value: camelCaseFormat(data?.label),
        }
      },
    ],
    beforeValidate: [
      ({ data, req }) => {
        // Filter permissions to only those referencing valid collections
        // This allows existing permissions for collections not in configurableCollections
        // but prevents referencing collections that don't exist in Payload
        if (Array.isArray(data?.permissions)) {
          const collections = req.payload.collections
          data.permissions = data.permissions.filter((perm: any) => {
            if (perm && typeof perm === 'object' && perm.collectionSlug) {
              // Keep permission if it references an actual collection in Payload
              return collections[perm.collectionSlug as CollectionSlug] !== undefined
            }
            return true
          })
        }
        return data
      },
    ],
  },
}

export default UserRoles
