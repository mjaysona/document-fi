import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache, Fragment } from 'react'
import config from '@payload-config'
import type { Post as PostType } from '@payload-types'
import classes from './index.module.scss'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

interface PageParams {
  params: Promise<{
    slug?: string
  }>
}

const queryPost = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        {
          _status: {
            equals: 'published',
          },
        },
      ],
    },
  })

  return result.docs?.[0] || null
})

export default async function Page({ params: paramsPromise }: PageParams) {
  const params = await paramsPromise
  const { slug = '' } = params
  const post: null | PostType = await queryPost({ slug })

  if (!post) {
    return notFound()
  }

  const { content } = post

  return (
    <Fragment>
      <main className={classes.page}>
        <h1>{post?.title}</h1>
        {content && <RichText data={content} />}
      </main>
    </Fragment>
  )
}
