import type { CollectionConfig } from 'payload'
import {
  createFinancialAccounts,
  deleteFinancialAccounts,
  readFinancialAccounts,
  updateFinancialAccounts,
} from './access'
import { hasSuperAdminRole } from '@/utilities/getRole'

const FinancialAccounts: CollectionConfig = {
  slug: 'financial-accounts',
  labels: {
    singular: 'Financial Account',
    plural: 'Financial Accounts',
  },
  access: {
    create: createFinancialAccounts,
    read: readFinancialAccounts,
    update: updateFinancialAccounts,
    delete: deleteFinancialAccounts,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'bank', 'isDefault', 'startingBalance', 'currentBalance'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'bank',
      label: 'Bank',
      type: 'relationship',
      relationTo: 'banks',
      required: true,
      access: {
        update: ({ data, req }) => {
          return hasSuperAdminRole(req.user?.userRoles) || !data?.bank
        },
      },
    },
    {
      name: 'isDefault',
      label: 'Default Account',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'primaryLogo',
      label: 'Primary Logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'brandmarkLogo',
      label: 'Brandmark Logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'startingBalance',
      label: 'Starting Balance',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      access: {
        update: ({ data, req }) => {
          return hasSuperAdminRole(req.user?.userRoles) || !data?.bank
        },
      },
    },
    {
      name: 'currentBalance',
      label: 'Current Balance',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      access: {
        update: ({ data, req }) => {
          return hasSuperAdminRole(req.user?.userRoles) || !data?.bank
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation === 'create') {
          const startingBalance =
            typeof data?.startingBalance === 'number'
              ? data.startingBalance
              : Number(data?.startingBalance || 0)

          return {
            ...data,
            currentBalance: Number.isFinite(startingBalance) ? startingBalance : 0,
          }
        }

        if (
          operation === 'update' &&
          data &&
          'startingBalance' in data &&
          !('currentBalance' in data)
        ) {
          return {
            ...data,
            currentBalance:
              typeof originalDoc?.currentBalance === 'number'
                ? originalDoc.currentBalance
                : Number(originalDoc?.currentBalance || 0),
          }
        }

        return data
      },
    ],
  },
  timestamps: true,
  versions: true,
}

export default FinancialAccounts
