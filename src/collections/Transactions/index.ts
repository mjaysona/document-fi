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

type MaybeRelationship = string | { id?: string | number } | null | undefined

const getRelationshipId = (value: MaybeRelationship): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value.id === 'string') return value.id
  if (typeof value.id === 'number') return String(value.id)
  return null
}

const toSafeNonNegativeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const getParentTransactionIds = (args: {
  doc?: Record<string, unknown>
  previousDoc?: Record<string, unknown>
}): string[] => {
  const parentIds = [
    getRelationshipId(args.doc?.parentTransaction as MaybeRelationship),
    getRelationshipId(args.previousDoc?.parentTransaction as MaybeRelationship),
  ]

  return [...new Set(parentIds.filter((value): value is string => Boolean(value)))]
}

const getErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined

  if ('status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (Number.isFinite(status)) return status
  }

  if ('statusCode' in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode)
    if (Number.isFinite(statusCode)) return statusCode
  }

  return undefined
}

const hasValidationErrorForPath = (error: unknown, pathSegment: string): boolean => {
  if (!error || typeof error !== 'object') return false

  const data = 'data' in error ? (error as { data?: unknown }).data : undefined
  if (!data || typeof data !== 'object') return false

  const errors = 'errors' in data ? (data as { errors?: unknown }).errors : undefined
  if (!Array.isArray(errors)) return false

  return errors.some((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const path = 'path' in entry ? (entry as { path?: unknown }).path : undefined
    return typeof path === 'string' && path.includes(pathSegment)
  })
}

const getAllChildTransactions = async (args: {
  req: any
  parentTransactionId: string
}): Promise<Array<Record<string, unknown>>> => {
  const docs: Array<Record<string, unknown>> = []
  let page = 1

  while (true) {
    const result = await args.req.payload.find({
      collection: 'transactions',
      where: {
        parentTransaction: {
          equals: args.parentTransactionId,
        },
      },
      depth: 0,
      limit: 200,
      page,
      overrideAccess: true,
      req: args.req,
    })

    docs.push(...(result.docs as Array<Record<string, unknown>>))

    const currentPage = Number(result.page || 1)
    const totalPages = Number(result.totalPages || 1)
    if (currentPage >= totalPages) break

    page = currentPage + 1
  }

  return docs
}

const syncParentAllocatedFunds = async (args: { req: any; parentTransactionIds: string[] }) => {
  const uniqueParentIds = [...new Set(args.parentTransactionIds.filter(Boolean))]
  if (uniqueParentIds.length === 0) return

  for (const parentTransactionId of uniqueParentIds) {
    let parentDoc: Record<string, unknown> | undefined
    try {
      const parentResult = await args.req.payload.find({
        collection: 'transactions',
        where: {
          id: {
            equals: parentTransactionId,
          },
        },
        depth: 0,
        limit: 1,
        overrideAccess: true,
        req: args.req,
      })

      parentDoc = parentResult.docs[0] as Record<string, unknown> | undefined
      if (!parentDoc) continue
    } catch (error) {
      const status = getErrorStatusCode(error)
      if (status === 404 || status === 400) continue
      throw error
    }

    let nextAllocatedFunds = 0
    if (parentDoc.isAllocatedFund === true && parentDoc.allocatedFundType === 'completed') {
      const childTransactions = await getAllChildTransactions({
        req: args.req,
        parentTransactionId,
      })

      nextAllocatedFunds = childTransactions.reduce((sum, transaction) => {
        const amount = toSafeNonNegativeNumber(transaction.amount)
        const fee = toSafeNonNegativeNumber(transaction.transactionFee)
        return sum + amount + fee
      }, 0)
    }

    const currentAllocatedFunds =
      typeof parentDoc.allocatedFunds === 'number' && Number.isFinite(parentDoc.allocatedFunds)
        ? parentDoc.allocatedFunds
        : 0

    if (currentAllocatedFunds !== nextAllocatedFunds) {
      const context = {
        ...(args.req.context || {}),
        skipTransactionBalanceSync: true,
      }

      try {
        await args.req.payload.update({
          collection: 'transactions',
          id: parentTransactionId,
          data: {
            allocatedFunds: nextAllocatedFunds,
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
          context,
        })
      } catch (error) {
        const status = getErrorStatusCode(error)
        if (status === 404) continue

        const needsRelationshipRetry =
          hasValidationErrorForPath(error, 'financialAccount') ||
          hasValidationErrorForPath(error, 'parentTransaction')

        if (!needsRelationshipRetry) {
          throw error
        }

        await args.req.payload.update({
          collection: 'transactions',
          id: parentTransactionId,
          data: {
            allocatedFunds: nextAllocatedFunds,
            financialAccount: getRelationshipId(parentDoc.financialAccount as MaybeRelationship),
            parentTransaction: getRelationshipId(parentDoc.parentTransaction as MaybeRelationship),
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
          context,
        })
      }
    }
  }
}

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

const syncAllocationFunds = async (args: {
  req: any
  doc: Record<string, unknown>
  previousDoc?: Record<string, unknown>
}) => {
  const isForAllocationNow = args.doc.isForAllocation === true
  const isForAllocationPreviously = args.previousDoc?.isForAllocation === true
  const isAllocatedFundNow = args.doc.isAllocatedFund === true
  const isAllocatedFundPreviously = args.previousDoc?.isAllocatedFund === true

  const financialAccountNow = getRelationshipId(args.doc.financialAccount as MaybeRelationship)
  const financialAccountPreviously = getRelationshipId(
    args.previousDoc?.financialAccount as MaybeRelationship,
  )

  // Get the transaction amounts
  const amountNow = toSafeNonNegativeNumber(args.doc.amount)
  const feeNow = toSafeNonNegativeNumber(args.doc.transactionFee)
  const totalNow = amountNow + feeNow

  const amountPreviously = toSafeNonNegativeNumber(args.previousDoc?.amount)
  const feePreviously = toSafeNonNegativeNumber(args.previousDoc?.transactionFee)
  const totalPreviously = amountPreviously + feePreviously

  // If nothing relevant has changed, nothing to do
  if (
    isForAllocationNow === isForAllocationPreviously &&
    isAllocatedFundNow === isAllocatedFundPreviously &&
    financialAccountNow === financialAccountPreviously &&
    totalNow === totalPreviously
  ) {
    return
  }

  // HANDLE isForAllocation (adds to allocationFunds pool)
  // Remove from previous financial account if needed
  if (isForAllocationPreviously && financialAccountPreviously && totalPreviously > 0) {
    try {
      const previousAccount = await args.req.payload.findByID({
        collection: 'financial-accounts',
        id: financialAccountPreviously,
        depth: 0,
        overrideAccess: true,
      })

      if (previousAccount) {
        const currentAllocationFunds =
          typeof previousAccount.allocationFunds === 'number' && previousAccount.allocationFunds > 0
            ? previousAccount.allocationFunds
            : 0
        const newAllocationFunds = Math.max(0, currentAllocationFunds - totalPreviously)

        await args.req.payload.update({
          collection: 'financial-accounts',
          id: financialAccountPreviously,
          data: {
            allocationFunds: newAllocationFunds,
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
        })
      }
    } catch (error) {
      const status = getErrorStatusCode(error)
      if (status !== 404) throw error
    }
  }

  // Add to new financial account if needed
  if (isForAllocationNow && financialAccountNow && totalNow > 0) {
    try {
      const currentAccount = await args.req.payload.findByID({
        collection: 'financial-accounts',
        id: financialAccountNow,
        depth: 0,
        overrideAccess: true,
      })

      if (currentAccount) {
        const currentAllocationFunds =
          typeof currentAccount.allocationFunds === 'number' && currentAccount.allocationFunds > 0
            ? currentAccount.allocationFunds
            : 0
        const addAmount =
          isForAllocationPreviously && financialAccountNow === financialAccountPreviously
            ? totalNow - totalPreviously
            : totalNow
        const newAllocationFunds = currentAllocationFunds + addAmount

        await args.req.payload.update({
          collection: 'financial-accounts',
          id: financialAccountNow,
          data: {
            allocationFunds: Math.max(0, newAllocationFunds),
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
        })
      }
    } catch (error) {
      const status = getErrorStatusCode(error)
      if (status !== 404) throw error
    }
  }

  // HANDLE isAllocatedFund (updates allocatedFunds - amount already spent from pool)
  // Remove from previous financial account if needed
  if (isAllocatedFundPreviously && financialAccountPreviously && totalPreviously > 0) {
    try {
      const previousAccount = await args.req.payload.findByID({
        collection: 'financial-accounts',
        id: financialAccountPreviously,
        depth: 0,
        overrideAccess: true,
      })

      if (previousAccount) {
        const currentAllocatedFunds =
          typeof previousAccount.allocatedFunds === 'number' && previousAccount.allocatedFunds > 0
            ? previousAccount.allocatedFunds
            : 0
        const newAllocatedFunds = Math.max(0, currentAllocatedFunds - totalPreviously)

        await args.req.payload.update({
          collection: 'financial-accounts',
          id: financialAccountPreviously,
          data: {
            allocatedFunds: newAllocatedFunds,
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
        })
      }
    } catch (error) {
      const status = getErrorStatusCode(error)
      if (status !== 404) throw error
    }
  }

  // Add to new financial account if needed
  if (isAllocatedFundNow && financialAccountNow && totalNow > 0) {
    try {
      const currentAccount = await args.req.payload.findByID({
        collection: 'financial-accounts',
        id: financialAccountNow,
        depth: 0,
        overrideAccess: true,
      })

      if (currentAccount) {
        const currentAllocatedFunds =
          typeof currentAccount.allocatedFunds === 'number' && currentAccount.allocatedFunds > 0
            ? currentAccount.allocatedFunds
            : 0
        const addAmount =
          isAllocatedFundPreviously && financialAccountNow === financialAccountPreviously
            ? totalNow - totalPreviously
            : totalNow
        const newAllocatedFunds = currentAllocatedFunds + addAmount

        await args.req.payload.update({
          collection: 'financial-accounts',
          id: financialAccountNow,
          data: {
            allocatedFunds: Math.max(0, newAllocatedFunds),
          },
          depth: 0,
          overrideAccess: true,
          req: args.req,
        })
      }
    } catch (error) {
      const status = getErrorStatusCode(error)
      if (status !== 404) throw error
    }
  }
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
    useAsTitle: 'referenceNumber',
    listSearchableFields: ['description', 'referenceNumber', 'id'],
    defaultColumns: [
      'referenceNumber',
      'transactionDate',
      'description',
      'financialAccount',
      'sourceAccount',
      'destinationAccount',
      'totalAmount',
      'transactionStatus',
    ],
  },
  fields: [
    {
      name: 'allocatedFundType',
      label: 'Allocated Fund Type',
      type: 'select',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Returned', value: 'returned' },
      ],
      defaultValue: 'completed',
      admin: {
        description: 'Type of allocated fund: completed or returned.',
        position: 'sidebar',
      },
    },
    {
      name: 'transactionDate',
      label: 'Transaction Date',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyyy h:mm a',
        },
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
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
      label: 'Reference #',
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
      name: 'isAllocatedFund',
      label: 'Allocated Fund',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Mark this transaction as an allocated fund to indicate it is part of a fund allocation',
      },
    },
    {
      name: 'isForAllocation',
      label: 'For Allocation',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Mark this transaction as available for allocation to indicate it can be used as a parent for fund allocation',
      },
    },
    {
      name: 'isAutoGenerated',
      label: 'Auto-generated Reference',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Checked when reference number is generated automatically.',
      },
    },
    {
      name: 'allocatedFunds',
      label: 'Allocated Funds',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-computed from child transactions amount + transaction fee.',
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

        await syncParentAllocatedFunds({
          req,
          parentTransactionIds: getParentTransactionIds({
            doc: doc as Record<string, unknown>,
            previousDoc: previousDoc as Record<string, unknown>,
          }),
        })

        await syncAllocationFunds({
          req,
          doc: doc as Record<string, unknown>,
          previousDoc: previousDoc as Record<string, unknown>,
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

        await syncParentAllocatedFunds({
          req,
          parentTransactionIds: getParentTransactionIds({
            previousDoc: doc as Record<string, unknown>,
          }),
        })

        await syncAllocationFunds({
          req,
          doc: { ...doc, isForAllocation: false } as Record<string, unknown>,
          previousDoc: doc as Record<string, unknown>,
        })

        return doc
      },
    ],
  },
  timestamps: true,
}

export default Transactions
