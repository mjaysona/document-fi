import { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import {
  createWeightBillReceipts,
  readWeightBillReceipts,
  updateWeightBillReceipts,
  deleteWeightBillReceipts,
} from './access'

const WeightBillReceipts: CollectionConfig = {
  slug: 'weight-bill-receipts',
  access: {
    create: createWeightBillReceipts,
    read: readWeightBillReceipts,
    update: updateWeightBillReceipts,
    delete: deleteWeightBillReceipts,
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

export default WeightBillReceipts
