import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  
  return new TextEncoder().encode(secret)
}

async function getSessionFromRequest(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('nutriplan_session')
    
    if (!sessionCookie) {
      return null
    }
    
    const verified = await jwtVerify(sessionCookie.value, getSecretKey())
    const payload = verified.payload
    
    if (!payload.userId || !payload.userType) {
      return null
    }
    
    return {
      userId: payload.userId as string,
      userType: payload.userType as 'patient' | 'admin',
    }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/cliente') && 
      !pathname.startsWith('/cliente/login') && 
      !pathname.startsWith('/cliente/esqueci-senha') && 
      !pathname.startsWith('/cliente/redefinir-senha')) {
    const session = await getSessionFromRequest(request)
    
    if (!session || session.userType !== 'patient') {
      return NextResponse.redirect(new URL('/cliente/login', request.url))
    }
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = await getSessionFromRequest(request)
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/cliente/:path*', '/admin/:path*'],
}
