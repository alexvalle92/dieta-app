import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'
import { allowedMealItems } from '@/shared/schema'
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

    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })

    await db.delete(allowedMealItems).where(eq(allowedMealItems.id, id))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete allowed item error:', error)
    return NextResponse.json({ error: 'Erro ao excluir item permitido' }, { status: 500 })
  }
}
