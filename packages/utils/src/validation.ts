export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidNigerianPhone(phone: string): boolean {
  return /^(\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ''))
}

export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('234')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`
  return `+234${cleaned}`
}
