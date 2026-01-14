import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { mealCategories } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('admin')
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const params = await context.params
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    await db.delete(mealCategories).where(eq(mealCategories.id, id))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete meal category error:', error)
    return NextResponse.json({ error: 'Erro ao excluir categoria de refeição' }, { status: 500 })
  }
}
