// Texto do vencimento do plano no Início, a partir de `daysLeft` (lib/renewal/rules.ts).

export function expiryLabel(days: number | null): string | null {
  if (days === null) return null
  if (days > 1) return `Vence em ${days} dias`
  if (days === 1) return "Vence em 1 dia"
  if (days === 0) return "Vence hoje"
  return "Vencido"
}
