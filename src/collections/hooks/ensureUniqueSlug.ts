import { hasSuperAdminRole } from '@/utilities/getRole'
import { FieldHook, ValidationError } from 'payload'

export const ensureUniqueSlug: FieldHook = async ({
  collection,
  data,
  originalDoc,
  req,
  value,
}) => {
  const { slug: collectionSlug } = collection || { slug: '' }
  // if value is unchanged, skip validation
  if (originalDoc.slug === value && !collectionSlug) {
    return value
  }

  if (collectionSlug) {
    const duplicateItemOnCollection = await req.payload.find({
      collection: collectionSlug,
      where: {
        and: [
          {
            slug: {
              equals: value,
            },
          },
        ],
      },
    })

    if (duplicateItemOnCollection.docs.length > 0 && req.user) {
      throw new ValidationError({
        errors: [
          {
            path: 'slug',
            message: `"${collectionSlug.toUpperCase()}" with the slug ${value} already exists. Slug must be unique.`,
          },
        ],
      })
    }
  }

  return value
}
