import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients, passwordResetTokens } from '@/shared/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf } = body

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    const [patient] = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
      })
      .from(patients)
      .where(eq(patients.cpf, cpfNumbers))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'CPF não encontrado no sistema' },
        { status: 404 }
      )
    }

    const token = crypto.randomBytes(32).toString('hex')
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(and(
        eq(passwordResetTokens.patientId, patient.id),
        eq(passwordResetTokens.used, false)
      ))

    await db
      .insert(passwordResetTokens)
      .values({
        patientId: patient.id,
        token,
        expiresAt,
      })

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/cliente/redefinir-senha/${token}`

    return NextResponse.json({ 
      success: true, 
      message: 'Link de recuperação gerado com sucesso',
      resetLink,
      email: patient.email,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de recuperação' },
      { status: 500 }
    )
  }
}
