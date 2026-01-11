import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/server/db'
import { patients } from '@/shared/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const { id } = await params

    const [patient] = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        phone: patients.phone,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ patient })
  } catch (error) {
    console.error('Error in GET /api/admin/patients/[id]:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    const [updatedPatient] = await db
      .update(patients)
      .set({
        name,
        email,
        phone: phone?.replace(/\D/g, '') || '',
      })
      .where(eq(patients.id, id))
      .returning({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        phone: patients.phone,
        createdAt: patients.createdAt,
      })

    if (!updatedPatient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      patient: updatedPatient
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/patients/[id]:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session || session.userType !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      )
    }

    const { id } = await params

    await db
      .delete(patients)
      .where(eq(patients.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/patients/[id]:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
