import type { CollectionConfig, Field } from 'payload'
import { createdByField } from '@/fields/CreatedByField'
import { updatedByField } from '@/fields/UpdatedByField'
import { getAffectedAccountIds, getRecomputeHints, syncAccountBalances } from './balanceSync'
import {
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
} from './access'

const getBankShortName = async (bankValue: unknown, req: any): Promise<string> => {
  if (!bankValue) return ''

  if (typeof bankValue === 'string') {
    try {
      const bank = await req.payload.findByID({
        collection: 'banks',
        id: bankValue,
      })
      return bank?.name || ''
    } catch {
      return ''
    }
  }

  if (typeof bankValue === 'object' && bankValue !== null && 'name' in bankValue) {
    const name = (bankValue as { name?: unknown }).name
    return typeof name === 'string' ? name : ''
  }

  return ''
}

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
    defaultColumns: [
      'description',
      'transactionDate',
      'sourceAccount',
      'financialAccount',
      'amount',
      'transactionFee',
      'transactionStatus',
    ],
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
      required: true,
      options: [
        { label: 'Debit', value: 'debit' },
        { label: 'Credit', value: 'credit' },
      ],
    },
    {
      name: 'sourceAccount',
      label: 'Source Bank',
      type: 'relationship',
      relationTo: 'banks',
    },
    {
      name: 'destinationAccount',
      label: 'Destination Bank',
      type: 'relationship',
      relationTo: 'banks',
    },
    {
      name: 'financialAccount',
      label: 'Financial Account',
      type: 'relationship',
      relationTo: 'financial-accounts',
      validate: (value: any, { data }: any) => {
        // Only required if not a child transaction (parentTransaction is not set)
        if (!data.parentTransaction && !value) {
          return 'Financial account is required.'
        }
        return true
      },
    },
    {
      name: 'from',
      label: 'From',
      type: 'text',
    },
    {
      name: 'to',
      label: 'To',
      type: 'text',
    },
    {
      name: 'referenceNumber',
      label: 'Reference Number',
      type: 'text',
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      min: 0,
      required: true,
    },
    {
      name: 'transactionFee',
      label: 'Transaction Fee',
      type: 'number',
      min: 0,
      required: true,
      defaultValue: 0,
    },
    {
      name: 'sender',
      label: 'Sender',
      type: 'text',
      admin: {
        description: 'Auto-computed from From and Source Bank fields',
      },
      hooks: {
        beforeChange: [
          async ({ siblingData, req }) => {
            const senderFrom = typeof siblingData?.from === 'string' ? siblingData.from : ''
            const sourceBankName = await getBankShortName(siblingData?.sourceAccount, req)

            if (senderFrom && sourceBankName) return `${senderFrom} (${sourceBankName})`
            if (senderFrom) return senderFrom
            if (sourceBankName) return sourceBankName
            return ''
          },
        ],
      },
    },
    {
      name: 'receiver',
      label: 'Receiver',
      type: 'text',
      admin: {
        description: 'Auto-computed from To and Destination Bank fields',
      },
      hooks: {
        beforeChange: [
          async ({ siblingData, req }) => {
            const receiverTo = typeof siblingData?.to === 'string' ? siblingData.to : ''
            const destinationBankName = await getBankShortName(siblingData?.destinationAccount, req)

            if (receiverTo && destinationBankName) return `${receiverTo} (${destinationBankName})`
            if (receiverTo) return receiverTo
            if (destinationBankName) return destinationBankName
            return ''
          },
        ],
      },
    },
    {
      name: 'totalAmount',
      label: 'Total Amount',
      type: 'number',
      admin: {
        description: 'Auto-computed from Amount + Transaction Fee',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const amount = typeof siblingData?.amount === 'number' ? siblingData.amount : 0
            const transactionFee =
              typeof siblingData?.transactionFee === 'number' ? siblingData.transactionFee : 0

            return amount + transactionFee
          },
        ],
      },
    },
    {
      name: 'currentBalance',
      label: 'Current Balance',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'runningBalance',
      label: 'Running Balance',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'transactionStatus',
      label: 'Transaction Status',
      type: 'select',
      required: true,
      defaultValue: 'completed',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
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
      name: 'isFundAllocation',
      label: 'Fund Allocation',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Mark this transaction as a fund allocation to allocate across multiple accounts',
      },
    },
    {
      name: 'parentTransaction',
      label: 'Parent Transaction',
      type: 'relationship',
      relationTo: 'transactions',
      admin: {
        position: 'sidebar',
        description: 'Parent transaction for fund allocation purposes',
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
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (req.context?.skipTransactionBalanceSync) return doc

        await syncAccountBalances({
          req,
          accountIds: getAffectedAccountIds({
            doc: doc as Record<string, unknown>,
            previousDoc: previousDoc as Record<string, unknown>,
          }),
          recomputeHints: getRecomputeHints({
            doc: doc as Record<string, unknown>,
            previousDoc: previousDoc as Record<string, unknown>,
          }),
        })

        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (req.context?.skipTransactionBalanceSync) return doc

        await syncAccountBalances({
          req,
          accountIds: getAffectedAccountIds({
            previousDoc: doc as Record<string, unknown>,
          }),
          recomputeHints: getRecomputeHints({
            previousDoc: doc as Record<string, unknown>,
          }),
        })

        return doc
      },
    ],
  },
  timestamps: true,
}

export default Transactions
