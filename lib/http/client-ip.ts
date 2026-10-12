/**
 * Primeiro IP de `x-forwarded-for`, ou "unknown". O valor só é confiável atrás do proxy do
 * Easypanel: quem acessa o app direto consegue forjar o cabeçalho.
 */
export function clientIp(req: Request): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return first || "unknown"
}
