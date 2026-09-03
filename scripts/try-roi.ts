import { computeRoi, recommendFirstPhase, ROI_DISCLAIMER } from '../lib/roi/model.ts';
const roi = computeRoi();
console.log('AI OPERATIONS BRIEF\n');
console.log(`Illustrative annual productivity opportunity: £${roi.totals.productivityValueGbp.toLocaleString()}`);
console.log(`Annual hours recovered: ${roi.totals.annualHoursRecovered.toLocaleString()} (~${roi.totals.fteEquivalent} FTE)`);
console.log(`Cash-equivalent (at ${roi.inputs.cashConversionPct}% conversion): £${roi.totals.cashEquivalentGbp.toLocaleString()}`);
console.log(`Implementation cost: £${roi.totals.implementationCostGbp.toLocaleString()}`);
console.log(`Indicative payback: ${roi.totals.paybackMonths} months`);
console.log(`3-year opportunity: £${roi.totals.threeYearOpportunityGbp.toLocaleString()}\n`);
console.log('BREAKDOWN');
for (const o of roi.opportunities) {
  console.log(`  ${o.process.padEnd(32)} £${String(o.productivityValueGbp.toLocaleString()).padStart(8)}  ${String(o.annualHoursRecovered).padStart(5)}h  ${o.complexity}`);
}
const rec = recommendFirstPhase(roi);
console.log(`\nRECOMMENDED FIRST PHASE: ${rec.process}`);
console.log(' ', rec.reason);
console.log('\n' + ROI_DISCLAIMER);
