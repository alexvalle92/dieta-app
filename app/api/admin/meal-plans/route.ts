import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealPlans, patients } from '@/shared/schema'
import { eq, desc } from 'drizzle-orm'
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

    const mealPlansList = await db
      .select({
        id: mealPlans.id,
        patientId: mealPlans.patientId,
        title: mealPlans.title,
        description: mealPlans.description,
        startDate: mealPlans.startDate,
        endDate: mealPlans.endDate,
        status: mealPlans.status,
        planData: mealPlans.planData,
        createdAt: mealPlans.createdAt,
        updatedAt: mealPlans.updatedAt,
        patient: {
          id: patients.id,
          name: patients.name,
          email: patients.email,
          cpf: patients.cpf,
        },
      })
      .from(mealPlans)
      .leftJoin(patients, eq(mealPlans.patientId, patients.id))
      .orderBy(desc(mealPlans.createdAt))

    let filteredPlans = mealPlansList

    if (search) {
      filteredPlans = mealPlansList.filter((plan) => {
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

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patient_id))
      .limit(1)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    const [mealPlan] = await db
      .insert(mealPlans)
      .values({
        patientId: patient_id,
        title,
        description: description || null,
        startDate: start_date,
        endDate: end_date || null,
        status: status || 'active',
        planData: plan_data,
      })
      .returning()

    const [mealPlanWithPatient] = await db
      .select({
        id: mealPlans.id,
        patientId: mealPlans.patientId,
        title: mealPlans.title,
        description: mealPlans.description,
        startDate: mealPlans.startDate,
        endDate: mealPlans.endDate,
        status: mealPlans.status,
        planData: mealPlans.planData,
        createdAt: mealPlans.createdAt,
        updatedAt: mealPlans.updatedAt,
        patient: {
          id: patients.id,
          name: patients.name,
          email: patients.email,
          cpf: patients.cpf,
        },
      })
      .from(mealPlans)
      .leftJoin(patients, eq(mealPlans.patientId, patients.id))
      .where(eq(mealPlans.id, mealPlan.id))
      .limit(1)

    return NextResponse.json({ mealPlan: mealPlanWithPatient }, { status: 201 })
  } catch (error) {
    console.error('Meal plan creation error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar plano alimentar' },
      { status: 500 }
    )
  }
}
