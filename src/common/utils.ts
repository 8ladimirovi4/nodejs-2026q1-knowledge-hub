import 'dotenv/config';

export function requireSaltRounds(): number {
  const raw = process.env.CRYPT_SALT;
  const effective = raw === undefined || raw === '' ? '10' : raw;
  const n = Number(effective);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('CRYPT_SALT must be a positive integer');
  }
  return n;
}
