import { Config } from 'payload'
import { postData } from './data'

export const posts: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  try {
    const existingPosts = await payload.count({
      collection: 'posts',
    })

    if (existingPosts.totalDocs > 0) {
      console.info('Posts already exist, skipping...')
      return
    }

    await payload.create({
      collection: 'posts',
      data: postData,
    })

    console.info('"Sample post" created successfully.')
  } catch (error) {
    console.error('Error creating "Sample post": ', error)
  }
}
