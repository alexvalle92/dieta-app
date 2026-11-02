// Aba do menu do paciente que corresponde a cada caminho de `/cliente`.

export type ClientTab = "inicio" | "plano" | "receitas"

const TAB_PREFIXES: ReadonlyArray<[string, ClientTab]> = [
  ["/cliente/dashboard", "inicio"],
  ["/cliente/meu-plano", "plano"],
  ["/cliente/planos", "plano"],
  ["/cliente/receitas", "receitas"],
]

/** O caminho exato ou um subcaminho dele (`/cliente/planosx` não é `/cliente/planos`). */
export function activeTab(pathname: string): ClientTab | null {
  for (const [prefix, tab] of TAB_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return tab
  }
  return null
}
