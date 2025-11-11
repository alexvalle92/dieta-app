import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('patient')
    
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
      .select('*')
      .eq('id', id)
      .eq('patient_id', session.userId)
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
