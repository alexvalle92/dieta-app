/** Só os dígitos de um texto ("529.982.247-25" → "52998224725"). */
export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "")
}

/** CPF com 11 dígitos, sem sequência repetida e com os dois dígitos verificadores corretos. */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  const checkDigit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number.parseInt(cpf.charAt(i), 10) * (length + 1 - i)
    }
    const digit = 11 - (sum % 11)
    return digit >= 10 ? 0 : digit
  }

  return checkDigit(9) === Number.parseInt(cpf.charAt(9), 10) && checkDigit(10) === Number.parseInt(cpf.charAt(10), 10)
}
