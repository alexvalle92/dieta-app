// Contratos dos repositórios do PlanA. Só `lib/repos/` importa o Drizzle e o schema; serviços e rotas
// dependem destes tipos. Datas são `Date` (UTC); datas de calendário, `YYYY-MM-DD`.

export type Channel = "email" | "whatsapp"

export type PatientRow = {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  /** Nulo até a primeira geração do plano (ou até o admin definir uma senha). */
  passwordHash: string | null
  mustChangePassword: boolean
  createdAt: Date
}

export interface PatientRepo {
  findByCpf(cpf: string): Promise<PatientRow | null>
  /** No máximo 2 linhas: quem chama só precisa saber se há exatamente uma. */
  findByEmail(email: string): Promise<PatientRow[]>
  getById(id: string): Promise<PatientRow | null>
  /** `created_at` decrescente; `search` vazio lista todos; senão LIKE em nome, e-mail e CPF. */
  list(search: string): Promise<PatientRow[]>
  /** Grava `must_change_password = true` e `password_set_at`. */
  create(d: {
    name: string
    cpf: string
    email: string
    phone: string
    passwordHash: string
  }): Promise<PatientRow | "cpf_taken">
  update(id: string, d: { name: string; email: string; phone: string }): Promise<PatientRow | null>
  setPassword(id: string, d: { passwordHash: string; mustChangePassword: boolean }): Promise<boolean>
  /**
   * `has_history`: existe cobrança ou envio do quiz. Senão apaga tokens, mensagens e planos do
   * paciente, e o paciente, numa transação (§9.1 do spec).
   */
  delete(id: string): Promise<"deleted" | "not_found" | "has_history">
}

export type AdminRow = { id: string; name: string; email: string; passwordHash: string }

export interface AdminRepo {
  findByEmail(email: string): Promise<AdminRow | null>
  getById(id: string): Promise<AdminRow | null>
  count(): Promise<number>
  create(d: { name: string; email: string; passwordHash: string }): Promise<"created" | "email_taken">
  setPassword(id: string, passwordHash: string): Promise<boolean>
}

export interface ResetTokenRepo {
  /** Uma transação: o token e uma mensagem `password_reset` por destinatário (§7.1, passo 4). */
  createRequest(d: {
    patientId: string
    tokenHash: string
    expiresAt: Date
    link: string
    recipients: { channel: Channel; recipient: string }[]
    now: Date
  }): Promise<{ notificationIds: string[] }>
  /** Uma transação (§7.2, passo 3). `invalid`: inexistente ou usado. `expired`: `expires_at <= now`. */
  redeem(d: { tokenHash: string; passwordHash: string; now: Date }): Promise<"ok" | "invalid" | "expired">
}

export type MealPlanRow = {
  id: string
  patientId: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  dueDateNewMealPlan: string | null
  paymentUrlNewMealPlan: string | null
  status: string
  planData: unknown
  createdAt: Date
  updatedAt: Date
}

export type MealPlanWithPatient = MealPlanRow & {
  patient: { id: string; name: string; email: string; cpf: string } | null
}

export type MealPlanInput = {
  patientId: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  status: string
  planData: unknown
}

export interface MealPlanRepo {
  /** `created_at` decrescente. */
  listByPatient(patientId: string): Promise<MealPlanRow[]>
  getForPatient(id: string, patientId: string): Promise<MealPlanRow | null>
  /** `created_at` decrescente, com o paciente. */
  listAll(): Promise<MealPlanWithPatient[]>
  get(id: string): Promise<MealPlanWithPatient | null>
  /**
   * Com `status` "active", os outros planos `active` do paciente viram `completed`, na mesma
   * transação (§9.1 do spec): um paciente nunca tem dois planos ativos.
   */
  create(d: MealPlanInput, now: Date): Promise<MealPlanWithPatient | "patient_not_found">
  /** `null` em `description`/`endDate` limpa o campo; `undefined` mantém. Aplica a mesma regra do `create`. */
  update(
    id: string,
    d: Partial<MealPlanInput>,
    now: Date,
  ): Promise<MealPlanWithPatient | "not_found" | "patient_not_found">
  /** `in_use`: há linha em `plan_generations` apontando para o plano. */
  delete(id: string): Promise<"deleted" | "not_found" | "in_use">
}

export interface StatsRepo {
  admin(range: { monthStart: Date; lastMonthStart: Date }): Promise<{
    totalPatients: number
    activePlans: number
    totalRecipes: number
    newThisMonth: number
    newLastMonth: number
  }>
  recipesCount(): Promise<number>
}

export type RecipeRow = {
  id: string
  title: string
  description: string | null
  ingredients: string[]
  preparation: string
  tips: string | null
  prepTime: number | null
  servings: number | null
  calories: number | null
  category: string | null
  imageUrl: string | null
  portionQuantity: number | null
  proteins: number | null
  lipids: number | null
  carbohydrates: number | null
  fiber: number | null
  activeCustomer: boolean
  createdAt: Date
  updatedAt: Date
}

export type RecipeInput = Omit<RecipeRow, "id" | "createdAt" | "updatedAt">

export interface RecipeRepo {
  /** `created_at` decrescente. `onlyActive` filtra `active_customer`; `search` faz LIKE em título e categoria. */
  list(opts: { onlyActive: boolean; search: string }): Promise<RecipeRow[]>
  get(id: string): Promise<RecipeRow | null>
  create(d: RecipeInput, now: Date): Promise<RecipeRow>
  /** Só os campos recebidos mudam; `null` limpa um campo opcional. `null` se o id não existe. */
  update(id: string, d: Partial<RecipeInput>, now: Date): Promise<RecipeRow | null>
  delete(id: string): Promise<boolean>
}

export type MealCategoryRow = { id: string; name: string; createdAt: Date }

export type AllowedItemRow = {
  id: string
  itemType: string
  foodName: string | null
  createdAt: Date
  category: { id: string; name: string }
  recipe: { id: string; title: string } | null
}

export interface MealConfigRepo {
  /** Por nome. */
  listCategories(): Promise<MealCategoryRow[]>
  createCategory(name: string, now: Date): Promise<MealCategoryRow | "name_taken">
  /** Apaga também os itens permitidos da categoria (cascata). */
  deleteCategory(id: string): Promise<void>
  /** `created_at` decrescente. */
  listAllowedItems(): Promise<AllowedItemRow[]>
  createAllowedItem(
    d: { mealCategoryId: string; itemType: string; foodName: string | null; recipeId: string | null },
    now: Date,
  ): Promise<{ id: string }>
  deleteAllowedItem(id: string): Promise<void>
  /** "" quando ainda não há linha. */
  getDietDefinition(): Promise<string>
  /** Upsert da linha "global". */
  setDietDefinition(text: string, now: Date): Promise<void>
}

export type PatientRecord = {
  patient: {
    id: string
    name: string
    cpf: string
    email: string
    phone: string
    createdAt: Date
    hasPassword: boolean
    mustChangePassword: boolean
  }
  quizResponses: { id: string; createdAt: Date; answers: Record<string, unknown> }[]
  payments: {
    id: string
    amount: string
    status: string
    dueDate: string | null
    paidAt: Date | null
    billingType: string | null
    paymentUrl: string | null
    createdAt: Date
  }[]
  mealPlans: {
    id: string
    title: string
    startDate: string
    endDate: string | null
    status: string
    /** "ai" quando o plano nasceu de um pagamento; "admin" quando foi criado à mão. */
    origin: "ai" | "admin"
    createdAt: Date
  }[]
  notifications: {
    id: string
    channel: string
    kind: string
    status: string
    attempts: number
    sentAt: Date | null
    createdAt: Date
  }[]
}

/** Leitura do cadastro completo de um paciente (tela do admin). Todas as listas: mais novo primeiro. */
export interface PatientRecordRepo {
  get(patientId: string): Promise<PatientRecord | null>
}
