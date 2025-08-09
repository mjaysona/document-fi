import { Breadcrumb } from 'node_modules/@payloadcms/plugin-nested-docs/dist/types'
import type { CollectionSlug, PayloadRequest } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  pages: '',
}

type Props = {
  data: Record<string, unknown>
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = async ({ data, collection, slug, req }: Props) => {
  const breadcrumbs: Breadcrumb[] = (data?.breadcrumbs as Breadcrumb[]) || []
  const slugUrl = breadcrumbs?.length ? breadcrumbs[breadcrumbs.length - 1]?.url : ''
  const path = `${collectionPrefixMap[collection]}${slugUrl || `/${slug}`}`

  const params = {
    slug,
    collection,
    path,
  }

  const host = req.headers.get('host')
  const encodedParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    encodedParams.append(key, value?.toString() || '')
  })

  const isProduction =
    process.env.NODE_ENV === 'production' || Boolean(process.env.PROJECT_PRODUCTION_URL)
  const protocol = isProduction ? 'https:' : req.protocol

  const url = `${protocol}//${host}/next/preview?${encodedParams.toString()}`

  return url
}
