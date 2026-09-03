/**
 * Reproducible synthetic dataset generator (brief §53).
 *
 * Fixed seed → identical dataset every run, so the golden demo is stable.
 * The hero thread (Singapore Aero MRO) is authored explicitly; surrounding
 * records are generated but still cross-linked, so retrieval has to discriminate.
 */
import { makeRandom } from './rng.ts';
import { HERO } from './narrative.ts';
import type {
  Customer, Employee, Supplier, Rfq, Quote, DemoDocument, DemoDataset,
  OperationalMetric, RoiAssumptions, Department, DocumentType,
} from './types.ts';

const SEED = 20260903;

const EMPLOYEES: Employee[] = [
  { id: 'EMP-001', name: 'Alison Reid',    role: 'Commercial Director',       department: 'Management',  email: 'a.reid@field.example' },
  { id: 'EMP-002', name: 'Priya Raman',    role: 'Head of Sales',             department: 'Sales',       email: 'p.raman@field.example' },
  { id: 'EMP-003', name: 'James Carter',   role: 'Technical Sales Manager',   department: 'Sales',       email: 'j.carter@field.example' },
  { id: 'EMP-004', name: 'Tom Whitfield',  role: 'Sales Engineer',            department: 'Sales',       email: 't.whitfield@field.example' },
  { id: 'EMP-005', name: 'Sofia Marchetti',role: 'Commercial Analyst',        department: 'Commercial',  email: 's.marchetti@field.example' },
  { id: 'EMP-006', name: 'Daniel Okoro',   role: 'Principal Engineer',        department: 'Engineering', email: 'd.okoro@field.example' },
  { id: 'EMP-007', name: 'Hannah Lund',    role: 'Tooling Engineer',          department: 'Engineering', email: 'h.lund@field.example' },
  { id: 'EMP-008', name: 'Michael Byrne',  role: 'Operations Manager',        department: 'Operations',  email: 'm.byrne@field.example' },
  { id: 'EMP-009', name: 'Grace Tan',      role: 'Procurement Lead',          department: 'Procurement', email: 'g.tan@field.example' },
  { id: 'EMP-010', name: 'Robert Ellis',   role: 'Supplier Manager',          department: 'Procurement', email: 'r.ellis@field.example' },
  { id: 'EMP-011', name: 'Nadia Hassan',   role: 'Customer Support Lead',     department: 'Operations',  email: 'n.hassan@field.example' },
  { id: 'EMP-012', name: 'Chris Bailey',   role: 'Quotations Specialist',     department: 'Commercial',  email: 'c.bailey@field.example' },
];

const CUSTOMERS: Customer[] = [
  { id: 'CUST-001', name: 'Singapore Aero MRO',    country: 'Singapore',    region: 'APAC',   type: 'MRO',      fleet: ['Boeing 787', 'Boeing 777', 'Airbus A350'], accountOwnerId: 'EMP-003', since: '2019-04-11', annualSpendGbp: 410_000, paymentTerms: '45 days', notes: 'Heavy maintenance provider. Historically sensitive to delivery lead times.' },
  { id: 'CUST-002', name: 'Nordic Wings Technic',  country: 'Denmark',      region: 'EMEA',   type: 'MRO',      fleet: ['Boeing 737', 'Airbus A320'],              accountOwnerId: 'EMP-004', since: '2021-09-02', annualSpendGbp: 185_000, paymentTerms: '30 days', notes: 'Narrowbody line maintenance.' },
  { id: 'CUST-003', name: 'Gulf Technical Services',country: 'UAE',         region: 'MEA',    type: 'MRO',      fleet: ['Boeing 777', 'Boeing 787'],               accountOwnerId: 'EMP-003', since: '2018-01-22', annualSpendGbp: 620_000, paymentTerms: '60 days', notes: 'Large widebody base maintenance operation.' },
  { id: 'CUST-004', name: 'Atlantic Cargo Air',    country: 'Ireland',      region: 'EMEA',   type: 'Operator', fleet: ['Boeing 747', 'Boeing 767'],               accountOwnerId: 'EMP-004', since: '2020-06-30', annualSpendGbp: 240_000, paymentTerms: '30 days', notes: 'Freighter operator, ageing fleet.' },
  { id: 'CUST-005', name: 'Andes Regional Airlines',country: 'Chile',       region: 'LATAM',  type: 'Operator', fleet: ['Boeing 737'],                             accountOwnerId: 'EMP-004', since: '2022-11-14', annualSpendGbp: 95_000,  paymentTerms: '30 days', notes: 'Growing narrowbody fleet.' },
  { id: 'CUST-006', name: 'Pacific Line Maintenance',country: 'Australia',  region: 'APAC',   type: 'MRO',      fleet: ['Boeing 787', 'Boeing 737'],               accountOwnerId: 'EMP-003', since: '2021-02-08', annualSpendGbp: 155_000, paymentTerms: '45 days', notes: 'Line maintenance, expanding into base checks.' },
  { id: 'CUST-007', name: 'Rhein Aviation Technik',country: 'Germany',      region: 'EMEA',   type: 'MRO',      fleet: ['Airbus A330', 'Boeing 777'],              accountOwnerId: 'EMP-002', since: '2017-05-19', annualSpendGbp: 480_000, paymentTerms: '60 days', notes: 'Long-standing account, engineering-led buying.' },
  { id: 'CUST-008', name: 'Cascade Aerospace Support',country: 'Canada',    region: 'AMER',   type: 'MRO',      fleet: ['Boeing 767', 'Boeing 737'],               accountOwnerId: 'EMP-004', since: '2023-03-27', annualSpendGbp: 72_000,  paymentTerms: '30 days', notes: 'Newer account, price sensitive.' },
];

const SUPPLIERS: Supplier[] = [
  { id: 'SUP-001', name: 'Halden Precision Works',      category: 'Machined tooling',   country: 'United Kingdom', standardLeadTimeWeeks: 10, reliabilityPct: 94, notes: 'Reliable on repeat items.' },
  { id: 'SUP-002', name: 'Meridian Aerospace Tooling',  category: 'Engine tooling',     country: 'United States',  standardLeadTimeWeeks: 12, reliabilityPct: 88, notes: 'Primary source for GEnx tooling. Capacity has improved recently.' },
  { id: 'SUP-003', name: 'Baltic Lifting Systems',      category: 'Slings and hoists',  country: 'Poland',         standardLeadTimeWeeks: 8,  reliabilityPct: 91, notes: 'Good on lifting equipment.' },
  { id: 'SUP-004', name: 'Kite Ground Support',         category: 'Ground support',     country: 'United Kingdom', standardLeadTimeWeeks: 6,  reliabilityPct: 96, notes: 'Fast turnaround on GSE.' },
  { id: 'SUP-005', name: 'Osaka Tool Engineering',      category: 'Precision fixtures', country: 'Japan',          standardLeadTimeWeeks: 14, reliabilityPct: 97, notes: 'High quality, long lead times.' },
  { id: 'SUP-006', name: 'Provence Composites',         category: 'Covers and plugs',   country: 'France',         standardLeadTimeWeeks: 7,  reliabilityPct: 89, notes: 'Protective equipment specialist.' },
  { id: 'SUP-007', name: 'Northgate Fabrication',       category: 'Stands and frames',  country: 'United Kingdom', standardLeadTimeWeeks: 9,  reliabilityPct: 92, notes: 'Bulky fabricated items.' },
  { id: 'SUP-008', name: 'Vector Test Systems',         category: 'Test equipment',     country: 'Germany',        standardLeadTimeWeeks: 11, reliabilityPct: 90, notes: 'Electrical and test sets.' },
  { id: 'SUP-009', name: 'Cordoba Metalworks',          category: 'Machined tooling',   country: 'Spain',          standardLeadTimeWeeks: 9,  reliabilityPct: 85, notes: 'Occasional quality escapes.' },
  { id: 'SUP-010', name: 'Lakeside Calibration',        category: 'Calibration',        country: 'United Kingdom', standardLeadTimeWeeks: 4,  reliabilityPct: 98, notes: 'Calibration and certification services.' },
];

const OPERATIONAL_METRICS: OperationalMetric[] = [
  // A technical RFQ carries catalogue lookup, history checks and supplier chasing,
  // which is why it is the largest single block of recoverable time.
  { process: 'RFQ preparation',            currentMinutes: 55, aiAssistedMinutes: 12, annualVolume: 1900, affectedEmployees: 6, complexity: 'Medium',      department: 'Commercial' },
  { process: 'Customer enquiry handling',   currentMinutes: 18, aiAssistedMinutes: 6,  annualVolume: 4200, affectedEmployees: 5, complexity: 'Low',         department: 'Sales' },
  { process: 'Internal knowledge retrieval',currentMinutes: 22, aiAssistedMinutes: 5,  annualVolume: 2600, affectedEmployees: 9, complexity: 'Medium',      department: 'Sales' },
  { process: 'Supplier follow-up',          currentMinutes: 25, aiAssistedMinutes: 9,  annualVolume: 1800, affectedEmployees: 4, complexity: 'Medium–High', department: 'Procurement' },
  { process: 'Reporting and admin',         currentMinutes: 90, aiAssistedMinutes: 35, annualVolume: 620,  affectedEmployees: 7, complexity: 'Medium',      department: 'Operations' },
  { process: 'Technical applicability check',currentMinutes: 35, aiAssistedMinutes: 20, annualVolume: 900, affectedEmployees: 3, complexity: 'High',        department: 'Engineering' },
];

const ROI: RoiAssumptions = {
  // Fully loaded cost of a commercial/engineering employee, not salary alone.
  loadedHourlyCostGbp: 63,
  workingWeeksPerYear: 46,
  implementationCostGbp: 85_000,
  // Deliberately below 100%: not every instance of a process will be AI-assisted.
  adoptionRatePct: 75,
};

// ---------------------------------------------------------------- generation

const AIRCRAFT = ['Boeing 737', 'Boeing 747', 'Boeing 767', 'Boeing 777', 'Boeing 787', 'Airbus A320', 'Airbus A330'];
const APPLICATIONS = ['Thrust reverser', 'Landing gear', 'Flight controls', 'Doors', 'Exhaust', 'Fuel', 'Nacelles/pylons', 'Stabilizers'];
const PROGRAMMES = ['Heavy maintenance', 'Line maintenance', 'Base check', 'Component overhaul', 'Fleet induction'];

export function generateDataset(): DemoDataset {
  const r = makeRandom(SEED);
  const docs: DemoDocument[] = [];
  const rfqs: Rfq[] = [];
  const quotes: Quote[] = [];

  const emp = (id: string) => EMPLOYEES.find((e) => e.id === id)!;
  const cust = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

  const addDoc = (d: Omit<DemoDocument, 'status'> & { status?: DemoDocument['status'] }) => {
    docs.push({ status: 'current', ...d });
  };

  // ================================================================ HERO THREAD
  // Authored explicitly so the facts interlock and must be synthesised.
  buildHeroThread(addDoc, rfqs, quotes);

  // ============================================================ FILLER RECORDS
  // Generated, but still linked to real customers, owners and suppliers so
  // retrieval has to discriminate rather than simply finding the only match.
  let rfqSeq = 9100;
  for (let i = 0; i < 38; i++) {
    rfqSeq += r.int(3, 26);
    const c = r.pick(CUSTOMERS.filter((x) => x.id !== HERO.customerId));
    const owner = emp(c.accountOwnerId);
    const aircraft = r.pick(c.fleet.length ? c.fleet : AIRCRAFT);
    const application = r.pick(APPLICATIONS);
    const daysAgo = r.int(20, 900);
    const lineCount = r.int(3, 14);
    const status = r.pick(['won', 'lost', 'quoted', 'open'] as const);
    const ref = `RFQ-${rfqSeq}`;

    const rfq: Rfq = {
      id: ref, reference: ref, customerId: c.id, ownerId: owner.id,
      receivedAt: r.dateAgo(daysAgo), aircraft,
      engine: r.chance(0.35) ? r.pick(['GEnx', 'Trent 1000', 'CF6', 'CFM56', 'GE90']) : null,
      application, programme: r.pick(PROGRAMMES),
      requiredDeliveryWeeks: r.chance(0.7) ? r.int(6, 20) : null,
      status,
      lineItems: Array.from({ length: lineCount }, (_, k) => ({
        line: k + 1, requestedPart: null,
        description: `${application} tooling item ${k + 1}`,
        quantity: r.int(1, 3), notes: null,
      })),
      summary: `${c.name} requested ${lineCount} ${application.toLowerCase()} tooling items for ${aircraft} ${r.pick(PROGRAMMES).toLowerCase()}.`,
    };
    rfqs.push(rfq);

    addDoc({
      documentId: `DOC-${ref}`, title: `${ref} — ${c.name} (${aircraft})`,
      documentType: 'rfq', department: 'Sales', authorId: owner.id, authorName: owner.name,
      createdAt: rfq.receivedAt, updatedAt: rfq.receivedAt,
      customerId: c.id, relatedRfqId: ref, relatedQuoteId: null, relatedParts: [],
      supplierId: null, path: `rfqs/${ref.toLowerCase()}.pdf`,
      body: [
        `REQUEST FOR QUOTATION ${ref}`, '',
        `Customer: ${c.name} (${c.country})`,
        `Account owner: ${owner.name}, ${owner.role}`,
        `Received: ${rfq.receivedAt.slice(0, 10)}`,
        `Aircraft: ${aircraft}`,
        rfq.engine ? `Engine: ${rfq.engine}` : 'Engine: not specified',
        `Application: ${application}`,
        `Programme: ${rfq.programme}`,
        rfq.requiredDeliveryWeeks ? `Required delivery: ${rfq.requiredDeliveryWeeks} weeks` : 'Required delivery: not stated',
        `Line items: ${lineCount}`, '',
        rfq.summary,
      ].join('\n'),
    });

    if (status === 'won' || status === 'quoted' || status === 'lost') {
      const qref = `QT-${rfqSeq}`;
      const value = r.int(8, 120) * 1000 + r.int(0, 900);
      const quote: Quote = {
        id: qref, reference: qref, rfqId: ref, customerId: c.id, ownerId: owner.id,
        issuedAt: r.dateAgo(daysAgo - r.int(2, 12)), valueGbp: value, currency: 'GBP',
        leadTimeWeeks: r.int(6, 18),
        status: status === 'won' ? 'accepted' : status === 'lost' ? 'declined' : 'pending',
        lineCount, notes: `Quotation for ${ref}.`,
      };
      quotes.push(quote);

      addDoc({
        documentId: `DOC-${qref}`, title: `${qref} — quotation for ${c.name}`,
        documentType: 'quote', department: 'Commercial', authorId: 'EMP-012', authorName: emp('EMP-012').name,
        createdAt: quote.issuedAt, updatedAt: quote.issuedAt,
        customerId: c.id, relatedRfqId: ref, relatedQuoteId: qref, relatedParts: [],
        supplierId: null, path: `quotes/${qref.toLowerCase()}.pdf`,
        body: [
          `QUOTATION ${qref}`, '',
          `Against: ${ref}`, `Customer: ${c.name}`,
          `Issued: ${quote.issuedAt.slice(0, 10)}`,
          `Total value: £${value.toLocaleString()}`,
          `Quoted lead time: ${quote.leadTimeWeeks} weeks`,
          `Line items: ${lineCount}`,
          `Status: ${quote.status}`, '',
          `Prepared by ${emp('EMP-012').name}, reviewed by ${owner.name}.`,
        ].join('\n'),
      });
    }
  }

  // Customer profiles and account histories.
  for (const c of CUSTOMERS) {
    const owner = emp(c.accountOwnerId);
    const cRfqs = rfqs.filter((x) => x.customerId === c.id);
    addDoc({
      documentId: `DOC-PROF-${c.id}`, title: `${c.name} — account profile`,
      documentType: 'customer-profile', department: 'Sales', authorId: owner.id, authorName: owner.name,
      createdAt: r.dateAgo(r.int(200, 700)), updatedAt: r.dateAgo(r.int(10, 90)),
      customerId: c.id, relatedRfqId: null, relatedQuoteId: null, relatedParts: [],
      supplierId: null, path: `customers/${slug(c.name)}-profile.pdf`,
      body: [
        `CUSTOMER PROFILE — ${c.name}`, '',
        `Country: ${c.country} (${c.region})`, `Type: ${c.type}`,
        `Fleet: ${c.fleet.join(', ')}`,
        `Customer since: ${c.since}`,
        `Account owner: ${owner.name}, ${owner.role}`,
        `Indicative annual spend: £${c.annualSpendGbp.toLocaleString()}`,
        `Payment terms: ${c.paymentTerms}`, '',
        `Notes: ${c.notes}`,
        `Enquiries on record: ${cRfqs.length + (c.id === HERO.customerId ? 4 : 0)}`,
      ].join('\n'),
    });
  }

  // Supplier correspondence, process docs and meeting notes.
  for (const s of SUPPLIERS) {
    if (s.id === HERO.supplierId) continue; // hero supplier handled in the narrative
    addDoc({
      documentId: `DOC-SUP-${s.id}`, title: `${s.name} — supplier summary`,
      documentType: 'supplier-correspondence', department: 'Procurement',
      authorId: 'EMP-010', authorName: emp('EMP-010').name,
      createdAt: r.dateAgo(r.int(60, 500)), updatedAt: r.dateAgo(r.int(5, 60)),
      customerId: null, relatedRfqId: null, relatedQuoteId: null, relatedParts: [],
      supplierId: s.id, path: `suppliers/${slug(s.name)}.docx`,
      body: [
        `SUPPLIER SUMMARY — ${s.name}`, '',
        `Category: ${s.category}`, `Country: ${s.country}`,
        `Standard lead time: ${s.standardLeadTimeWeeks} weeks`,
        `On-time reliability: ${s.reliabilityPct}%`, '',
        `Notes: ${s.notes}`,
      ].join('\n'),
    });
  }

  buildProcessDocs(addDoc, emp);
  buildMeetingNotes(addDoc, emp, r);
  buildTechnicalNotes(addDoc, emp, r);
  buildCustomerEmails(addDoc, emp, r, rfqs);
  buildSupplierThreads(addDoc, emp, r);
  buildInternalGuides(addDoc, emp, r);

  return {
    generatedAt: new Date(Date.UTC(2026, 8, 3)).toISOString(),
    seed: SEED,
    customers: CUSTOMERS, employees: EMPLOYEES, suppliers: SUPPLIERS,
    rfqs, quotes, documents: docs,
    metrics: OPERATIONAL_METRICS, roi: ROI,
  };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------- hero thread

type AddDoc = (d: Omit<DemoDocument, 'status'> & { status?: DemoDocument['status'] }) => void;

function buildHeroThread(addDoc: AddDoc, rfqs: Rfq[], quotes: Quote[]) {
  const owner = EMPLOYEES.find((e) => e.id === HERO.ownerId)!;
  const eng = EMPLOYEES.find((e) => e.id === 'EMP-006')!;
  const proc = EMPLOYEES.find((e) => e.id === 'EMP-010')!;
  const quoter = EMPLOYEES.find((e) => e.id === 'EMP-012')!;
  const day = (n: number) => new Date(Date.UTC(2026, 8, 3) - n * 86_400_000).toISOString();

  // ---- Current RFQ (the one Workflow AI processes) ------------------------
  const lineItems = [
    ...HERO.realParts.map((p, i) => ({
      line: i + 1, requestedPart: p,
      description: `${HERO.application} tooling — ${p}`,
      quantity: i % 3 === 0 ? 2 : 1, notes: null as string | null,
    })),
    { line: 11, requestedPart: 'K78012-63', description: 'Hold open equipment, GEnx-1B thrust reverser', quantity: 1, notes: 'Customer references a different revision to our last supply.' },
    { line: 12, requestedPart: 'K71010-1', description: 'Stand assembly — storage, inlet assembly', quantity: 1, notes: null },
    { line: 13, requestedPart: 'K71001-17', description: 'Aft hold open assembly', quantity: 2, notes: null },
    { line: 14, requestedPart: 'K10008-14', description: 'Protective plug equipment — engine exhaust, GE GEnx', quantity: 1, notes: null },
    { line: 15, requestedPart: 'K78011-1', description: 'Hold open equipment — Trent 1000 thrust reverser', quantity: 1, notes: 'Engine variant differs from the rest of this request.' },
    { line: 16, requestedPart: HERO.unmatchablePart, description: 'Thrust reverser spreader bar, customer part reference', quantity: 1, notes: 'Customer-specific reference — no Field catalogue equivalent supplied.' },
    { line: 17, requestedPart: 'K78002-70', description: 'Sling equipment — thrust reverser sleeve, GEnx', quantity: 1, notes: 'Repeat of item supplied under QT-09841.' },
  ];

  const currentRfq: Rfq = {
    id: HERO.currentRfq, reference: HERO.currentRfq, customerId: HERO.customerId,
    ownerId: HERO.ownerId, receivedAt: day(2),
    aircraft: HERO.aircraft, engine: HERO.engine, application: HERO.application,
    programme: HERO.programme, requiredDeliveryWeeks: HERO.requiredDeliveryWeeks,
    status: 'open', lineItems,
    summary: `${HERO.customerName} requested ${lineItems.length} ${HERO.application.toLowerCase()} tooling items for a ${HERO.aircraft} ${HERO.programme.toLowerCase()} programme, required within ${HERO.requiredDeliveryWeeks} weeks.`,
  };
  rfqs.push(currentRfq);

  addDoc({
    documentId: `DOC-${HERO.currentRfq}`, title: `${HERO.currentRfq} — ${HERO.customerName} 787 GEnx thrust reverser tooling`,
    documentType: 'rfq', department: 'Sales', authorId: owner.id, authorName: owner.name,
    createdAt: day(2), updatedAt: day(2),
    customerId: HERO.customerId, relatedRfqId: HERO.currentRfq, relatedQuoteId: null,
    relatedParts: lineItems.map((l) => l.requestedPart!).filter(Boolean),
    supplierId: null, path: `rfqs/${HERO.currentRfq.toLowerCase()}.pdf`,
    body: [
      `REQUEST FOR QUOTATION ${HERO.currentRfq}`, '',
      `Customer: ${HERO.customerName} (Singapore)`,
      `Account owner: ${owner.name}, ${owner.role}`,
      `Received: ${day(2).slice(0, 10)}`,
      `Aircraft: ${HERO.aircraft}`, `Engine: ${HERO.engine}`,
      `Application: ${HERO.application}`, `Programme: ${HERO.programme}`,
      `Required delivery: ${HERO.requiredDeliveryWeeks} weeks`,
      `Line items: ${lineItems.length}`, '',
      'Customer is preparing a heavy maintenance programme and requires pricing and',
      'availability for the tooling listed. Delivery is required within 10 weeks of order.',
      '', 'REQUESTED ITEMS', '',
      ...lineItems.map((l) => `${String(l.line).padStart(2, '0')}. ${l.requestedPart ?? '—'}  qty ${l.quantity}  ${l.description}${l.notes ? `  [${l.notes}]` : ''}`),
    ].join('\n'),
  });

  // ---- Prior RFQs and the prior quote -------------------------------------
  const priorSpec: Array<{ ref: string; daysAgo: number; note: string; status: Rfq['status'] }> = [
    { ref: 'RFQ-09841', daysAgo: 486, note: 'Original 787 GEnx thrust reverser tooling package.', status: 'won' },
    { ref: 'RFQ-10271', daysAgo: 214, note: 'Follow-on request for additional protective equipment.', status: 'quoted' },
    { ref: 'RFQ-09102', daysAgo: 690, note: 'Earlier 777 landing gear tooling enquiry.', status: 'lost' },
  ];

  for (const p of priorSpec) {
    const is787 = p.ref !== 'RFQ-09102';
    rfqs.push({
      id: p.ref, reference: p.ref, customerId: HERO.customerId, ownerId: HERO.ownerId,
      receivedAt: day(p.daysAgo), aircraft: is787 ? HERO.aircraft : 'Boeing 777',
      engine: is787 ? HERO.engine : 'GE90', application: is787 ? HERO.application : 'Landing gear',
      programme: HERO.programme, requiredDeliveryWeeks: p.ref === 'RFQ-09841' ? 8 : 14,
      status: p.status, lineItems: [], summary: p.note,
    });
    addDoc({
      documentId: `DOC-${p.ref}`, title: `${p.ref} — ${HERO.customerName}`,
      documentType: 'rfq', department: 'Sales', authorId: owner.id, authorName: owner.name,
      createdAt: day(p.daysAgo), updatedAt: day(p.daysAgo),
      customerId: HERO.customerId, relatedRfqId: p.ref, relatedQuoteId: null,
      relatedParts: is787 ? ['K78002-70', 'K10009-1'] : [],
      supplierId: null, path: `rfqs/${p.ref.toLowerCase()}.pdf`,
      body: [
        `REQUEST FOR QUOTATION ${p.ref}`, '',
        `Customer: ${HERO.customerName}`, `Account owner: ${owner.name}`,
        `Received: ${day(p.daysAgo).slice(0, 10)}`,
        `Aircraft: ${is787 ? HERO.aircraft : 'Boeing 777'}`,
        `Engine: ${is787 ? HERO.engine : 'GE90'}`,
        `Application: ${is787 ? HERO.application : 'Landing gear'}`,
        `Required delivery: ${p.ref === 'RFQ-09841' ? 8 : 14} weeks`,
        `Outcome: ${p.status}`, '', p.note,
        p.ref === 'RFQ-09841'
          ? 'Customer emphasised that delivery inside 8 weeks was a condition of award.'
          : '',
      ].filter(Boolean).join('\n'),
    });
  }

  quotes.push({
    id: HERO.priorQuote, reference: HERO.priorQuote, rfqId: 'RFQ-09841',
    customerId: HERO.customerId, ownerId: HERO.ownerId, issuedAt: day(478),
    valueGbp: HERO.priorQuoteValueGbp, currency: 'GBP',
    leadTimeWeeks: HERO.historicLeadTimeWeeks, status: 'accepted', lineCount: 12,
    notes: 'Accepted. Delivered against a 12-week lead time.',
  });

  addDoc({
    documentId: `DOC-${HERO.priorQuote}`, title: `${HERO.priorQuote} — quotation, ${HERO.customerName} 787 GEnx tooling`,
    documentType: 'quote', department: 'Commercial', authorId: quoter.id, authorName: quoter.name,
    createdAt: day(478), updatedAt: day(478),
    customerId: HERO.customerId, relatedRfqId: 'RFQ-09841', relatedQuoteId: HERO.priorQuote,
    relatedParts: ['K78002-70', 'K10009-1', 'K10009-5'], supplierId: HERO.supplierId,
    path: `quotes/${HERO.priorQuote.toLowerCase()}.pdf`,
    body: [
      `QUOTATION ${HERO.priorQuote}`, '',
      `Against: RFQ-09841`, `Customer: ${HERO.customerName}`,
      `Issued: ${day(478).slice(0, 10)}`,
      `Total value: £${HERO.priorQuoteValueGbp.toLocaleString()}`,
      `Quoted lead time: ${HERO.historicLeadTimeWeeks} weeks`,
      `Line items: 12`, `Status: accepted`, '',
      'Package covered 787 GEnx thrust reverser handling and protective equipment,',
      'including K78002-70 sling equipment and K10009-1 / K10009-5 protective plugs.',
      '',
      `Note: quoted lead time of ${HERO.historicLeadTimeWeeks} weeks exceeded the customer's stated`,
      '8-week requirement. Award followed a commercial discussion on phased delivery.',
    ].join('\n'),
  });

  // ---- The lead-time conflict (§50) ---------------------------------------
  // Old internal note: 12 weeks. Recent supplier email: 8–10 weeks.
  addDoc({
    documentId: 'DOC-SUP-002-NOTE', title: `${HERO.supplierName} — GEnx tooling lead times (internal note)`,
    documentType: 'supplier-correspondence', department: 'Procurement',
    authorId: proc.id, authorName: proc.name,
    createdAt: day(425), updatedAt: day(425),
    customerId: null, relatedRfqId: null, relatedQuoteId: null,
    relatedParts: ['K78002-70', 'K10009-1'], supplierId: HERO.supplierId,
    path: 'suppliers/meridian-genx-lead-times.docx',
    status: 'superseded', staleMonths: 14, conflictsWith: 'DOC-SUP-002-EMAIL',
    body: [
      `INTERNAL NOTE — ${HERO.supplierName}`, '',
      `Prepared by: ${proc.name}, ${proc.role}`,
      `Date: ${day(425).slice(0, 10)}`, '',
      'Working assumption for GEnx thrust reverser tooling:',
      `  Standard lead time: ${HERO.historicLeadTimeWeeks} weeks from order`,
      '  Expedite: not offered',
      '',
      'This figure should be used for quotation purposes until reviewed.',
    ].join('\n'),
  });

  addDoc({
    documentId: 'DOC-SUP-002-EMAIL', title: `${HERO.supplierName} — updated capacity and lead times`,
    documentType: 'email', department: 'Procurement', authorId: proc.id, authorName: proc.name,
    createdAt: day(23), updatedAt: day(23),
    customerId: null, relatedRfqId: null, relatedQuoteId: null,
    relatedParts: ['K78002-70', 'K10009-1', 'K10009-5'], supplierId: HERO.supplierId,
    path: 'emails/meridian-lead-time-update.txt', conflictsWith: 'DOC-SUP-002-NOTE',
    body: [
      `From: sales@meridian-aerospace.example`,
      `To: ${proc.email}`,
      `Date: ${day(23).slice(0, 10)}`,
      `Subject: Updated capacity — GEnx tooling`, '',
      `${proc.name.split(' ')[0]},`, '',
      'Following our capacity expansion this year we can now offer improved lead times',
      'on GEnx thrust reverser tooling. Current position is 8–10 weeks from receipt of',
      'order for the handling and protective equipment lines, subject to confirmation',
      'at the time of order.',
      '',
      'Please note this supersedes the 12-week figure previously advised.',
      '', 'Regards,', 'Meridian Aerospace Tooling',
    ].join('\n'),
  });

  // ---- Engineering caveat (blocks variant approval claims) ----------------
  addDoc({
    documentId: 'DOC-ENG-787-VARIANT', title: '787 GEnx tooling — variant applicability note',
    documentType: 'technical-note', department: 'Engineering', authorId: eng.id, authorName: eng.name,
    createdAt: day(96), updatedAt: day(96),
    customerId: null, relatedRfqId: null, relatedQuoteId: null,
    relatedParts: ['K78002-70', 'K10009-1', 'K78012-63'], supplierId: null,
    path: 'technical/787-genx-tooling-notes.pdf',
    body: [
      'TECHNICAL NOTE — 787 GEnx thrust reverser tooling', '',
      `Author: ${eng.name}, ${eng.role}`,
      `Date: ${day(96).slice(0, 10)}`, '',
      'The published catalogue records applicability at aircraft MODEL level only',
      '(i.e. "BOEING 787"). It does not distinguish between the 787-8, 787-9 and',
      '787-10 variants.',
      '',
      'Where a customer specifies a variant, applicability must be confirmed against',
      'the applicable maintenance manual and the tooling drawing before any statement',
      'of suitability is issued. Field does not hold variant-level approval data in',
      'the catalogue.',
      '',
      'This applies particularly to hold-open and sling equipment, where thrust',
      'reverser geometry differs between build standards.',
    ].join('\n'),
  });

  // ---- Customer history: the delivery sensitivity ------------------------
  addDoc({
    documentId: 'DOC-HIST-CUST-001', title: `${HERO.customerName} — account history and commercial notes`,
    documentType: 'account-history', department: 'Sales', authorId: owner.id, authorName: owner.name,
    createdAt: day(510), updatedAt: day(31),
    customerId: HERO.customerId, relatedRfqId: 'RFQ-09841', relatedQuoteId: HERO.priorQuote,
    relatedParts: [], supplierId: null, path: 'customers/singapore-aero-mro-history.docx',
    body: [
      `ACCOUNT HISTORY — ${HERO.customerName}`, '',
      `Account owner: ${owner.name}, ${owner.role}`,
      `Customer since: 2019`, '',
      'ENQUIRY HISTORY',
      `  RFQ-09102  Boeing 777 landing gear tooling  — lost on delivery`,
      `  RFQ-09841  Boeing 787 GEnx thrust reverser  — won, quoted ${HERO.priorQuote}`,
      `  RFQ-10271  Follow-on protective equipment    — quoted, no decision`,
      `  ${HERO.currentRfq}  Boeing 787 GEnx thrust reverser  — open`,
      '',
      'COMMERCIAL NOTES',
      '  Delivery lead time is the recurring point of friction on this account.',
      '  RFQ-09102 was lost specifically because the quoted lead time exceeded the',
      '  customer\'s maintenance slot. On RFQ-09841 the customer stated an 8-week',
      `  requirement and we quoted ${HERO.historicLeadTimeWeeks} weeks; the order was only secured after`,
      '  agreeing a phased delivery.',
      '',
      '  Any response to a new enquiry should establish current supplier lead times',
      '  before a delivery position is offered.',
    ].join('\n'),
  });

  // ---- Email thread on the live enquiry -----------------------------------
  addDoc({
    documentId: 'DOC-EMAIL-CUST-001', title: `${HERO.customerName} — enquiry thread (${HERO.currentRfq})`,
    documentType: 'email', department: 'Sales', authorId: owner.id, authorName: owner.name,
    createdAt: day(2), updatedAt: day(1),
    customerId: HERO.customerId, relatedRfqId: HERO.currentRfq, relatedQuoteId: null,
    relatedParts: ['K78002-70'], supplierId: null,
    path: 'emails/singapore-aero-email-thread.txt',
    body: [
      'From: procurement@singaporeaeromro.example',
      `To: ${owner.email}`,
      `Date: ${day(2).slice(0, 10)}`,
      `Subject: RFQ — Boeing 787 GEnx tooling`, '',
      `${owner.name.split(' ')[0]},`, '',
      'We are preparing a heavy maintenance programme and require pricing and',
      'availability for the attached tooling requirements. Our maintenance slot opens',
      'in ten weeks and we cannot hold the aircraft beyond that window.',
      '',
      'Several of these items you have supplied to us previously.',
      '', 'Regards,', 'Procurement, Singapore Aero MRO',
      '', '---', '',
      `From: ${owner.email}`,
      'To: procurement@singaporeaeromro.example',
      `Date: ${day(1).slice(0, 10)}`,
      'Subject: RE: RFQ — Boeing 787 GEnx tooling', '',
      'Thank you — acknowledged. I am confirming current availability with our supplier',
      'and will revert with pricing and a delivery position.',
      '', owner.name,
    ].join('\n'),
  });

  // ---- Meeting note flagging urgency --------------------------------------
  addDoc({
    documentId: 'DOC-MEET-SALES-SEP', title: 'Sales pipeline meeting — September',
    documentType: 'meeting-notes', department: 'Sales', authorId: 'EMP-002',
    authorName: EMPLOYEES.find((e) => e.id === 'EMP-002')!.name,
    createdAt: day(4), updatedAt: day(4),
    customerId: HERO.customerId, relatedRfqId: HERO.currentRfq, relatedQuoteId: null,
    relatedParts: [], supplierId: HERO.supplierId, path: 'meetings/sales-meeting-september.docx',
    body: [
      'SALES PIPELINE MEETING — SEPTEMBER', '',
      `Present: ${EMPLOYEES.filter((e) => e.department === 'Sales').map((e) => e.name).join(', ')}`,
      `Date: ${day(4).slice(0, 10)}`, '',
      'SINGAPORE AERO MRO',
      `  ${owner.name} reported an incoming 787 GEnx thrust reverser enquiry`,
      '  (heavy maintenance programme, ten-week window).',
      '  Agreed this is a priority: the account was nearly lost on delivery previously.',
      '  Action: confirm current supplier lead times before responding.',
      `  Owner: ${owner.name}`,
      '',
      'OTHER',
      '  Gulf Technical Services 777 package progressing.',
      '  Nordic Wings Technic renewal due next quarter.',
    ].join('\n'),
  });
}

function buildProcessDocs(addDoc: AddDoc, emp: (id: string) => Employee) {
  const ops = emp('EMP-008');
  const day = (n: number) => new Date(Date.UTC(2026, 8, 3) - n * 86_400_000).toISOString();

  addDoc({
    documentId: 'DOC-PROC-RFQ', title: 'RFQ handling process',
    documentType: 'process', department: 'Operations', authorId: ops.id, authorName: ops.name,
    createdAt: day(320), updatedAt: day(64),
    customerId: null, relatedRfqId: null, relatedQuoteId: null, relatedParts: [],
    supplierId: null, path: 'operations/rfq-process.docx',
    body: [
      'RFQ HANDLING PROCESS', '',
      '1. Enquiry received by the account owner or the general sales mailbox.',
      '2. Log the enquiry and acknowledge to the customer within one working day.',
      '3. Identify catalogue matches for each requested line item.',
      '4. Check account history for previous supply of the same items.',
      '5. Where applicability is uncertain, raise a technical review with Engineering.',
      '6. Confirm current supplier lead times before offering a delivery position.',
      '7. Commercial prepares the quotation; the account owner reviews before issue.',
      '8. Any statement of technical suitability requires Engineering sign-off.',
      '',
      'Target acknowledgement: 1 working day. Target quotation: 5 working days.',
    ].join('\n'),
  });

  addDoc({
    documentId: 'DOC-PROC-ESC', title: 'Escalation process',
    documentType: 'process', department: 'Operations', authorId: ops.id, authorName: ops.name,
    createdAt: day(300), updatedAt: day(120),
    customerId: null, relatedRfqId: null, relatedQuoteId: null, relatedParts: [],
    supplierId: null, path: 'operations/escalation-process.docx',
    body: [
      'ESCALATION PROCESS', '',
      'Escalate to the Commercial Director where:',
      '  • the enquiry value exceeds £75,000',
      '  • the customer requires delivery inside the standard supplier lead time',
      '  • a technical applicability question cannot be resolved from existing records',
      '  • a previous order for the same customer was delivered late',
      '',
      'Delivery commitments outside standard lead times require supplier confirmation',
      'in writing before being offered to a customer.',
    ].join('\n'),
  });
}

function buildMeetingNotes(
  addDoc: AddDoc, emp: (id: string) => Employee, r: ReturnType<typeof makeRandom>,
) {
  const topics = [
    ['Engineering review call', 'Engineering', 'EMP-006'],
    ['Procurement supplier review', 'Procurement', 'EMP-009'],
    ['Operations capacity review', 'Operations', 'EMP-008'],
    ['Commercial pricing review', 'Commercial', 'EMP-005'],
    ['Quarterly account review', 'Sales', 'EMP-002'],
  ] as const;

  for (let i = 0; i < 10; i++) {
    const [title, dept, author] = topics[i % topics.length];
    const a = emp(author);
    const created = r.dateAgo(r.int(15, 400));
    addDoc({
      documentId: `DOC-MEET-${String(i + 1).padStart(3, '0')}`,
      title: `${title} — ${created.slice(0, 7)}`,
      documentType: 'meeting-notes', department: dept as Department,
      authorId: a.id, authorName: a.name, createdAt: created, updatedAt: created,
      customerId: null, relatedRfqId: null, relatedQuoteId: null, relatedParts: [],
      supplierId: null, path: `meetings/${slug(title)}-${i + 1}.docx`,
      body: [
        title.toUpperCase(), '',
        `Chair: ${a.name}`, `Date: ${created.slice(0, 10)}`, '',
        'Discussion covered current workload, open enquiries and supplier performance.',
        'Actions were assigned against named owners with review at the next meeting.',
      ].join('\n'),
    });
  }
}


// ------------------------------------------------------- supporting corpus
// These documents exist so retrieval has to discriminate: they share vocabulary
// with the hero thread (aircraft, applications, customers) without answering it.

function buildTechnicalNotes(
  addDoc: AddDoc, emp: (id: string) => Employee, r: ReturnType<typeof makeRandom>,
) {
  const subjects: Array<[string, string, string[]]> = [
    ['Thrust reverser handling guidance', 'Thrust reverser', ['K78002-70', 'K78008-1']],
    ['Landing gear jacking and shoring', 'Landing gear', []],
    ['Engine inlet protection during storage', 'Parking and mooring', ['K10007-1']],
    ['Fan cowl support beam handling', 'Nacelles/pylons', ['K71008-37']],
    ['Sling inspection and recertification', 'Lifting and shoring', []],
    ['Door rigging equipment usage', 'Doors', []],
    ['Exhaust duct plug fitment', 'Exhaust', ['K10009-1', 'K10009-5']],
    ['Flaperon rigging procedure notes', 'Flight controls', []],
    ['Torque equipment calibration intervals', 'Standard practices', []],
    ['Stand assembly load ratings', 'Lifting and shoring', ['K71010-1']],
    ['Blocker door wear measurement', 'Thrust reverser', ['G78009-1']],
    ['Protective plug material compatibility', 'Parking and mooring', []],
  ];

  subjects.forEach(([title, application, parts], i) => {
    const author = emp(r.pick(['EMP-006', 'EMP-007'] as const));
    const created = r.dateAgo(r.int(40, 620));
    addDoc({
      documentId: `DOC-TECH-${String(i + 1).padStart(3, '0')}`,
      title: `${title} — technical note`,
      documentType: 'technical-note', department: 'Engineering',
      authorId: author.id, authorName: author.name,
      createdAt: created, updatedAt: created,
      customerId: null, relatedRfqId: null, relatedQuoteId: null,
      relatedParts: parts, supplierId: null,
      path: `technical/${slug(title)}.pdf`,
      body: [
        `TECHNICAL NOTE — ${title.toUpperCase()}`, '',
        `Author: ${author.name}, ${author.role}`,
        `Date: ${created.slice(0, 10)}`,
        `Application area: ${application}`,
        parts.length ? `Related tooling: ${parts.join(', ')}` : 'Related tooling: general',
        '',
        `This note records internal working guidance on ${title.toLowerCase()}.`,
        'It is guidance only and does not constitute approval of tooling for any',
        'specific aircraft variant. Applicability must be confirmed against the',
        'applicable maintenance manual before use.',
        '',
        'Key points:',
        '  • Confirm the tooling drawing revision matches the aircraft build standard.',
        '  • Record any deviation and refer it to Engineering before proceeding.',
        '  • Equipment with a certification interval must be in date before issue.',
      ].join('\n'),
    });
  });
}

function buildCustomerEmails(
  addDoc: AddDoc, emp: (id: string) => Employee,
  r: ReturnType<typeof makeRandom>, rfqs: Rfq[],
) {
  const others = rfqs.filter((x) => x.customerId !== HERO.customerId);
  const chosen = others.slice(0, 26);

  chosen.forEach((rfq, i) => {
    const c = CUSTOMERS.find((x) => x.id === rfq.customerId)!;
    const owner = emp(rfq.ownerId);
    const created = rfq.receivedAt;
    addDoc({
      documentId: `DOC-MAIL-${String(i + 1).padStart(3, '0')}`,
      title: `${c.name} — correspondence re ${rfq.reference}`,
      documentType: 'email', department: 'Sales',
      authorId: owner.id, authorName: owner.name,
      createdAt: created, updatedAt: created,
      customerId: c.id, relatedRfqId: rfq.id, relatedQuoteId: null,
      relatedParts: [], supplierId: null,
      path: `emails/${slug(c.name)}-${rfq.reference.toLowerCase()}.txt`,
      body: [
        `From: procurement@${slug(c.name)}.example`,
        `To: ${owner.email}`,
        `Date: ${created.slice(0, 10)}`,
        `Subject: ${rfq.reference} — ${rfq.aircraft} ${rfq.application ?? 'tooling'}`,
        '',
        `${owner.name.split(' ')[0]},`, '',
        `Please could you provide pricing and availability for our ${rfq.application?.toLowerCase() ?? 'tooling'}`,
        `requirement on ${rfq.aircraft}${rfq.engine ? ` (${rfq.engine})` : ''}.`,
        rfq.requiredDeliveryWeeks
          ? `We would need delivery within ${rfq.requiredDeliveryWeeks} weeks.`
          : 'Please advise your standard lead time.',
        '', 'Regards,', `Procurement, ${c.name}`,
      ].join('\n'),
    });
  });
}

function buildSupplierThreads(
  addDoc: AddDoc, emp: (id: string) => Employee, r: ReturnType<typeof makeRandom>,
) {
  const buyer = emp('EMP-009');
  SUPPLIERS.forEach((s, i) => {
    for (let k = 0; k < 2; k++) {
      const created = r.dateAgo(r.int(20, 420));
      addDoc({
        documentId: `DOC-SUPMAIL-${String(i * 2 + k + 1).padStart(3, '0')}`,
        title: `${s.name} — ${k === 0 ? 'lead time confirmation' : 'order follow-up'}`,
        documentType: 'supplier-correspondence', department: 'Procurement',
        authorId: buyer.id, authorName: buyer.name,
        createdAt: created, updatedAt: created,
        customerId: null, relatedRfqId: null, relatedQuoteId: null,
        relatedParts: [], supplierId: s.id,
        path: `suppliers/${slug(s.name)}-${k === 0 ? 'lead-times' : 'follow-up'}.txt`,
        body: [
          `From: ${buyer.email}`,
          `To: sales@${slug(s.name)}.example`,
          `Date: ${created.slice(0, 10)}`,
          `Subject: ${k === 0 ? 'Lead time confirmation' : 'Order follow-up'} — ${s.category}`,
          '', 'Hello,', '',
          k === 0
            ? `Please confirm your current lead time for ${s.category.toLowerCase()}. Our records show ${s.standardLeadTimeWeeks} weeks.`
            : `Following up on outstanding deliveries. Please confirm the current shipping position.`,
          '', 'Regards,', buyer.name,
        ].join('\n'),
      });
    }
  });
}

function buildInternalGuides(
  addDoc: AddDoc, emp: (id: string) => Employee, r: ReturnType<typeof makeRandom>,
) {
  const guides: Array<[string, Department, string, string[]]> = [
    ['Quotation preparation checklist', 'Commercial', 'EMP-012', [
      'Confirm every requested line item has a catalogue reference or is flagged as unmatched.',
      'Check the account history for previous supply and previously quoted pricing.',
      'Confirm the current supplier lead time before stating a delivery position.',
      'Flag any item requiring an applicability check to Engineering.',
    ]],
    ['Customer response standards', 'Sales', 'EMP-002', [
      'Acknowledge every enquiry within one working day.',
      'Never state technical suitability without Engineering confirmation.',
      'Never offer a delivery date that has not been confirmed by the supplier.',
      'Record the enquiry against the customer account on the day it is received.',
    ]],
    ['Engineering review triggers', 'Engineering', 'EMP-006', [
      'A customer specifies an aircraft variant not recorded in the catalogue.',
      'A requested part number does not resolve to a catalogue item.',
      'The customer references a drawing revision we have not supplied before.',
      'Tooling is to be used outside its recorded application.',
    ]],
    ['Supplier escalation guidance', 'Procurement', 'EMP-010', [
      'Escalate where a confirmed lead time slips by more than two weeks.',
      'Escalate where a supplier declines to confirm a delivery position in writing.',
      'Record all lead time confirmations against the supplier record.',
    ]],
    ['New starter orientation — sales', 'Sales', 'EMP-002', [
      'Field supplies ground support equipment and aircraft maintenance tooling.',
      'The published catalogue records applicability at aircraft model level.',
      'Lead times vary by supplier and must be confirmed per enquiry.',
      'Account owners are responsible for the customer relationship end to end.',
    ]],
    ['Data handling and records', 'Operations', 'EMP-008', [
      'Customer correspondence is retained against the account record.',
      'Quotations are retained for seven years.',
      'Superseded documents must be marked as such rather than deleted.',
    ]],
  ];

  guides.forEach(([title, dept, authorId, points], i) => {
    const a = emp(authorId);
    const created = r.dateAgo(r.int(80, 700));
    const updated = r.dateAgo(r.int(10, 79));
    addDoc({
      documentId: `DOC-GUIDE-${String(i + 1).padStart(3, '0')}`,
      title,
      documentType: 'process', department: dept,
      authorId: a.id, authorName: a.name,
      createdAt: created, updatedAt: updated,
      customerId: null, relatedRfqId: null, relatedQuoteId: null,
      relatedParts: [], supplierId: null,
      path: `operations/${slug(title)}.docx`,
      body: [
        title.toUpperCase(), '',
        `Owner: ${a.name}, ${a.role}`,
        `Last reviewed: ${updated.slice(0, 10)}`, '',
        ...points.map((p) => `  • ${p}`),
      ].join('\n'),
    });
  });
}
