import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Supabase stores the session cookie as sb-<project-ref>-auth-token
  // Check for any cookie matching that pattern
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
