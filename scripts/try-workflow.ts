import { processRfq } from '../lib/workflow/rfq.ts';
const wp = processRfq(process.argv[2] ?? 'RFQ-10482');
console.log(`RFQ ${wp.extracted.reference} — ${wp.extracted.customerName}`);
console.log(`${wp.extracted.aircraft} / ${wp.extracted.engine} / ${wp.extracted.application} · ${wp.extracted.requiredDeliveryWeeks} weeks`);
console.log('\nSTAGES');
for (const s of wp.stages) console.log(`  ${s.label.padEnd(20)} ${s.detail}`);
console.log(`\nCOUNTS  total=${wp.counts.total} matched=${wp.counts.matched} review=${wp.counts.review} unmatched=${wp.counts.unmatched}  (${wp.durationMs}ms)`);
console.log('\nEXCEPTIONS');
for (const l of wp.lines.filter((x) => x.status !== 'matched')) {
  console.log(`  Item ${String(l.line).padStart(2, '0')}  [${l.status}]  ${l.requestedPart ?? '—'}`);
  console.log(`      ${l.reviewReason}`);
}
console.log('\nMATCHED SAMPLE');
for (const l of wp.lines.filter((x) => x.status === 'matched').slice(0, 4)) {
  console.log(`  ${String(l.line).padStart(2, '0')}  ${l.requestedPart}  →  ${l.product?.name.slice(0, 58)}  lead=${l.leadTimeDays ?? 'n/p'}`);
}
console.log('\nRECOMMENDED:', wp.recommendedAction);
