import { randomBytes } from 'node:crypto'

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateTemporaryPassword() {
  const length = 14
  const bytes = randomBytes(length)
  let password = ''

  for (let index = 0; index < length; index += 1) {
    password += PASSWORD_ALPHABET[bytes[index] % PASSWORD_ALPHABET.length]
  }

  return `${password}7a`
}
