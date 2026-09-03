/**
 * The golden-demo narrative (brief §18, §20, §50).
 *
 * These facts are authored by hand rather than randomised, because the whole
 * point of the Knowledge demo is that the AI must retrieve and reconcile
 * information scattered across SEVERAL documents. Randomly generated documents
 * would not interlock, so nothing would need synthesising.
 *
 * Deliberate difficulties baked in here:
 *   • a supplier lead-time CONFLICT between an old internal note and a recent email
 *   • a STALE document that should be flagged by age
 *   • an engineering caveat that blocks any variant-level approval claim
 *   • one requested item with NO catalogue match
 */

export const HERO = {
  customerId: 'CUST-001',
  customerName: 'Singapore Aero MRO',
  ownerId: 'EMP-003',
  ownerName: 'James Carter',
  ownerRole: 'Technical Sales Manager',

  currentRfq: 'RFQ-10482',
  priorRfqs: ['RFQ-09841', 'RFQ-10271', 'RFQ-09102'],
  priorQuote: 'QT-09841',
  priorQuoteValueGbp: 48_200,

  aircraft: 'Boeing 787',
  engine: 'GEnx',
  application: 'Thrust reverser',
  programme: 'Heavy maintenance',
  requiredDeliveryWeeks: 10,

  /** Conflicting lead-time figures the AI must surface rather than resolve. */
  historicLeadTimeWeeks: 12,
  latestSupplierLeadTimeWeeks: '8–10',

  supplierId: 'SUP-002',
  supplierName: 'Meridian Aerospace Tooling',

  /** Real catalogue part numbers, so cross-referencing genuinely resolves. */
  realParts: [
    'K78002-70', 'K10009-1', 'K10009-5', 'K78012-1', 'K78012-63',
    'K78001-49', 'K78008-1', 'K10007-1', 'K10008-14', 'K71008-37',
  ],
  /** Deliberately not in the catalogue — drives the "no confirmed match" case. */
  unmatchablePart: 'TR-GENX-SPR-114',
} as const;

export const DEMO_DISCLAIMER =
  'Synthetic demonstration data. Created to model how Field’s internal records might ' +
  'look. Not real Field International information.';
