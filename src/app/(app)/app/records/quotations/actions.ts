'use server'

import { auth } from '@/app/(app)/lib/auth'
import { getPayload } from 'payload'
import config from '~/payload.config'
import { headers } from 'next/headers'

export type EquipmentOption = {
  id: string
  name: string
  description?: string
  unitPrice: number
}

export type CreateQuoteItemInput = {
  equipmentId?: string
  name: string
  description?: string
  unitPrice: number
  quantity: number
}

export type CreateQuoteInput = {
  name: string
  clientName?: string
  clientEmail?: string
  items: CreateQuoteItemInput[]
}

export type QuoteDetailItem = {
  equipmentId?: string
  name: string
  description?: string
  unitPrice: number
  quantity: number
}

export type QuoteDetail = {
  id: string
  name: string
  clientName?: string
  clientEmail?: string
  items: QuoteDetailItem[]
}

export async function getEquipmentOptions(): Promise<{
  success: boolean
  data: EquipmentOption[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'equipment',
      sort: 'name',
      limit: 1000,
      depth: 0,
    })
    return {
      success: true,
      data: (result.docs as any[]).map((item) => ({
        id: String(item.id),
        name: String(item.name || ''),
        description: item.description ? String(item.description) : undefined,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      })),
    }
  } catch (error) {
    console.error('Failed to fetch equipment options:', error)
    return { success: false, data: [], error: String(error) }
  }
}

export type QuoteListItem = {
  id: string
  name: string
  clientName?: string
  clientEmail?: string
  createdAt: string
  updatedAt: string
}

export async function getQuotes(): Promise<{
  success: boolean
  data: QuoteListItem[]
  error?: string
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'quotes',
      sort: '-createdAt',
      limit: 1000,
      depth: 0,
    })
    return {
      success: true,
      data: (result.docs as any[]).map((doc) => ({
        id: String(doc.id),
        name: String(doc.name || ''),
        clientName: doc.clientName ? String(doc.clientName) : undefined,
        clientEmail: doc.clientEmail ? String(doc.clientEmail) : undefined,
        createdAt: String(doc.createdAt || ''),
        updatedAt: String(doc.updatedAt || ''),
      })),
    }
  } catch (error) {
    console.error('Failed to fetch quotes:', error)
    return { success: false, data: [], error: String(error) }
  }
}

export async function deleteQuote(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'quotes', id })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete quote:', error)
    return { success: false, error: 'Failed to delete quote.' }
  }
}

export async function deleteQuotes(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }
    const payload = await getPayload({ config })
    await Promise.all(ids.map((id) => payload.delete({ collection: 'quotes', id })))
    return { success: true }
  } catch (error) {
    console.error('Failed to delete quotes:', error)
    return { success: false, error: 'Failed to delete quotes.' }
  }
}

export async function createQuote(input: CreateQuoteInput): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const payload = await getPayload({ config })

    const doc = await payload.create({
      collection: 'quotes',
      data: {
        name: input.name,
        clientName: input.clientName ?? null,
        clientEmail: input.clientEmail ?? null,
        items: input.items.map((item) => ({
          equipmentId: item.equipmentId ?? null,
          name: item.name,
          description: item.description ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      },
      depth: 0,
    })

    return { success: true, id: String(doc.id) }
  } catch (error) {
    console.error('Failed to create quote:', error)
    return { success: false, error: 'Failed to save quote.' }
  }
}

export async function getQuoteById(id: string): Promise<{
  success: boolean
  data?: QuoteDetail
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const payload = await getPayload({ config })
    const doc = await payload.findByID({
      collection: 'quotes',
      id,
      depth: 0,
    })

    const items = Array.isArray((doc as any).items) ? (doc as any).items : []

    return {
      success: true,
      data: {
        id: String((doc as any).id),
        name: String((doc as any).name || ''),
        clientName: (doc as any).clientName ? String((doc as any).clientName) : undefined,
        clientEmail: (doc as any).clientEmail ? String((doc as any).clientEmail) : undefined,
        items: items.map((item: any) => ({
          equipmentId: item.equipmentId
            ? typeof item.equipmentId === 'string'
              ? item.equipmentId
              : String(item.equipmentId.id)
            : undefined,
          name: String(item.name || ''),
          description: item.description ? String(item.description) : undefined,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        })),
      },
    }
  } catch (error) {
    console.error('Failed to fetch quote by id:', error)
    return { success: false, error: 'Failed to load quote.' }
  }
}

export async function updateQuote(
  id: string,
  input: CreateQuoteInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const payload = await getPayload({ config })

    await payload.update({
      collection: 'quotes',
      id,
      data: {
        name: input.name,
        clientName: input.clientName ?? null,
        clientEmail: input.clientEmail ?? null,
        items: input.items.map((item) => ({
          equipmentId: item.equipmentId ?? null,
          name: item.name,
          description: item.description ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      },
      depth: 0,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update quote:', error)
    return { success: false, error: 'Failed to update quote.' }
  }
}
