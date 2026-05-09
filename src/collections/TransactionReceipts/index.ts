import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import {
  createTransactionReceipts,
  readTransactionReceipts,
  updateTransactionReceipts,
  deleteTransactionReceipts,
} from './access'

const TransactionReceipts: CollectionConfig = {
  slug: 'transaction-receipts',
  access: {
    create: createTransactionReceipts,
    read: readTransactionReceipts,
    update: updateTransactionReceipts,
    delete: deleteTransactionReceipts,
  },
  labels: {
    singular: 'Transaction Receipt',
    plural: 'Transaction Receipts',
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  admin: {
    group: {
      label: 'Media',
      name: 'media',
    },
  },
  fields: [
    {
      ...createdByField,
      label: 'Uploaded by',
    } as Field,
  ],
  versions: true,
}

export default TransactionReceipts
