import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth('patient')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const patientId = session.userId

    const [plansResult, recipesResult] = await Promise.all([
      supabaseAdmin
        .from('meal_plans')
        .select('id, status, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('recipes')
        .select('id', { count: 'exact', head: true })
    ])

    if (plansResult.error) {
      console.error('Error fetching plans:', plansResult.error)
      return NextResponse.json(
        { error: 'Erro ao buscar planos' },
        { status: 500 }
      )
    }

    const allPlans = plansResult.data || []
    const activePlans = allPlans.filter(plan => plan.status === 'active')
    const recentPlans = allPlans.slice(0, 3)

    const lastUpdate = allPlans.length > 0 
      ? new Date(allPlans[0].created_at).toLocaleDateString('pt-BR')
      : 'Nenhum'

    return NextResponse.json({
      stats: {
        planosAtivos: activePlans.length,
        totalPlanos: allPlans.length,
        ultimaAtualizacao: lastUpdate,
        receitasDisponiveis: recipesResult.count || 0
      },
      recentPlans: recentPlans.map((plan: any) => ({
        id: plan.id,
        status: plan.status,
        created_at: plan.created_at
      }))
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
