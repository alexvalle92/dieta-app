// Sem imports de Node: o middleware (runtime edge) usa este arquivo.
// Aceita como destino pós-login só caminho interno de /cliente/, para o `next` não virar redirecionamento aberto.
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/cliente/")) return null
  if (raw.includes("//") || raw.includes("\\")) return null
  return raw
}
