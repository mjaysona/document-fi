import { Where } from 'payload'
import { stringify as stringifyQuery } from 'qs-esm'

export const stringify = (query: Where): string => {
  const stringifiedQuery = stringifyQuery(
    {
      where: query,
    },
    { addQueryPrefix: true },
  )

  return stringifiedQuery
}
