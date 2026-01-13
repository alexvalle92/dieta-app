import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { admins } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { hashSHA512, compareSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const [admin] = await db
      .select({ password: admins.password })
      .from(admins)
      .where(eq(admins.id, session.userId))
      .limit(1)

    if (!admin) {
      return NextResponse.json(
        { error: 'Administrador não encontrado' },
        { status: 404 }
      )
    }

    if (!admin.password) {
      return NextResponse.json(
        { error: 'Senha não cadastrada. Entre em contato com o suporte.' },
        { status: 400 }
      )
    }

    const passwordMatch = compareSHA512(currentPassword, admin.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    const hashedPassword = hashSHA512(newPassword)

    await db
      .update(admins)
      .set({ password: hashedPassword })
      .where(eq(admins.id, session.userId))

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' })
  } catch (error) {
    console.error('Admin password change error:', error)
    return NextResponse.json(
      { error: 'Erro ao alterar senha' },
      { status: 500 }
    )
  }
}
