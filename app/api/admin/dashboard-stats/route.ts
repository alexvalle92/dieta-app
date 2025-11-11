import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth('admin')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      )
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    const [
      patientsResult,
      plansResult,
      recipesResult,
      newPatientsThisMonthResult,
      newPatientsLastMonthResult
    ] = await Promise.all([
      supabaseAdmin
        .from('patients')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('meal_plans')
        .select('id, status')
        .eq('status', 'active'),
      supabaseAdmin
        .from('recipes')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth),
      supabaseAdmin
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstDayOfLastMonth)
        .lte('created_at', lastDayOfLastMonth)
    ])

    const totalPatients = patientsResult.count || 0
    const activePlans = plansResult.data?.length || 0
    const totalRecipes = recipesResult.count || 0
    const newPatientsThisMonth = newPatientsThisMonthResult.count || 0
    const newPatientsLastMonth = newPatientsLastMonthResult.count || 0

    let growthPercentage = 0
    if (newPatientsLastMonth > 0) {
      growthPercentage = Math.round(
        ((newPatientsThisMonth - newPatientsLastMonth) / newPatientsLastMonth) * 100
      )
    } else if (newPatientsThisMonth > 0) {
      growthPercentage = 100
    }

    return NextResponse.json({
      stats: {
        totalPacientes: totalPatients,
        planosAtivos: activePlans,
        receitasCadastradas: totalRecipes,
        novosEsseMes: newPatientsThisMonth,
        crescimento: growthPercentage
      }
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
