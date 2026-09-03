import { buildEnquiryBrief } from '../lib/knowledge/brief.ts';

const q = process.argv.slice(2).join(' ') ||
  "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx thrust reverser tooling. Tell me everything I need to know before I respond.";

const b = buildEnquiryBrief(q);
console.log('QUESTION:', q);
console.log('\n--- RETRIEVAL TRACE ---');
for (const s of b.retrieval.trace.steps) console.log(`  ${s.label}: ${s.detail}`);
console.log(`  ${b.retrieval.trace.durationMs}ms · ${b.retrieval.documents.length} documents cited`);
console.log('\n--- ENQUIRY INTELLIGENCE ---');
for (const f of b.fields) {
  console.log(`\n${f.label}${f.interpretation ? '  [AI interpretation]' : ''}`);
  console.log(`  ${f.value}`);
  if (f.conflict) {
    console.log(`  ⚠ CONFLICT: ${f.conflict.summary}`);
    for (const p of f.conflict.positions) console.log(`      • ${p.value}  (${p.citation.path})`);
  }
  if (f.ageWarning) console.log(`  ⚠ ${f.ageWarning}`);
  console.log(`  ${f.citations.length} source(s): ${f.citations.map((c) => c.path).join(', ')}`);
}
console.log('\n--- OPEN QUESTIONS ---');
for (const q2 of b.openQuestions) console.log('  •', q2);
console.log('\n--- NEXT STEP ---\n ', b.recommendedNextStep);
