import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { getContainer } from '@/lib/container'
import { readInput } from '@/lib/http/read-input'
import { parsePlanFields } from '@/lib/validation/meal-plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAN_BODY_MAX_BYTES = 256 * 1024

type Params = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Plano alimentar não encontrado' }, { status: 404 })

export async function GET(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const mealPlan = await c.repos.mealPlans.get(id)
    if (!mealPlan) return notFound()

    return NextResponse.json({ mealPlan })
  } catch (error) {
    c.log.error('admin.meal_plans.get_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao buscar plano alimentar' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const body = await readInput(request, PLAN_BODY_MAX_BYTES)

    if (!body.title || !body.start_date) {
      return NextResponse.json({ error: 'Campos obrigatórios: title, start_date' }, { status: 400 })
    }
    const fields = parsePlanFields(body)
    if (!fields.ok) return NextResponse.json({ error: fields.error }, { status: 400 })

    let patientId: string | undefined
    if (body.patient_id !== undefined && body.patient_id !== null && body.patient_id !== '') {
      if (typeof body.patient_id !== 'string') {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }
      patientId = body.patient_id
    }

    const result = await c.repos.mealPlans.update(id, { ...fields.value, ...(patientId ? { patientId } : {}) }, new Date())
    if (result === 'not_found') return notFound()
    if (result === 'patient_not_found') {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ mealPlan: result })
  } catch (error) {
    c.log.error('admin.meal_plans.update_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao atualizar plano alimentar' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const c = getContainer()
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const existing = await c.repos.mealPlans.get(id)
    if (!existing) return notFound()

    const result = await c.repos.mealPlans.delete(id)
    if (result === 'not_found') return notFound()
    if (result === 'in_use') {
      return NextResponse.json(
        { error: 'Plano gerado a partir de um pagamento não pode ser excluído' },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, message: `Plano "${existing.title}" deletado com sucesso` })
  } catch (error) {
    c.log.error('admin.meal_plans.delete_error', { message: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao deletar plano alimentar' }, { status: 500 })
  }
}
