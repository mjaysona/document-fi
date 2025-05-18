import { FieldHook, ValidationError } from 'payload'

export const ensureUniqueTenant: FieldHook = async ({ originalDoc, req, value }) => {
  // if value is unchanged, skip validation
  if (originalDoc.slug) {
    return value
  }

  const findDuplicateTenantOnCollection = await req.payload.find({
    collection: 'tenants',
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

  if (findDuplicateTenantOnCollection.docs.length > 0 && req.user) {
    throw new ValidationError({
      errors: [
        {
          path: 'slug',
          message: `A tenant with the slug ${value} already exists. Slug must be unique.`,
        },
      ],
    })
  }

  return value
}
