import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache, Fragment } from 'react'

import type { Page as PageType } from '@payload-types'

import config from '@payload-config'
import RichText from '@/app/(app)/components/RichText'
import { LivePreviewListener } from '@/app/(app)/components/LivePreviewListener'
import { Header } from '@/app/(app)/components/LandingPageHeader'
const queryPageBySlug = async ({ slug, slugUrl }: { slug: string; slugUrl: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    where: {
      and: [
        ...(draft ? [] : [{ allowPublicRead: { equals: true } }]),
        {
          slug: {
            equals: slug,
          },
        },
        {
          'breadcrumbs.url': {
            equals: slugUrl,
          },
        },
      ],
    },
  })

  return result.docs?.[0] || null
}

interface PageParams {
  params: Promise<{
    slug?: string[]
  }>
}

// eslint-disable-next-line no-restricted-exports
export default async function Page({ params: paramsPromise }: PageParams) {
  const { isEnabled: draft } = await draftMode()
  const params = await paramsPromise
  const slug = params?.slug?.length ? params?.slug[params?.slug.length - 1] : 'home'
  const removedRootSlug = params?.slug?.slice(1)
  const slugUrl = '/' + removedRootSlug?.join('/')
  const page: null | PageType = await queryPageBySlug({
    slug,
    slugUrl,
  })

  // Remove this code once your website is seeded
  // if (!page && slug === 'home') {
  //   page = homeStatic
  // }

  if (page === null) {
    return notFound()
  }

  return (
    <Fragment>
      {draft && <LivePreviewListener />}
      <Header />
      <main>
        <h1>{page?.title}</h1>
        {/* <RichText content={page?.richText} /> */}
      </main>
    </Fragment>
  )
}
