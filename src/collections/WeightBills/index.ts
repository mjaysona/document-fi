import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { createWeightBills, readWeightBills, updateWeightBills } from './access'
import { updatedByField } from '@/fields/UpdatedByField'

const WeightBills: CollectionConfig = {
  slug: 'weight-bills',
  access: {
    create: createWeightBills,
    read: () => true,
    update: updateWeightBills,
    delete: () => true,
  },
  admin: {
    useAsTitle: 'weightBillNumber',
    defaultColumns: [
      'weightBillNumber',
      'customerName',
      'vehicle',
      'submittedBy',
      'verifiedBy',
      'isVerified',
      'updatedAt',
    ],
  },
  fields: [
    {
      name: 'weightBillNumber',
      label: 'Weight Bill #',
      type: 'number',
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
    },
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
    },
    {
      name: 'vehicle',
      label: 'Vehicle',
      type: 'relationship',
      relationTo: 'vehicles',
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
    },
    {
      name: 'paymentStatus',
      label: 'Payment Status',
      type: 'select',
      options: [
        { label: 'PAID', value: 'PAID' },
        { label: 'CANCELLED', value: 'CANCELLED' },
      ],
    },
    {
      name: 'proofOfReceipt',
      label: 'Proof of Receipt',
      type: 'upload',
      relationTo: 'weight-bill-receipts',
    },
    {
      name: 'isVerified',
      label: 'Is Verified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'submittedBy',
      label: 'Submitted By',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 1,
      defaultValue: ({ req }) => req.user?.id,
      hooks: {
        beforeChange: [
          ({ operation, previousValue, value }) => {
            return operation === 'create' ? value : previousValue
          },
        ],
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'verifiedBy',
      label: 'Verified By',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 1,
      hooks: {
        beforeChange: [
          ({ data, req, previousValue }) => {
            if (data?.isVerified) {
              return req.user?.id || previousValue
            }
            return previousValue
          },
        ],
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      ...createdByField,
      admin: {
        ...createdByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
    {
      ...updatedByField,
      admin: {
        ...updatedByField.admin,
        hidden: false,
        position: 'sidebar',
      },
    } as Field,
  ],
  versions: true,
}

export default WeightBills
