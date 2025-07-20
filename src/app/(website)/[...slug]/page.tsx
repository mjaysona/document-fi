import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache, Fragment } from 'react'

import type { Page as PageType } from '@payload-types'

import config from '@payload-config'
import RichText from '@/app/(app)/components/RichText'
import { getSelectedTenantToken } from '@/utilities/getSelectedTenant'
import { LivePreviewListener } from '@/app/(app)/components/LivePreviewListener'
import { Header } from '@/app/(app)/components/LandingPageHeader'
const queryPageByTenantSlug = async ({
  slug,
  slugUrl,
  tenant,
}: {
  slug: string
  slugUrl: string
  tenant: string
}) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    where: {
      and: [
        ...(draft ? [] : [{ allowPublicRead: { equals: true } }]),
        ...(tenant
          ? [
              {
                'tenant.domain': {
                  equals: tenant,
                },
              },
            ]
          : []),
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
    tenant?: string
  }>
}

// eslint-disable-next-line no-restricted-exports
export default async function Page({ params: paramsPromise }: PageParams) {
  const selectedTenantId = await getSelectedTenantToken()
  const { isEnabled: draft } = await draftMode()
  const params = await paramsPromise

  let tenant

  if (selectedTenantId) {
    const payload = await getPayload({ config })
    const fullTenant = await payload.find({
      collection: 'tenants',
      where: {
        id: {
          equals: selectedTenantId,
        },
      },
    })
    tenant = fullTenant?.docs[0]?.domain
  } else {
    tenant = params?.tenant
  }

  const slug = params?.slug?.length ? params?.slug[params?.slug.length - 1] : 'home'
  // remove the first index not the last
  const removedRootSlug = params?.slug?.slice(1)
  const slugUrl = '/' + removedRootSlug?.join('/')
  const page: null | PageType = await queryPageByTenantSlug({
    slug,
    slugUrl,
    tenant: tenant || '',
  })

  // Remove this code once your website is seeded
  // if (!page && slug === 'home') {
  //   page = homeStatic
  // }

  if (page === null) {
    return notFound()
  }

  const { sections } = page

  return (
    <Fragment>
      {draft && <LivePreviewListener />}
      <Header />
      <main>
        <h1>{page?.title}</h1>
        <RichText content={page?.richText} />
      </main>
    </Fragment>
  )
}
