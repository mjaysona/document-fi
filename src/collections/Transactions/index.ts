import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import {
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
} from './access'

const Transactions: CollectionConfig = {
  slug: 'transactions',
  labels: {
    singular: 'Transaction',
    plural: 'Transactions',
  },
  access: {
    create: createTransactions,
    read: readTransactions,
    update: updateTransactions,
    delete: deleteTransactions,
  },
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['transactionDate', 'description', 'sourceBank', 'moneyIn', 'moneyOut'],
  },
  fields: [
    {
      name: 'transactionDate',
      label: 'Transaction Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'MMM d, yyyy',
        },
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: true,
    },
    {
      name: 'particulars',
      label: 'Particulars',
      type: 'textarea',
    },
    {
      name: 'transactionType',
      label: 'Transaction Type',
      type: 'select',
      options: [
        { label: 'Debit', value: 'debit' },
        { label: 'Credit', value: 'credit' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Payment', value: 'payment' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'sourceBank',
      label: 'Source Bank',
      type: 'relationship',
      relationTo: 'banks',
    },
    {
      name: 'referenceNumber',
      label: 'Reference Number',
      type: 'text',
    },
    {
      name: 'moneyIn',
      label: 'Money In',
      type: 'number',
      min: 0,
    },
    {
      name: 'moneyOut',
      label: 'Money Out',
      type: 'number',
      min: 0,
    },
    {
      name: 'runningBalance',
      label: 'Running Balance',
      type: 'number',
      min: 0,
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      required: true,
      defaultValue: 'PHP',
    },
    {
      name: 'receiptImage',
      label: 'Receipt Image',
      type: 'relationship',
      relationTo: 'transaction-receipts',
    },
    {
      name: 'rawOcrText',
      label: 'Raw OCR Text',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'aiExtractedJson',
      label: 'AI Extracted JSON',
      type: 'json',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'extractionConfidence',
      label: 'Extraction Confidence',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'isAiGenerated',
      label: 'AI Generated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isUserEdited',
      label: 'User Edited',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isReversed',
      label: 'Is Reversed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'reversalReason',
      label: 'Reversal Reason',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData?.isReversed,
      },
    },
    {
      name: 'uploadedAt',
      label: 'Uploaded At',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
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
  timestamps: true,
}

export default Transactions
