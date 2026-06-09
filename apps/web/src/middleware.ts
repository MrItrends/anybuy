import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/checkout', '/orders', '/sell/', '/profile', '/messages', '/track']
// Routes that need a session (admin + rider check actual DB roles inside)
const SESSION_PATHS   = ['/admin/', '/rider/dashboard', '/rider/onboarding']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isSeller = request.cookies.get('anybuy-seller')?.value === '1'
  const isRider  = request.cookies.get('anybuy-rider')?.value === '1'

  // ── Platform isolation ──────────────────────────────────────────────────────
  // Rider cookie → block access to buyer/seller/admin surfaces
  if (isRider && (path.startsWith('/seller/') || path.startsWith('/admin/'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/rider/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }
  // Seller cookie → block access to rider surfaces (except landing page)
  if (isSeller && (path.startsWith('/rider/dashboard') || path.startsWith('/rider/onboarding'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/seller/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // ── Home redirects ──────────────────────────────────────────────────────────
  // Riders visiting '/' → rider dashboard
  if (path === '/' && isRider) {
    const url = request.nextUrl.clone()
    url.pathname = '/rider/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }
  // Sellers visiting '/' → seller dashboard (unless ?buyer=1)
  if (path === '/' && isSeller && request.nextUrl.searchParams.get('buyer') !== '1') {
    const url = request.nextUrl.clone()
    url.pathname = '/seller/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // ── Session checks ──────────────────────────────────────────────────────────
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(
    c => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  // Protect buyer-side routes
  if (PROTECTED_PATHS.some(p => path.startsWith(p))) {
    if (!hasSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'required')
      return NextResponse.redirect(url)
    }
  }

  // Protect admin routes — redirect to admin login if no session
  if (!hasSession && path.startsWith('/admin/') && path !== '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Protect rider authenticated routes — redirect to rider landing if no session
  if (!hasSession && SESSION_PATHS.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/rider'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
