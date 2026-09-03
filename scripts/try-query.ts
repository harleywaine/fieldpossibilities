import { retrieve } from '../lib/ai/retrieval.ts';
import { MATCH_LABELS } from '../lib/ai/ranking.ts';

const q = process.argv.slice(2).join(' ') ||
  "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine thrust reverser maintenance. We need delivery within 10 weeks.";

const r = retrieve(q, { limit: 8 });
console.log('QUERY:', q);
console.log('\n--- REQUIREMENT ---');
for (const u of r.requirement.understood) {
  console.log(`  ✓ ${u.label}: ${u.value}${u.note ? `\n      ⚠ ${u.note}` : ''}`);
}
console.log('\n--- TRACE ---');
for (const s of r.trace.steps) console.log(`  ${s.label}: ${s.detail}`);
console.log(`  candidates=${r.trace.unionCandidates} ranked=${r.trace.ranked} strong=${r.trace.strong} potential=${r.trace.potential} alt=${r.trace.alternative} in ${r.trace.durationMs}ms`);
console.log(`\n--- TOP ${r.results.length} ---`);
for (const s of r.results) {
  const p = s.product;
  console.log(`\n[${MATCH_LABELS[s.matchClass]}] ${p.partNumber ?? '—'}  score=${s.score.toFixed(3)}`);
  console.log(`  ${p.name.slice(0, 96)}`);
  console.log(`  aircraft=${p.aircraftModel ?? 'null'} | engine=${p.engine ?? 'null'} | cat=${p.maintenanceCategory ?? 'null'} | lead=${p.leadTimeDays ?? 'not published'}`);
  if (s.gaps.length) for (const g of s.gaps) console.log(`  ⚠ ${g}`);
}

// Grounded assessment
const { composeSearchAssessment, composeAnswer } = await import('../lib/ai/explain.ts');
console.log('\n--- AI ASSESSMENT (deterministic path) ---');
console.log(composeSearchAssessment(r.requirement, r.results, { strong: r.trace.strong, potential: r.trace.potential }));
console.log('\n--- HARD QUESTION: "Can this product replace the specified tooling?" ---');
console.log(composeAnswer('Can this product replace the specified tooling?', r.results.slice(0, 3)));
console.log('\n--- QUESTION: "Which one can be delivered fastest?" ---');
console.log(composeAnswer('Which one can be delivered fastest?', r.results.slice(0, 3)));
