import { createHash } from 'crypto';

/**
 * Gera um hash SHA512 para uma senha.
 * @param password A senha em texto puro.
 * @returns O hash SHA512 em hexadecimal.
 */
export function hashSHA512(password: string): string {
  return createHash('sha512').update(password).digest('hex');
}

/**
 * Compara uma senha em texto puro com um hash SHA512.
 * @param password A senha em texto puro.
 * @param hash O hash SHA512 armazenado.
 * @returns True se a senha coincidir com o hash.
 */
export function compareSHA512(password: string, hash: string): boolean {
  const inputHash = hashSHA512(password);
  return inputHash === hash;
}
