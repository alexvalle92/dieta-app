import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { admins } from '@/shared/schema'

export async function GET() {
  try {
    const adminList = await db
      .select({ id: admins.id })
      .from(admins)
      .limit(1)

    return NextResponse.json({ hasAdmin: adminList.length > 0 })
  } catch (error) {
    console.error('Error in setup check:', error)
    return NextResponse.json({ hasAdmin: false, error: 'Internal server error' }, { status: 500 })
  }
}
