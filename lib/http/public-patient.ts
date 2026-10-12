import type { PatientRow } from "@/lib/repos/types"

/** O que a API devolve de um paciente: nunca o hash da senha nem a marca de troca pendente. */
export function publicPatient(p: PatientRow) {
  return { id: p.id, name: p.name, email: p.email, cpf: p.cpf, phone: p.phone, createdAt: p.createdAt }
}
