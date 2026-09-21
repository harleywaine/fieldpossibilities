/**
 * A light gate in front of the demo: one shared password, remembered in a
 * signed cookie. It keeps the link private; it is not user authentication.
 *
 * The repository is public, so only a hash of the default password is stored
 * here. Set DEMO_PASSWORD to change it, and DEMO_SECRET to sign sessions with
 * a key that isn't in the source.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ACCESS_COOKIE = 'field_access';
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

// SHA-256 of the default password.
const DEFAULT_HASH = '40b0c784a200cf0cff3a1d4cee03e10632ce486c156b07ba13764791becdb0d1';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const expectedHash = () => (process.env.DEMO_PASSWORD ? sha256(process.env.DEMO_PASSWORD) : DEFAULT_HASH);

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(password: string): boolean {
  return same(sha256(password), expectedHash());
}

/** Changing the password (or the secret) signs everyone out. */
export function sessionToken(): string {
  return createHmac('sha256', `${process.env.DEMO_SECRET ?? 'field-demo'}:${expectedHash()}`)
    .update('field-demo-session')
    .digest('hex');
}

export function hasAccess(cookie: string | undefined): boolean {
  return Boolean(cookie) && same(cookie!, sessionToken());
}

/** Only same-site paths, so the unlock form can't be used to bounce people elsewhere. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
