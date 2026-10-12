import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { parsePlanFields } from '@/lib/validation/meal-plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Planos criados pelo admin podem ter o corpo bem maior que os de autenticação (refeições e observações). */
const PLAN_BODY_MAX_BYTES = 256 * 1024

export async function GET(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const search = new URL(request.url).searchParams.get('search')?.trim().toLowerCase() || ''
    const all = await c.repos.mealPlans.listAll()

    const mealPlans = search
      ? all.filter(
          (plan) =>
            plan.title?.toLowerCase().includes(search) || plan.patient?.name?.toLowerCase().includes(search),
        )
      : all

    return NextResponse.json({ mealPlans })
  } catch (error) {
    c.log.error('admin.meal_plans.list_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar planos alimentares' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const body = await readInput(request, PLAN_BODY_MAX_BYTES)
    if (!body.patient_id || !body.title || !body.start_date) {
      return NextResponse.json({ error: 'Campos obrigatórios: patient_id, title, start_date' }, { status: 400 })
    }

    const fields = parsePlanFields(body)
    if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 })
    if (typeof body.patient_id !== 'string') {
      return NextResponse.json({ error: 'Campos obrigatórios: patient_id, title, start_date' }, { status: 400 })
    }

    const mealPlan = await c.repos.mealPlans.create(
      {
        patientId: body.patient_id,
        title: fields.value.title ?? '',
        description: fields.value.description ?? null,
        startDate: fields.value.startDate ?? '',
        endDate: fields.value.endDate ?? null,
        status: fields.value.status ?? 'active',
        planData: fields.value.planData ?? {},
      },
      new Date(),
    )
    if (mealPlan === 'patient_not_found') {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ mealPlan }, { status: 201 })
  } catch (error) {
    c.log.error('admin.meal_plans.create_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao criar plano alimentar' }, { status: 500 })
  }
}
