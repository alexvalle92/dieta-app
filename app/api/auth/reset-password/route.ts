import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { hashSHA512, compareSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
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

    const [patient] = await db
      .select({ password: patients.password })
      .from(patients)
      .where(eq(patients.id, session.userId))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    if (!patient.password) {
      return NextResponse.json(
        { error: 'Senha não cadastrada. Entre em contato com o suporte.' },
        { status: 400 }
      )
    }

    const passwordMatch = compareSHA512(currentPassword, patient.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    const hashedPassword = hashSHA512(newPassword)

    await db
      .update(patients)
      .set({ password: hashedPassword })
      .where(eq(patients.id, session.userId))

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
