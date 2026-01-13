import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq, or, ilike, desc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let patientsList;
    
    if (search) {
      patientsList = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          cpf: patients.cpf,
          phone: patients.phone,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(
          or(
            ilike(patients.name, `%${search}%`),
            ilike(patients.email, `%${search}%`),
            ilike(patients.cpf, `%${search}%`)
          )
        )
        .orderBy(desc(patients.createdAt))
    } else {
      patientsList = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          cpf: patients.cpf,
          phone: patients.phone,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .orderBy(desc(patients.createdAt))
    }

    return NextResponse.json({ patients: patientsList })
  } catch (error) {
    console.error('Error in GET /api/admin/patients:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, cpf, phone, password } = body

    if (!name || !email || !cpf || !password) {
      return NextResponse.json(
        { error: 'Nome, email, CPF e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    const existingPatient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(or(eq(patients.cpf, cpfNumbers), eq(patients.email, email)))
      .limit(1)

    if (existingPatient.length > 0) {
      return NextResponse.json(
        { error: 'CPF ou email já cadastrado' },
        { status: 409 }
      )
    }

    const hashedPassword = hashSHA512(password)

    const [newPatient] = await db
      .insert(patients)
      .values({
        name,
        email,
        cpf: cpfNumbers,
        phone: phone?.replace(/\D/g, '') || '',
        password: hashedPassword,
      })
      .returning({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        phone: patients.phone,
        createdAt: patients.createdAt,
      })

    return NextResponse.json(
      { 
        success: true,
        patient: newPatient 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/admin/patients:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
