/**
 * Local RFQ store (brief §32). Demonstration only: requests are written to a
 * local JSON file and are never transmitted to Field International.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface RfqRecord {
  id: string;
  createdAt: string;
  company: string;
  contact: string;
  email: string;
  location: string;
  aircraft: string;
  requirement: string;
  requiredDate: string;
  additional: string;
  productIds: string[];
  demo: true;
}

const FILE = join(process.cwd(), 'data', 'requests', 'rfq.json');

export function listRfqs(): RfqRecord[] {
  if (!existsSync(FILE)) return [];
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as RfqRecord[];
  } catch {
    return [];
  }
}

export function appendRfq(record: RfqRecord): void {
  mkdirSync(dirname(FILE), { recursive: true });
  const all = listRfqs();
  all.unshift(record);
  writeFileSync(FILE, JSON.stringify(all.slice(0, 200), null, 2));
}
