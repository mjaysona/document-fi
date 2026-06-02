import type { CollectionConfig } from 'payload'
import Transactions from '@/collections/Transactions'
import { hasSuperAdminRole } from '@/utilities/getRole'
import {
  createUserConfigurations,
  deleteUserConfigurations,
  readUserConfigurations,
  updateUserConfigurations,
} from '@/collections/UserConfigurations/access'

type NamedTransactionField = {
  name: string
  label?: string
}

const excludedTransactionFields = new Set([
  'rawOcrText',
  'createdBy',
  'updatedBy',
  'uploadedAt',
  'isUserEdited',
  'isAiGenerated',
])

const isNamedTransactionField = (field: unknown): field is NamedTransactionField =>
  typeof field === 'object' &&
  field !== null &&
  'name' in field &&
  typeof (field as { name?: unknown }).name === 'string'

const transactionFieldOptions = (Transactions.fields as unknown[])
  .filter(isNamedTransactionField)
  .filter((field) => !excludedTransactionFields.has(field.name))
  .map((field) => ({
    label: typeof field.label === 'string' ? field.label : field.name,
    value: field.name,
  }))

const UserConfigurations: CollectionConfig = {
  slug: 'user-configurations',
  labels: {
    singular: 'User Configuration',
    plural: 'User Configurations',
  },
  access: {
    create: createUserConfigurations,
    read: readUserConfigurations,
    update: updateUserConfigurations,
    delete: deleteUserConfigurations,
  },
  admin: {
    useAsTitle: 'user',
    defaultColumns: ['user', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (!req.user) return data

        if (hasSuperAdminRole(req.user.userRoles) || Boolean(req.user.isFirstSystemUser)) {
          return data
        }

        return {
          ...data,
          user: req.user.id,
        }
      },
    ],
  },
  fields: [
    {
      name: 'user',
      label: 'User',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'transactionsConfig',
      label: 'Transactions Config',
      type: 'group',
      fields: [
        {
          name: 'tableColumns',
          label: 'Table columns',
          type: 'select',
          hasMany: true,
          options: transactionFieldOptions,
          admin: {
            description: 'Select which transaction fields should appear in the table.',
          },
        },
        {
          name: 'previewTableColumns',
          label: 'Preview Table columns',
          type: 'select',
          hasMany: true,
          options: transactionFieldOptions,
          admin: {
            description: 'Select which transaction fields should appear in preview tables.',
          },
        },
      ],
    },
  ],
  timestamps: true,
}

export default UserConfigurations
