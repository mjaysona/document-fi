import { hasSuperAdminRole } from '@/utilities/getRole'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'
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

  const incomingTenantID = typeof data?.tenant === 'object' ? data.tenant.id : data?.tenant
  const currentTenantID =
    typeof originalDoc?.tenant === 'object' ? originalDoc.tenant.id : originalDoc?.tenant
  const tenantIDToMatch = incomingTenantID || currentTenantID
  const isSuperAdmin = hasSuperAdminRole(req.user?.roles)

  if (collectionSlug) {
    const duplicateItemOnCollection = await req.payload.find({
      collection: collectionSlug,
      where: {
        and: [
          {
            'tenant.id': {
              equals: tenantIDToMatch,
            },
          },
          {
            slug: {
              equals: value,
            },
          },
        ],
      },
    })

    if (duplicateItemOnCollection.docs.length > 0 && req.user) {
      const tenantIDs = getUserTenantIDs(req.user)
      // if the user is an admin or has access to more than 1 tenant
      // provide a more specific error message
      if (isSuperAdmin || tenantIDs.length > 1) {
        const attemptedTenantChange = await req.payload.findByID({
          id: tenantIDToMatch,
          collection: 'tenants',
          depth: 1,
        })

        throw new ValidationError({
          errors: [
            {
              path: 'slug',
              message: `The "${attemptedTenantChange.name}" tenant already has "${collectionSlug.toUpperCase()}" with the slug "${value}". Slugs must be unique per tenant.`,
            },
          ],
        })
      }

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
