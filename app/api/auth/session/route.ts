import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      userType: session.userType,
      email: session.email,
      name: session.name,
    },
  })
}
