import { readJsonBody } from "./read-json"

/** Corpo máximo das rotas de autenticação e de cadastro: 4 KB. */
export const INPUT_MAX_BYTES = 4 * 1024

/**
 * Lê o corpo JSON como objeto. Corpo ilegível, grande demais ou que não é objeto vira `{}`: quem
 * chama valida os campos e responde com a mensagem de "campos obrigatórios" da própria rota.
 */
export async function readInput(req: Request, maxBytes: number = INPUT_MAX_BYTES): Promise<Record<string, unknown>> {
  const body = await readJsonBody(req, maxBytes)
  if (!body.ok || typeof body.value !== "object" || body.value === null || Array.isArray(body.value)) return {}
  return body.value as Record<string, unknown>
}
