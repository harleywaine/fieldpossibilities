/**
 * Where the demo keeps the little it writes (submitted requests, the audit
 * trail). Locally that's under data/. A serverless deployment's code folder is
 * read-only, so there it falls back to the temporary directory — writable, but
 * per instance and wiped on redeploy, which is fine for a demonstration.
 */
import { accessSync, constants, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const resolved = new Map<string, string>();

export function writablePath(...segments: string[]): string {
  const key = segments.join('/');
  const known = resolved.get(key);
  if (known) return known;

  const primary = join(process.cwd(), 'data', ...segments);
  let path = join(tmpdir(), 'field-demo', ...segments);
  try {
    mkdirSync(dirname(primary), { recursive: true });
    accessSync(dirname(primary), constants.W_OK);
    path = primary;
  } catch {
    mkdirSync(dirname(path), { recursive: true });
  }
  resolved.set(key, path);
  return path;
}
