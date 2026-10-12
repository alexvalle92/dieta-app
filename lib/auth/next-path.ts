// Sem imports de Node: o middleware (runtime edge) usa este arquivo.
// Aceita como destino pós-login só caminho interno de /cliente/, para o `next` não virar redirecionamento aberto.

// Caracteres de controle (U+0000 a U+001F e DEL): o navegador descarta tab e quebra de linha ao ler a URL.
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/

/** Segmento "." ou "..", também com os pontos codificados (%2e, em qualquer caixa): o navegador o resolve. */
function isDotSegment(segment: string): boolean {
  const decoded = segment.replace(/%2e/gi, ".")
  return decoded === "." || decoded === ".."
}

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/cliente/")) return null
  if (raw.includes("//") || raw.includes("\\")) return null
  if (CONTROL_CHAR.test(raw)) return null
  // Só o caminho conta: os pontos da query e do fragmento não são resolvidos.
  const path = raw.split(/[?#]/, 1)[0]
  if (path.split("/").some(isDotSegment)) return null
  return raw
}
