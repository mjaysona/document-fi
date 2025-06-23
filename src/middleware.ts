import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const authRoutes = ['/login', '/create-account', '/recover-password', '/reset-password']

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)
  const { pathname } = request.nextUrl

  if (sessionCookie && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  if (!sessionCookie && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
