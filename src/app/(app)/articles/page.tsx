import React, { Fragment } from 'react'
import { Gutter } from '../components/Gutter'
import { getPayload } from 'payload'
import config from '@payload-config'

// eslint-disable-next-line no-restricted-exports
export default async function Page() {
  const payload = await getPayload({ config })
  const data = await payload.find({
    collection: 'posts',
    where: {
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
      ],
    },
  })
  const articles = data.docs || []

  console.log('Articles:', articles)

  if (!articles.length) {
    return <Gutter>No articles found</Gutter>
  }

  return (
    <Fragment>
      <Gutter>
        <h1>Articles</h1>
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <a href={`/articles/${article.slug}`}>{article.title}</a>
            </li>
          ))}
        </ul>
      </Gutter>
    </Fragment>
  )
}
