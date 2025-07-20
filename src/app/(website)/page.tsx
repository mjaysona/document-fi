import { Header } from '../(app)/components/Header'
import { Container } from '@mantine/core'
import { auth } from '@/app/(app)/lib/auth'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await getHeaders(),
  })

  if (session) {
    redirect('/app')
  }

  return (
    <Container size="xl">
      <Header />
      <main>
        <h1>Homepage Example</h1>
        <ul></ul>
      </main>
    </Container>
  )
}
