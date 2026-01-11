import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, password } = body

    if (!cpf || !password) {
      return NextResponse.json(
        { error: 'CPF e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const [patient] = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        password: patients.password,
      })
      .from(patients)
      .where(eq(patients.cpf, cpf))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'CPF ou senha inválidos' },
        { status: 401 }
      )
    }

    if (!patient.password) {
      return NextResponse.json(
        { error: 'Senha não cadastrada. Entre em contato com o suporte.' },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, patient.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'CPF ou senha inválidos' },
        { status: 401 }
      )
    }

    await createSession({
      userId: patient.id,
      userType: 'patient',
      email: patient.email,
      name: patient.name,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    )
  }
}
