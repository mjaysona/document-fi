import { PayloadRequest } from 'payload'
import { FEATURES } from '../Features/features.enum'

export const hasMultiTenancyFeature = async (req: PayloadRequest): Promise<boolean> => {
  const features = await req?.payload.find({
    collection: 'features',
    where: {
      and: [
        {
          name: {
            equals: FEATURES.MULTI_TENANCY,
          },
        },
        {
          isEnabled: {
            equals: true,
          },
        },
      ],
    },
  })

  return Boolean(features?.docs?.length)
}
