import { Config } from 'payload'
import { createFeatures } from '../collections/utilities/createFeatures'

export const features: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  await createFeatures(payload)
}
