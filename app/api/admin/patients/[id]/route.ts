import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

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

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('id, name, email, cpf, phone, created_at, quiz_responses')
      .eq('id', id)
      .single()

    if (error || !patient) {
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

    const { data: updatedPatient, error } = await supabaseAdmin
      .from('patients')
      .update({
        name,
        email,
        phone: phone?.replace(/\D/g, '') || null,
      })
      .eq('id', id)
      .select('id, name, email, cpf, phone, created_at')
      .single()

    if (error) {
      console.error('Error updating patient:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar paciente' },
        { status: 500 }
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

    const { error } = await supabaseAdmin
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting patient:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar paciente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/patients/[id]:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
