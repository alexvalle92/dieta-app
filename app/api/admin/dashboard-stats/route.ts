import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { growthPercentage } from '@/lib/services/growth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const totals = await c.repos.stats.admin({ monthStart, lastMonthStart })

    return NextResponse.json({
      stats: {
        totalPacientes: totals.totalPatients,
        planosAtivos: totals.activePlans,
        receitasCadastradas: totals.totalRecipes,
        novosEsseMes: totals.newThisMonth,
        crescimento: growthPercentage(totals.newThisMonth, totals.newLastMonth),
      },
    })
  } catch (error) {
    c.log.error('admin.dashboard_stats.error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
