/**
 * Gancho do Next no início do servidor. Só o runtime Node faz o boot (conferência do banco e primeiro
 * admin); o import dinâmico garante que o runtime edge nunca carregue o mysql2.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // O `next build` não deve depender de banco nem de env.
  if (process.env.NEXT_PHASE === "phase-production-build") return
  const { boot } = await import("./lib/boot")
  await boot()
}
