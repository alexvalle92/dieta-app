import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealPlans, patients } from '@/shared/schema'
import { eq } from 'drizzle-orm'
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

    const [mealPlan] = await db
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
      .where(eq(mealPlans.id, id))
      .limit(1)

    if (!mealPlan) {
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

    const [existingPlan] = await db
      .select({ id: mealPlans.id })
      .from(mealPlans)
      .where(eq(mealPlans.id, id))
      .limit(1)

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    if (patient_id) {
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
    }

    const updateData: Record<string, unknown> = {
      title,
      startDate: start_date,
    }

    if (patient_id !== undefined) updateData.patientId = patient_id
    if (description !== undefined) updateData.description = description || null
    if (end_date !== undefined) updateData.endDate = end_date || null
    if (status !== undefined) updateData.status = status
    if (plan_data !== undefined) updateData.planData = plan_data

    await db
      .update(mealPlans)
      .set(updateData)
      .where(eq(mealPlans.id, id))

    const [mealPlan] = await db
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
      .where(eq(mealPlans.id, id))
      .limit(1)

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

    const [existingPlan] = await db
      .select({ id: mealPlans.id, title: mealPlans.title })
      .from(mealPlans)
      .where(eq(mealPlans.id, id))
      .limit(1)

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Plano alimentar não encontrado' },
        { status: 404 }
      )
    }

    await db
      .delete(mealPlans)
      .where(eq(mealPlans.id, id))

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
