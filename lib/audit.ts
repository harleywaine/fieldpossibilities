/**
 * Prototype audit trail for internal AI actions (brief §59).
 * Written to a local file so the demo does not require a writable database.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { writablePath } from './writable.ts';

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  query: string;
  retrievedSources: string[];
  model: string;
  outputSummary: string;
  approvalRequired: boolean;
  approvalStatus: string;
}

const file = () => writablePath('demo', 'audit-log.json');

export function readAudit(limit = 50): AuditEntry[] {
  try {
    if (!existsSync(file())) return [];
    return (JSON.parse(readFileSync(file(), 'utf8')) as AuditEntry[]).slice(0, limit);
  } catch {
    return [];
  }
}

export function recordAudit(e: Omit<AuditEntry, 'timestamp'>): void {
  try {
    const all = readAudit(500);
    all.unshift({ timestamp: new Date().toISOString(), ...e });
    writeFileSync(file(), JSON.stringify(all.slice(0, 200), null, 2));
  } catch { /* auditing must never break the request path */ }
}
