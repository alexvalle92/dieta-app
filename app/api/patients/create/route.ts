import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq, or } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { hashSHA512 } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, cpf, email, phone, password } = body

    if (!name || !cpf || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const [existingPatient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(or(eq(patients.cpf, cpfNumbers), eq(patients.email, email)))
      .limit(1)

    if (existingPatient) {
      return NextResponse.json(
        { error: 'CPF ou E-mail já cadastrado' },
        { status: 400 }
      )
    }

    const hashedPassword = hashSHA512(password)

    const [patient] = await db
      .insert(patients)
      .values({
        name,
        cpf: cpfNumbers,
        email,
        phone,
        password: hashedPassword,
      })
      .returning()

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        cpf: patient.cpf,
      },
    })
  } catch (error) {
    console.error('Create patient error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar paciente' },
      { status: 500 }
    )
  }
}
