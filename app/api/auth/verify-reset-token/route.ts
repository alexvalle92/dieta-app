import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients, passwordResetTokens } from '@/shared/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token e nova senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false)
      ))
      .limit(1)

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido ou já utilizado' },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(resetToken.expiresAt)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token expirado. Solicite um novo link de recuperação' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await db
      .update(patients)
      .set({ password: hashedPassword })
      .where(eq(patients.id, resetToken.patientId))

    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id))

    return NextResponse.json({ 
      success: true, 
      message: 'Senha redefinida com sucesso!' 
    })
  } catch (error) {
    console.error('Verify reset token error:', error)
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
