import { sql } from "drizzle-orm"
import { hashPassword, verifyPassword } from "@/lib/auth/password-hash"
import { getDb } from "@/lib/db/client"
import { getEnv, type Env } from "@/lib/env"
import { createFormsClient } from "@/lib/forms-client"
import { createRateLimiter, type RateLimiter } from "@/lib/http/rate-limit"
import { createLogger, type Logger } from "@/lib/log"
import { createAdminRepo } from "@/lib/repos/admins"
import { createMealPlanRepo } from "@/lib/repos/meal-plans"
import { createPatientRepo } from "@/lib/repos/patients"
import { createResetTokenRepo } from "@/lib/repos/reset-tokens"
import { createStatsRepo } from "@/lib/repos/stats"
import type {
  AdminRepo,
  Channel,
  MealPlanRepo,
  PatientRepo,
  ResetTokenRepo,
  StatsRepo,
} from "@/lib/repos/types"
import { newResetToken, hashResetToken } from "@/lib/auth/reset-token"
import { createChangeAdminPassword, createChangePatientPassword } from "@/lib/services/change-password"
import { createLoginAdmin, createLoginPatient } from "@/lib/services/login"
import { createRedeemPasswordReset, createRequestPasswordReset } from "@/lib/services/password-reset"
import { createPatientAdmin, type PatientAdmin } from "@/lib/services/patient-admin"
import { createSeedAdmin } from "@/lib/services/seed-admin"

/**
 * Hash scrypt de uma senha aleatória que ninguém conhece. O login o verifica quando não há
 * credencial a conferir, para o tempo de resposta não revelar se o CPF ou e-mail existe.
 */
const DUMMY_HASH = "scrypt$16384$8$1$O50R11H4+G3G5y+VKELFfw==$ZYhSlAlxHFu9blMH7M3LCpAUYh5AZBD8W/NcrSTJd3U="

// §6.3 e §7.1 do spec: 10 logins a cada 10 minutos e 5 pedidos de recuperação a cada 15, por IP.
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 600_000 }
const FORGOT_RATE_LIMIT = { limit: 5, windowMs: 900_000 }

export type Container = {
  env: Env
  log: Logger
  repos: {
    patients: PatientRepo
    admins: AdminRepo
    resetTokens: ResetTokenRepo
    mealPlans: MealPlanRepo
    stats: StatsRepo
  }
  channels: Channel[]
  loginPatient: ReturnType<typeof createLoginPatient>
  loginAdmin: ReturnType<typeof createLoginAdmin>
  changePatientPassword: ReturnType<typeof createChangePatientPassword>
  changeAdminPassword: ReturnType<typeof createChangeAdminPassword>
  requestPasswordReset: ReturnType<typeof createRequestPasswordReset>
  redeemPasswordReset: ReturnType<typeof createRedeemPasswordReset>
  seedAdmin: ReturnType<typeof createSeedAdmin>
  patientAdmin: PatientAdmin
  forms: ReturnType<typeof createFormsClient>
  loginLimiter: RateLimiter
  forgotLimiter: RateLimiter
  ping: () => Promise<void>
}

/** Canais ativos, na ordem e-mail → WhatsApp, conforme `NOTIFY_*_ENABLED`. */
export function enabledChannels(env: Pick<Env, "NOTIFY_EMAIL_ENABLED" | "NOTIFY_WHATSAPP_ENABLED">): Channel[] {
  const all: [Channel, boolean][] = [
    ["email", env.NOTIFY_EMAIL_ENABLED],
    ["whatsapp", env.NOTIFY_WHATSAPP_ENABLED],
  ]
  return all.filter(([, enabled]) => enabled).map(([channel]) => channel)
}

function buildContainer(): Container {
  const env = getEnv()
  const log = createLogger()
  const db = getDb()
  const now = () => new Date()
  const channels = enabledChannels(env)

  const patients = createPatientRepo(db)
  const admins = createAdminRepo(db)
  const resetTokens = createResetTokenRepo(db)
  const mealPlans = createMealPlanRepo(db)
  const stats = createStatsRepo(db)

  return {
    env,
    log,
    repos: { patients, admins, resetTokens, mealPlans, stats },
    channels,
    loginPatient: createLoginPatient({ patients, verifyPassword, dummyHash: DUMMY_HASH }),
    loginAdmin: createLoginAdmin({ admins, verifyPassword, dummyHash: DUMMY_HASH }),
    changePatientPassword: createChangePatientPassword({ patients, hashPassword, verifyPassword }),
    changeAdminPassword: createChangeAdminPassword({ admins, hashPassword, verifyPassword }),
    requestPasswordReset: createRequestPasswordReset({
      patients,
      resetTokens,
      newToken: newResetToken,
      now,
      appUrl: env.APP_URL,
      channels,
    }),
    redeemPasswordReset: createRedeemPasswordReset({ resetTokens, hashPassword, hashToken: hashResetToken, now }),
    seedAdmin: createSeedAdmin({ admins, hashPassword, log }),
    patientAdmin: createPatientAdmin({ patients, hashPassword }),
    forms: createFormsClient({ baseUrl: env.FORMS_INTERNAL_URL, token: env.JOBS_TOKEN, log }),
    loginLimiter: createRateLimiter(LOGIN_RATE_LIMIT),
    forgotLimiter: createRateLimiter(FORGOT_RATE_LIMIT),
    ping: async () => {
      await db.execute(sql`SELECT 1`)
    },
  }
}

// Em globalThis: o Next pode carregar este módulo em mais de um bundle (instrumentation e rotas) e
// recarregá-lo em dev; os limitadores de tentativa precisam ser um só por processo.
const globalForContainer = globalThis as typeof globalThis & { __planaContainer?: Container }

/** Monta as dependências na primeira chamada (nunca na importação: o `next build` roda sem env). */
export function getContainer(): Container {
  globalForContainer.__planaContainer ??= buildContainer()
  return globalForContainer.__planaContainer
}
