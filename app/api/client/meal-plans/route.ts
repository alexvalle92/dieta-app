import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const supabase = supabaseAdmin

    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('patient_id', session.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching meal plans:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar planos alimentares' },
        { status: 500 }
      )
    }

    return NextResponse.json({ mealPlans: mealPlans || [] })
  } catch (error) {
    console.error('Meal plans fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos alimentares' },
      { status: 500 }
    )
  }
}
