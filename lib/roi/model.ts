/**
 * Opportunity and ROI model (brief §37–§40, §64).
 *
 * Every figure is COMPUTED from stated assumptions — nothing is hard-coded, so
 * changing an input changes the output consistently everywhere it appears.
 *
 * Language matters here: this models recovered employee CAPACITY, which is not
 * the same as cash leaving the cost base. The distinction is exposed as a
 * toggle rather than buried, because a board will (rightly) ask.
 */
import { demoDb } from '../db/demo.ts';

export interface RoiInputs {
  loadedHourlyCostGbp: number;
  adoptionRatePct: number;
  implementationCostGbp: number;
  /** Share of recovered capacity assumed to convert to cash. */
  cashConversionPct: number;
}

export interface ProcessOpportunity {
  process: string;
  department: string;
  complexity: string;
  currentMinutes: number;
  aiAssistedMinutes: number;
  annualVolume: number;
  affectedEmployees: number;
  minutesSavedPerItem: number;
  annualHoursRecovered: number;
  productivityValueGbp: number;
  cashEquivalentGbp: number;
  sharePct: number;
}

export interface RoiResult {
  inputs: RoiInputs;
  opportunities: ProcessOpportunity[];
  totals: {
    annualHoursRecovered: number;
    productivityValueGbp: number;
    cashEquivalentGbp: number;
    fteEquivalent: number;
    implementationCostGbp: number;
    paybackMonths: number | null;
    threeYearOpportunityGbp: number;
  };
  assumptionsNote: string;
}

export const DEFAULT_INPUTS: RoiInputs = {
  loadedHourlyCostGbp: 63,
  adoptionRatePct: 75,
  implementationCostGbp: 85_000,
  cashConversionPct: 30,
};

export function loadMetrics() {
  return demoDb().prepare('SELECT * FROM metrics ORDER BY annual_volume DESC').all() as any[];
}

export function loadStoredInputs(): RoiInputs {
  try {
    const r = demoDb().prepare('SELECT * FROM roi_assumptions WHERE id = 1').get() as any;
    if (!r) return DEFAULT_INPUTS;
    return {
      loadedHourlyCostGbp: Number(r.loaded_hourly_cost_gbp),
      adoptionRatePct: Number(r.adoption_rate_pct),
      implementationCostGbp: Number(r.implementation_cost_gbp),
      cashConversionPct: DEFAULT_INPUTS.cashConversionPct,
    };
  } catch {
    return DEFAULT_INPUTS;
  }
}

/** Hours are the primary unit; money is derived from hours, never the reverse. */
export function computeRoi(
  inputs: Partial<RoiInputs> = {},
  overrides: Array<Partial<ProcessOpportunity> & { process: string }> = [],
): RoiResult {
  const cfg: RoiInputs = { ...loadStoredInputs(), ...inputs };
  const adoption = Math.max(0, Math.min(100, cfg.adoptionRatePct)) / 100;
  const cashRate = Math.max(0, Math.min(100, cfg.cashConversionPct)) / 100;

  const rows = loadMetrics();
  const opportunities: ProcessOpportunity[] = rows.map((m) => {
    const o = overrides.find((x) => x.process === m.process);
    const currentMinutes = o?.currentMinutes ?? Number(m.current_minutes);
    const aiAssistedMinutes = o?.aiAssistedMinutes ?? Number(m.ai_assisted_minutes);
    const annualVolume = o?.annualVolume ?? Number(m.annual_volume);

    const minutesSavedPerItem = Math.max(0, currentMinutes - aiAssistedMinutes);
    const annualHoursRecovered = (minutesSavedPerItem * annualVolume * adoption) / 60;
    const productivityValueGbp = annualHoursRecovered * cfg.loadedHourlyCostGbp;

    return {
      process: m.process, department: m.department, complexity: m.complexity,
      currentMinutes, aiAssistedMinutes, annualVolume,
      affectedEmployees: Number(m.affected_employees),
      minutesSavedPerItem,
      annualHoursRecovered: Math.round(annualHoursRecovered),
      productivityValueGbp: Math.round(productivityValueGbp),
      cashEquivalentGbp: Math.round(productivityValueGbp * cashRate),
      sharePct: 0,
    };
  });

  const totalValue = opportunities.reduce((s, o) => s + o.productivityValueGbp, 0);
  for (const o of opportunities) {
    o.sharePct = totalValue ? Math.round((o.productivityValueGbp / totalValue) * 1000) / 10 : 0;
  }
  opportunities.sort((a, b) => b.productivityValueGbp - a.productivityValueGbp);

  const totalHours = opportunities.reduce((s, o) => s + o.annualHoursRecovered, 0);
  const totalCash = opportunities.reduce((s, o) => s + o.cashEquivalentGbp, 0);

  // Payback is expressed against the cash-equivalent figure, not the headline
  // productivity number — paying back an investment requires actual cash.
  const paybackMonths = totalCash > 0
    ? Math.round((cfg.implementationCostGbp / totalCash) * 12 * 10) / 10
    : null;

  return {
    inputs: cfg,
    opportunities,
    totals: {
      annualHoursRecovered: totalHours,
      productivityValueGbp: totalValue,
      cashEquivalentGbp: totalCash,
      // A working year of ~1,650 productive hours per full-time employee.
      fteEquivalent: Math.round((totalHours / 1650) * 10) / 10,
      implementationCostGbp: cfg.implementationCostGbp,
      paybackMonths,
      threeYearOpportunityGbp: totalValue * 3 - cfg.implementationCostGbp,
    },
    assumptionsNote:
      `Assumes a loaded employee cost of £${cfg.loadedHourlyCostGbp}/hour and ${cfg.adoptionRatePct}% adoption ` +
      `of AI-assisted working. Productivity value represents recovered capacity; the cash-equivalent figure ` +
      `applies a ${cfg.cashConversionPct}% conversion assumption.`,
  };
}

/** Ranks phases by value against implementation difficulty (brief §41). */
export function recommendFirstPhase(roi: RoiResult) {
  const complexityWeight: Record<string, number> = {
    'Low': 1.0, 'Medium': 0.85, 'Medium–High': 0.65, 'High': 0.45,
  };
  const scored = roi.opportunities.map((o) => ({
    ...o,
    priorityScore: o.productivityValueGbp * (complexityWeight[o.complexity] ?? 0.5),
  })).sort((a, b) => b.priorityScore - a.priorityScore);

  const top = scored[0];
  return {
    process: top.process,
    reason:
      `${top.process} carries the largest recoverable capacity (${top.annualHoursRecovered.toLocaleString()} hours, ` +
      `£${top.productivityValueGbp.toLocaleString()} illustrative value) at ${top.complexity.toLowerCase()} ` +
      `implementation complexity, which gives the strongest return per unit of delivery risk.`,
    ranked: scored,
  };
}

export const ROI_DISCLAIMER =
  'Illustrative synthetic scenario — not a Field financial estimate. Figures derive from ' +
  'demonstration assumptions and should be recalculated from Field operational data.';
