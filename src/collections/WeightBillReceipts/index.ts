import { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'

const WeightBillReceipts: CollectionConfig = {
  slug: 'weight-bill-receipts',
  access: {
    read: () => true,
  },
  labels: {
    singular: 'Weight Bill Receipt',
    plural: 'Weight Bill Receipts',
  },
  upload: {
    mimeTypes: ['image/*'],
  },
  admin: {
    group: {
      label: 'Super Admin',
      name: 'super-admin',
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

export default WeightBillReceipts
