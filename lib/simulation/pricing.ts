/**
 * SYNTHETIC pricing. Field publishes no prices, so every figure here — cost,
 * freight, margin rule, customer terms, price history — is invented for the
 * demo, seeded from the part number so the same enquiry always prices the
 * same way. Every screen that shows these numbers says so, prominently.
 *
 * The point is the method: the system assembles the evidence and suggests a
 * price; a person sets it.
 */

export const MIN_MARGIN = 0.2;

export interface LinePrice {
  line: number;
  cost: number;
  freightPct: number;
  landed: number;
  rule: { label: string; marginPct: number };
  discountPct: number;
  suggested: number;
  low: number;
  high: number;
  last: { price: number; date: string } | null;
  typical: number;
  /** The account discount took the price under the margin floor, so the suggestion holds the floor instead. */
  floored: boolean;
}

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h);
}
/** A stable number in [0, 1) for a part and a purpose. */
const unit = (seed: string) => (hash(seed) % 10_000) / 10_000;
const round = (n: number, to: number) => Math.round(n / to) * to;

// Invented price list: a cost range and a standard margin by kind of item.
const PRICE_LIST: Array<{ test: RegExp; label: string; cost: [number, number]; marginPct: number }> = [
  { test: /jack/i, label: 'Jacks', cost: [8_000, 38_000], marginPct: 24 },
  { test: /stand|frame|dolly|trolley|cradle/i, label: 'Stands and frames', cost: [6_000, 26_000], marginPct: 26 },
  { test: /sling|hoist|lift/i, label: 'Lifting equipment', cost: [3_000, 12_000], marginPct: 30 },
  { test: /cover|plug|protect/i, label: 'Protective equipment', cost: [400, 2_500], marginPct: 38 },
  { test: /test|gauge|measur/i, label: 'Test and measurement', cost: [1_500, 9_000], marginPct: 32 },
  { test: /./, label: 'Other tooling', cost: [250, 3_500], marginPct: 35 },
];

// Invented freight and duty, by where the supplier ships from.
const FREIGHT: Record<string, number> = {
  'United Kingdom': 3, France: 5, Poland: 5, Germany: 5, Spain: 5, 'United States': 8, Japan: 9,
};

// Invented account terms.
const TERMS: Record<string, number> = {
  'CUST-001': 5, 'CUST-002': 3, 'CUST-003': 7, 'CUST-004': 3,
  'CUST-005': 0, 'CUST-006': 3, 'CUST-007': 6, 'CUST-008': 0,
};

export function priceFor(landed: number, marginPct: number, discountPct: number): number {
  return round((landed / (1 - marginPct / 100)) * (1 - discountPct / 100), 5);
}

export function marginOf(price: number, landed: number): number {
  return price > 0 ? (price - landed) / price : 0;
}

export function priceLines(
  lines: Array<{ line: number; partNumber: string | null; name: string; aircraft?: string | null }>,
  accountId: string | null,
  supplierCountry: (name: string) => string | undefined,
  /** The account's won orders. A line can only have been sold before inside one of these. */
  wonJobs: Array<{ aircraft: string | null; date: string }> = [],
): LinePrice[] {
  const discountPct = accountId ? TERMS[accountId] ?? 0 : 0;
  const wonFor = (aircraft: string | null | undefined) => {
    const named = (aircraft ?? '').split(', ').map((a) => a.toUpperCase()).filter(Boolean);
    return wonJobs.find((j) => j.aircraft && named.includes(j.aircraft.toUpperCase())) ?? null;
  };
  return lines.map((l) => {
    const key = l.partNumber ?? l.name;
    const entry = PRICE_LIST.find((p) => p.test.test(l.name))!;
    const cost = round(entry.cost[0] + unit(`${key}:cost`) * (entry.cost[1] - entry.cost[0]), 10);
    const freightPct = FREIGHT[supplierCountry(l.name) ?? ''] ?? 5;
    const landed = Math.round(cost * (1 + freightPct / 100));
    const discounted = priceFor(landed, entry.marginPct, discountPct);
    const floorPrice = round(landed / (1 - MIN_MARGIN), 5);
    const floored = marginOf(discounted, landed) < MIN_MARGIN;
    const suggested = floored ? floorPrice : discounted;
    // A line has sold to this customer before only if the account actually won an
    // order for that aircraft, and the date is that order's. The older price is usually a little lower.
    const won = accountId !== null ? wonFor(l.aircraft) : null;
    const sold = won !== null && unit(`${key}:${accountId}:sold`) < 0.7;
    return {
      line: l.line,
      cost,
      freightPct,
      landed,
      rule: { label: entry.label, marginPct: entry.marginPct },
      discountPct,
      suggested,
      low: round(suggested * 0.97, 5),
      high: round(suggested * 1.03, 5),
      last: sold
        ? { price: round(suggested * (0.84 + unit(`${key}:last`) * 0.14), 5), date: won!.date }
        : null,
      typical: round(suggested * (0.95 + unit(`${key}:typical`) * 0.12), 5),
      floored,
    };
  });
}

export const gbpExact = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
