import { Config } from 'payload'
import { createFirstTenantUser } from '../collections/utilities/createFirstTenantUser'

export const tenantUser: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  await createFirstTenantUser(payload)
}
