import { z } from "zod"

const required = z.string().min(1)

// `.url()` aceita "forms:5000" (esquema "forms:"), então exige http(s) explicitamente.
const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "precisa começar com http:// ou https://")

const booleanFlag = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true")

const envSchema = z.object({
  DATABASE_URL: required,
  SESSION_SECRET: z.string().min(32),
  /** Endereço público do PlanA; vai no link de redefinição de senha. */
  APP_URL: httpUrl,
  /** Endereço do v0-tami-forms (no Easypanel, a URL interna do serviço). */
  FORMS_INTERNAL_URL: httpUrl,
  /** O mesmo valor do JOBS_TOKEN do v0-tami-forms. */
  JOBS_TOKEN: z.string().min(32),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NAME: z.string().min(1).default("Administrador"),
  NOTIFY_EMAIL_ENABLED: booleanFlag,
  NOTIFY_WHATSAPP_ENABLED: booleanFlag,
})

export type Env = z.infer<typeof envSchema>

/** Variável vazia é inválida: para usar o padrão, remova a variável. Nunca ecoa o valor recebido. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw)
  if (result.success) return result.data

  const invalid = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))]
  throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${invalid.join(", ")}`)
}

let cached: Env | undefined

/** Lida na primeira chamada, nunca na importação: o `next build` roda sem env. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
