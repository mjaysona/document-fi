import { Config } from 'payload'

export const user: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  const existingUser = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'super@payloadcms.com',
      },
    },
  })

  if (existingUser?.docs?.length) {
    console.info('"Super Admin" user already exists, skipping creation.')
    return
  }

  console.info('Creating the "Super Admin" user...')

  try {
    await payload.create({
      collection: 'users',
      data: {
        email: 'super@payloadcms.com',
        password: 'super',
        isSystemAccount: true,
      },
    })
    console.info('"Super Admin" user created successfully.')
  } catch (error) {
    console.error('Error creating the first user:', error)
  }
}
