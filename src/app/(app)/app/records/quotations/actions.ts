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
  images?: { id: string; url: string }[]
}

export type CreateQuoteItemInput = {
  equipmentId?: string
  name: string
  description?: string
  unitPrice: number
  quantity: number
  images?: string[]
}

export type CreateQuoteInput = {
  name: string
  clientName?: string
  clientEmail?: string
  date?: string
  logoId?: string
  items: CreateQuoteItemInput[]
}

export type QuoteDetailItem = {
  equipmentId?: string
  name: string
  description?: string
  unitPrice: number
  quantity: number
  images?: { id: string; url: string }[]
}

export type QuoteDetail = {
  id: string
  name: string
  clientName?: string
  clientEmail?: string
  date?: string
  logoId?: string
  logoUrl?: string
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
      depth: 1,
    })
    return {
      success: true,
      data: (result.docs as any[]).map((item) => ({
        id: String(item.id),
        name: String(item.name || ''),
        description: item.description ? String(item.description) : undefined,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        images: Array.isArray(item.images)
          ? (item.images as any[])
              .map((img: any) => {
                if (!img) return null
                const id = typeof img === 'string' ? img : String(img.id)
                const url = typeof img === 'object' && img.url ? String(img.url) : ''
                if (!id || !url) return null
                return { id, url }
              })
              .filter(Boolean as unknown as (v: any) => v is { id: string; url: string })
          : [],
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
        date: input.date ?? null,
        logo: input.logoId ?? null,
        items: input.items.map((item) => ({
          equipmentId: item.equipmentId ?? null,
          name: item.name,
          description: item.description ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          images: item.images ?? [],
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
      depth: 1,
    })

    const items = Array.isArray((doc as any).items) ? (doc as any).items : []
    const rawLogo = (doc as any).logo

    const imageIdSet = new Set<string>()

    const collectImageIds = (images: any) => {
      if (!Array.isArray(images)) return
      images.forEach((img) => {
        if (!img) return
        if (typeof img === 'string') {
          imageIdSet.add(img)
          return
        }
        if (img.id) imageIdSet.add(String(img.id))
      })
    }

    items.forEach((item: any) => {
      collectImageIds(item.images)
      if (item.equipmentId && typeof item.equipmentId === 'object') {
        collectImageIds(item.equipmentId.images)
      }
    })

    const imageIds = Array.from(imageIdSet)
    const mediaUrlById = new Map<string, string>()

    if (imageIds.length > 0) {
      const mediaResult = await payload.find({
        collection: 'equipment-media',
        where: {
          id: {
            in: imageIds,
          },
        },
        limit: imageIds.length,
        depth: 0,
      })

      ;(mediaResult.docs as any[]).forEach((mediaDoc) => {
        const mediaId = String(mediaDoc.id)
        const mediaUrl = mediaDoc.url ? String(mediaDoc.url) : ''
        if (mediaUrl) mediaUrlById.set(mediaId, mediaUrl)
      })
    }

    const resolveImages = (images: any): Array<{ id: string; url: string }> => {
      if (!Array.isArray(images)) return []

      return images
        .map((img) => {
          if (!img) return null

          if (typeof img === 'string') {
            const url = mediaUrlById.get(img)
            if (!url) return null
            return { id: img, url }
          }

          const imageId = img.id ? String(img.id) : ''
          const imageUrl = img.url
            ? String(img.url)
            : imageId
              ? mediaUrlById.get(imageId) || ''
              : ''

          if (!imageId || !imageUrl) return null
          return { id: imageId, url: imageUrl }
        })
        .filter(Boolean) as Array<{ id: string; url: string }>
    }

    let logoId: string | undefined
    let logoUrl: string | undefined
    if (rawLogo) {
      if (typeof rawLogo === 'string') {
        logoId = rawLogo
        try {
          const logoDoc = await payload.findByID({ collection: 'media', id: rawLogo, depth: 0 })
          logoUrl = (logoDoc as any)?.url ? String((logoDoc as any).url) : undefined
        } catch {
          logoUrl = undefined
        }
      } else {
        logoId = String(rawLogo.id)
        if (rawLogo.url) {
          logoUrl = String(rawLogo.url)
        } else {
          try {
            const logoDoc = await payload.findByID({ collection: 'media', id: logoId, depth: 0 })
            logoUrl = (logoDoc as any)?.url ? String((logoDoc as any).url) : undefined
          } catch {
            logoUrl = undefined
          }
        }
      }
    }

    return {
      success: true,
      data: {
        id: String((doc as any).id),
        name: String((doc as any).name || ''),
        clientName: (doc as any).clientName ? String((doc as any).clientName) : undefined,
        clientEmail: (doc as any).clientEmail ? String((doc as any).clientEmail) : undefined,
        date: (doc as any).date ? String((doc as any).date) : undefined,
        logoId,
        logoUrl,
        items: items.map((item: any) => ({
          equipmentId:
            item.equipmentId && typeof item.equipmentId === 'object'
              ? String(item.equipmentId.id)
              : item.equipmentId
                ? String(item.equipmentId)
                : undefined,
          name: String(item.name || ''),
          description: item.description ? String(item.description) : undefined,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          images:
            resolveImages(item.images).length > 0
              ? resolveImages(item.images)
              : resolveImages(
                  item.equipmentId && typeof item.equipmentId === 'object'
                    ? item.equipmentId.images
                    : undefined,
                ),
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
        date: input.date ?? null,
        logo: input.logoId ?? null,
        items: input.items.map((item) => ({
          equipmentId: item.equipmentId ?? null,
          name: item.name,
          description: item.description ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          images: item.images ?? [],
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

export async function uploadQuoteLogo(formData: FormData): Promise<{
  success: boolean
  id?: string
  url?: string
  error?: string
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const payload = await getPayload({ config })

    const media = await payload.create({
      collection: 'media',
      data: {},
      file: {
        data: buffer,
        name: file.name,
        mimetype: file.type || 'image/jpeg',
        size: buffer.length,
      },
    })

    const url = (media as any).url ? String((media as any).url) : undefined
    return { success: true, id: String(media.id), url }
  } catch (error) {
    console.error('Failed to upload logo:', error)
    return { success: false, error: 'Failed to upload logo.' }
  }
}
