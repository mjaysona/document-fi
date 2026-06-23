import type { CollectionConfig } from 'payload'
import {
  createTransactionPurposes,
  deleteTransactionPurposes,
  readTransactionPurposes,
  updateTransactionPurposes,
} from './access'

const TransactionPurposes: CollectionConfig = {
  slug: 'transaction-purposes',
  labels: {
    singular: 'Transaction Purpose',
    plural: 'Transaction Purposes',
  },
  access: {
    create: createTransactionPurposes,
    read: readTransactionPurposes,
    update: updateTransactionPurposes,
    delete: deleteTransactionPurposes,
  },
  admin: {
    useAsTitle: 'name',
    listSearchableFields: ['name', 'id'],
    defaultColumns: ['name', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      unique: true,
    },
  ],
  timestamps: true,
}

export default TransactionPurposes
