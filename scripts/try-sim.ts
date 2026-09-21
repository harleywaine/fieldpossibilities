import { buildSimulatedRfq } from '../lib/simulation/rfq.ts';
import { listAccounts, listInbox } from '../lib/simulation/crm.ts';
for (const q of [
  process.argv[2] ?? "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine thrust reverser maintenance. We need delivery within 10 weeks.",
  'Handling equipment for a 737-800 stabilizer',
  'something to lift an engine',
]) {
  const r = buildSimulatedRfq(q);
  console.log(`\n${r.reference} · aircraft=${r.aircraft} variant=${r.variant} engine=${r.engine} deadline=${r.deadlineDays}`);
  console.log(`  "${q}"  → ${r.lines.length} lines (of ${r.considered} considered, ${r.searchMs}ms)`);
  for (const l of r.lines) {
    console.log(`   ${String(l.line).padStart(2,'0')} ${String(l.partNumber).padEnd(14)} ${l.matchClass.padEnd(11)} lead=${l.leadTimeDays ?? '—'}  flags=${l.flags.map(f=>f.kind[0]).join('') || '-'}`);
  }
}

const a = listAccounts()[0];
console.log(`\n${a.name}: won £${a.stats.wonGbp}, pipeline £${a.stats.pipelineGbp}, win ${a.stats.winRatePct}%, ${a.jobs.length} jobs, ${a.cases.length} cases, ${a.activity.length} activity`);
console.log(listInbox().map((i) => `${i.reference} ${i.customer} ${i.date} ${i.subject}`).join('\n'));
