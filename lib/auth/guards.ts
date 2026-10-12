import { getSession } from "./session"
import type { Session } from "./session-token"

export type GuardResult = { ok: true; session: Session } | { ok: false; response: Response }

const json = (body: unknown, status: number) => Response.json(body, { status })

/**
 * Regra única das rotas protegidas (§6.6 do spec): sem sessão ou com sessão do tipo errado → 401;
 * paciente com a troca de senha pendente → 403 `password_change_required`, salvo nas rotas que
 * existem justamente para trocá-la.
 */
export function checkSession(
  session: Session | null,
  want: "admin" | "patient",
  opts: { allowPendingPasswordChange?: boolean } = {},
): GuardResult {
  if (!session || session.userType !== want) {
    return { ok: false, response: json({ error: "Acesso não autorizado" }, 401) }
  }
  if (want === "patient" && session.mustChangePassword && !opts.allowPendingPasswordChange) {
    return {
      ok: false,
      response: json({ error: "Troque sua senha para continuar", code: "password_change_required" }, 403),
    }
  }
  return { ok: true, session }
}

export async function requireAdmin(): Promise<GuardResult> {
  return checkSession(await getSession(), "admin")
}

export async function requirePatient(opts: { allowPendingPasswordChange?: boolean } = {}): Promise<GuardResult> {
  return checkSession(await getSession(), "patient", opts)
}
