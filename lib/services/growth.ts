/**
 * Crescimento percentual de cadastros do mês sobre o mês anterior (painel do admin).
 * Sem cadastros no mês anterior: 100% se houve algum neste mês, 0% se não houve.
 */
export function growthPercentage(thisMonth: number, lastMonth: number): number {
  if (lastMonth > 0) return Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  return thisMonth > 0 ? 100 : 0
}
