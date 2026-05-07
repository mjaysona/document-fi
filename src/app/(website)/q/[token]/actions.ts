'use server'

import { getPayload } from 'payload'
import config from '~/payload.config'
import type { QuoteDetail } from '@/app/(app)/app/records/quotations/actions'

export async function getPublicQuote(token: string): Promise<{
  success: boolean
  data?: QuoteDetail
  error?: string
}> {
  try {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'quotes',
      where: { shareToken: { equals: token } },
      limit: 1,
      depth: 1,
    })

    const doc = result.docs[0]
    if (!doc) return { success: false, error: 'Quote not found.' }

    // Lazy expiry check
    if (!(doc as any).isShared) return { success: false, error: 'Quote not found.' }
    const expiresAt = (doc as any).shareExpiresAt
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { success: false, error: 'This share link has expired.' }
    }

    const items = Array.isArray((doc as any).items) ? (doc as any).items : []
    const rawLogo = (doc as any).logo

    const imageIdSet = new Set<string>()
    const collectImageIds = (images: any) => {
      if (!Array.isArray(images)) return
      images.forEach((img) => {
        if (!img) return
        if (typeof img === 'string') imageIdSet.add(img)
        else if (img.id) imageIdSet.add(String(img.id))
      })
    }

    items.forEach((item: any) => {
      collectImageIds(item.images)
    })

    // Fetch equipment images as fallback
    const equipmentIds = items
      .map((item: any) =>
        item.equipmentId && typeof item.equipmentId === 'string' ? item.equipmentId : null,
      )
      .filter(Boolean) as string[]

    const equipmentImagesById = new Map<string, Array<{ id: string; url: string }>>()
    const mediaUrlById = new Map<string, string>()

    if (equipmentIds.length > 0) {
      const equipmentResult = await payload.find({
        collection: 'equipment',
        where: { id: { in: equipmentIds } },
        limit: equipmentIds.length,
        depth: 1,
      })
      ;(equipmentResult.docs as any[]).forEach((equip) => {
        const equipId = String(equip.id)
        const images = Array.isArray(equip.images)
          ? (equip.images as any[])
              .map((img: any) => {
                if (!img) return null
                const id = typeof img === 'string' ? img : String(img.id)
                const url = typeof img === 'object' && img.url ? String(img.url) : ''
                if (!id || !url) return null
                mediaUrlById.set(id, url)
                return { id, url }
              })
              .filter(Boolean as unknown as (v: any) => v is { id: string; url: string })
          : []
        equipmentImagesById.set(equipId, images)
      })
    }

    const imageIds = Array.from(imageIdSet)
    if (imageIds.length > 0) {
      const mediaResult = await payload.find({
        collection: 'equipment-media',
        where: { id: { in: imageIds } },
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

    let logoUrl: string | undefined
    if (rawLogo) {
      if (typeof rawLogo === 'object' && rawLogo.url) {
        logoUrl = String(rawLogo.url)
      } else {
        const logoId = typeof rawLogo === 'string' ? rawLogo : String(rawLogo.id)
        try {
          const logoDoc = await payload.findByID({ collection: 'media', id: logoId, depth: 0 })
          logoUrl = (logoDoc as any)?.url ? String((logoDoc as any).url) : undefined
        } catch {
          logoUrl = undefined
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
        logoUrl,
        items: items.map((item: any) => {
          const equipId =
            item.equipmentId && typeof item.equipmentId === 'string' ? item.equipmentId : null
          const itemImages = resolveImages(item.images)
          return {
            equipmentId: equipId ?? undefined,
            name: String(item.name || ''),
            description: item.description ? String(item.description) : undefined,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            images:
              itemImages.length > 0
                ? itemImages
                : equipId
                  ? (equipmentImagesById.get(equipId) ?? [])
                  : [],
          }
        }),
      },
    }
  } catch (error) {
    console.error('Failed to fetch public quote:', error)
    return { success: false, error: 'Quote not found.' }
  }
}
