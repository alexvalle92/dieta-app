import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const supabase = supabaseAdmin

    const { data: mealPlans, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching meal plans:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar planos alimentares' },
        { status: 500 }
      )
    }

    let filteredPlans = mealPlans || []

    if (search) {
      filteredPlans = filteredPlans.filter((plan: any) => {
        const titleMatch = plan.title?.toLowerCase().includes(search)
        const patientNameMatch = plan.patient?.name?.toLowerCase().includes(search)
        return titleMatch || patientNameMatch
      })
    }

    return NextResponse.json({ mealPlans: filteredPlans })
  } catch (error) {
    console.error('Meal plans fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos alimentares' },
      { status: 500 }
    )
  }
}

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
    const { patient_id, title, description, start_date, end_date, status, plan_data } = body

    if (!patient_id || !title || !start_date) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patient_id, title, start_date' },
        { status: 400 }
      )
    }

    if (!plan_data || typeof plan_data !== 'object') {
      return NextResponse.json(
        { error: 'plan_data deve ser um objeto JSON válido' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

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

    const { data: mealPlan, error } = await supabase
      .from('meal_plans')
      .insert({
        patient_id,
        title,
        description: description || null,
        start_date,
        end_date: end_date || null,
        status: status || 'active',
        plan_data,
      })
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
      console.error('Error creating meal plan:', error)
      return NextResponse.json(
        { error: 'Erro ao criar plano alimentar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ mealPlan }, { status: 201 })
  } catch (error) {
    console.error('Meal plan creation error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar plano alimentar' },
      { status: 500 }
    )
  }
}
