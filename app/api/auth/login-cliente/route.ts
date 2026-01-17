import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq, or } from 'drizzle-orm'
import { createSession } from '@/lib/auth'
import { compareSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, email, password } = body

    if ((!cpf && !email) || !password) {
      return NextResponse.json(
        { error: 'CPF ou e-mail e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const whereCondition = cpf 
      ? eq(patients.cpf, cpf)
      : eq(patients.email, email)

    const [patient] = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        password: patients.password,
      })
      .from(patients)
      .where(whereCondition)
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'CPF/E-mail ou senha inválidos' },
        { status: 401 }
      )
    }

    if (!patient.password) {
      return NextResponse.json(
        { error: 'Senha não cadastrada. Entre em contato com o suporte.' },
        { status: 401 }
      )
    }

    const passwordMatch = compareSHA512(password, patient.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'CPF/E-mail ou senha inválidos' },
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
