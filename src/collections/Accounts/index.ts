import { deleteAccounts, readAccounts } from '@/collections/Accounts/access'
import type { CollectionConfig, Field } from 'payload'

const Accounts: CollectionConfig = {
  slug: 'accounts',
  access: {
    create: () => false,
    read: readAccounts,
    update: () => false,
    delete: deleteAccounts,
  },
  admin: {
    useAsTitle: 'userId',
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      label: 'User ID',
    },
    {
      name: 'providerId',
      type: 'text',
      required: true,
      label: 'Provider ID',
    },
    {
      name: 'accessToken',
      type: 'textarea',
      required: true,
      label: 'Access Token',
      admin: {
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      name: 'idToken',
      type: 'textarea',
      required: true,
      label: 'ID Token',
      admin: {
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      name: 'scope',
      type: 'text',
      label: 'Scope',
      admin: {
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      name: 'accessTokenExpiresAt',
      type: 'date',
      required: true,
      label: 'Expires At',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      label: 'Created At',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      required: true,
      label: 'Updated At',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default Accounts
