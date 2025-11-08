import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      user: {
        userId: session.userId,
        userType: session.userType,
        email: session.email,
        name: session.name,
      }
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Erro ao obter sessão' },
      { status: 500 }
    )
  }
}
