import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = supabaseAdmin

    const { data: mealPlan, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        patient:patients (
          id,
          name,
          email,
          cpf
        )
      `)
      .eq('id', id)
      .single()

    if (error || !mealPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mealPlan })
  } catch (error) {
    console.error('Meal plan fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar plano alimentar' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { patient_id, title, description, start_date, end_date, status, plan_data } = body

    if (!title || !start_date) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, start_date' },
        { status: 400 }
      )
    }

    if (plan_data && typeof plan_data !== 'object') {
      return NextResponse.json(
        { error: 'plan_data deve ser um objeto JSON válido' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    const { data: existingPlan, error: existingError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('id', id)
      .single()

    if (existingError || !existingPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    if (patient_id) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patient_id)
        .single()

      if (patientError || !patient) {
        return NextResponse.json(
          { error: 'Paciente não encontrado' },
          { status: 404 }
        )
      }
    }

    const updateData: any = {
      title,
      start_date,
    }

    if (patient_id !== undefined) updateData.patient_id = patient_id
    if (description !== undefined) updateData.description = description || null
    if (end_date !== undefined) updateData.end_date = end_date || null
    if (status !== undefined) updateData.status = status
    if (plan_data !== undefined) updateData.plan_data = plan_data

    const { data: mealPlan, error } = await supabase
      .from('meal_plans')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patient:patients (
          id,
          name,
          email,
          cpf
        )
      `)
      .single()

    if (error) {
      console.error('Error updating meal plan:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar plano alimentar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ mealPlan })
  } catch (error) {
    console.error('Meal plan update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar plano alimentar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = supabaseAdmin

    const { data: existingPlan, error: existingError } = await supabase
      .from('meal_plans')
      .select('id, title')
      .eq('id', id)
      .single()

    if (existingError || !existingPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meal plan:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar plano alimentar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Plano "${existingPlan.title}" deletado com sucesso` 
    })
  } catch (error) {
    console.error('Meal plan deletion error:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar plano alimentar' },
      { status: 500 }
    )
  }
}
