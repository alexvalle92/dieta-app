import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

export interface SessionData {
  userId: string
  userType: 'patient' | 'admin'
  email?: string
  name?: string
}

const SESSION_COOKIE_NAME = 'nutriplan_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate a strong secret with: openssl rand -base64 32'
    )
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security')
  }
  
  return new TextEncoder().encode(secret)
}

export async function createSession(data: SessionData) {
  const cookieStore = await cookies()
  
  const token = await new SignJWT(data as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
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
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
    }
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireAuth(userType?: 'patient' | 'admin') {
  const session = await getSession()
  
  if (!session) {
    return null
  }
  
  if (userType && session.userType !== userType) {
    return null
  }
  
  return session
}
