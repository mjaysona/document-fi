import { Config } from 'payload'
import { createFirstRole } from '../collections/utilities/createFirstRole'

export const userRoles: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  await createFirstRole(payload)
}
