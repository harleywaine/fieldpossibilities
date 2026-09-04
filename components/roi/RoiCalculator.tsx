'use client';

import { useEffect, useMemo, useState } from 'react';

interface Opportunity {
  process: string; department: string; complexity: string;
  currentMinutes: number; aiAssistedMinutes: number; annualVolume: number;
  annualHoursRecovered: number; productivityValueGbp: number;
  cashEquivalentGbp: number; sharePct: number;
}
interface Roi {
  inputs: { loadedHourlyCostGbp: number; adoptionRatePct: number; implementationCostGbp: number; cashConversionPct: number };
  opportunities: Opportunity[];
  totals: {
    annualHoursRecovered: number; productivityValueGbp: number; cashEquivalentGbp: number;
    fteEquivalent: number; implementationCostGbp: number; paybackMonths: number | null;
    threeYearOpportunityGbp: number;
  };
  assumptionsNote: string;
}

const gbp = (n: number) => `£${Math.round(n).toLocaleString()}`;

export function RoiCalculator({ initial, compact = false }: { initial: Roi; compact?: boolean }) {
  const [inputs, setInputs] = useState(initial.inputs);
  const [overrides, setOverrides] = useState<Record<string, { currentMinutes: number; aiAssistedMinutes: number; annualVolume: number }>>(
    Object.fromEntries(initial.opportunities.map((o) => [o.process, {
      currentMinutes: o.currentMinutes, aiAssistedMinutes: o.aiAssistedMinutes, annualVolume: o.annualVolume,
    }])),
  );
  const [roi, setRoi] = useState<Roi>(initial);
  const [mode, setMode] = useState<'productivity' | 'cash'>('productivity');

  const payload = useMemo(() => ({
    inputs,
    overrides: Object.entries(overrides).map(([process, v]) => ({ process, ...v })),
  }), [inputs, overrides]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch('/api/roi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) setRoi((await res.json()).roi);
    }, 180);
    return () => clearTimeout(t);
  }, [payload]);

  const headline = mode === 'productivity'
    ? roi.totals.productivityValueGbp : roi.totals.cashEquivalentGbp;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ headline */}
      <section className="rounded-[2px] border border-signal-600/25 bg-signal-600/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">
              {mode === 'productivity' ? 'Illustrative annual productivity opportunity' : 'Illustrative annual cash-equivalent'}
            </p>
            <p className="figure mt-2 text-[2.75rem] font-light leading-none text-signal-700">
              {gbp(headline)}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {roi.totals.annualHoursRecovered.toLocaleString()} hours recovered · about{' '}
              {roi.totals.fteEquivalent} full-time equivalent
            </p>
          </div>

          <div className="flex rounded-[2px] border border-ink-200 bg-white p-0.5">
            {(['productivity', 'cash'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-[2px] px-3 py-1.5 text-xs font-medium transition ${
                  mode === m ? 'bg-signal-600 text-white' : 'text-ink-500 hover:text-signal-600'
                }`}
              >
                {m === 'productivity' ? 'Productivity value' : 'Direct cost saving'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[2px] border border-ink-200 bg-white p-3">
          <p className="text-xs leading-relaxed text-ink-600">
            {mode === 'productivity' ? (
              <>
                <strong className="text-ink-800">Productivity value is recovered capacity, not cash.</strong>{' '}
                Recovering {roi.totals.annualHoursRecovered.toLocaleString()} employee hours does not
                automatically mean Field’s payroll falls by {gbp(roi.totals.productivityValueGbp)}. The
                value more usually appears as increased capacity, faster response, greater sales
                throughput, or a reduced need for additional headcount.
              </>
            ) : (
              <>
                <strong className="text-ink-800">Direct cost saving applies a conversion assumption.</strong>{' '}
                This shows {roi.inputs.cashConversionPct}% of the productivity value as cash actually
                leaving the cost base. That conversion is a commercial decision, not a technical
                outcome, and should be set by Field.
              </>
            )}
          </p>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          <Kpi k="Implementation cost" v={gbp(roi.totals.implementationCostGbp)} />
          <Kpi k="Indicative payback" v={roi.totals.paybackMonths !== null ? `${roi.totals.paybackMonths} months` : '—'} />
          <Kpi k="3-year opportunity" v={gbp(roi.totals.threeYearOpportunityGbp)} />
          <Kpi k="Adoption assumed" v={`${roi.inputs.adoptionRatePct}%`} />
        </dl>
      </section>

      {/* -------------------------------------------------------- inputs */}
      <section className="card p-5">
        <h2 className="mb-4 label">
          Assumptions — change any of these
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Loaded employee cost (£/hour)" min={25} max={110} step={1}
            value={inputs.loadedHourlyCostGbp}
            onChange={(v) => setInputs({ ...inputs, loadedHourlyCostGbp: v })} />
          <Slider label="Adoption rate (%)" min={10} max={100} step={5}
            value={inputs.adoptionRatePct}
            onChange={(v) => setInputs({ ...inputs, adoptionRatePct: v })} />
          <Slider label="Implementation cost (£)" min={20000} max={300000} step={5000}
            value={inputs.implementationCostGbp} format={gbp}
            onChange={(v) => setInputs({ ...inputs, implementationCostGbp: v })} />
          <Slider label="Cash conversion (%)" min={0} max={100} step={5}
            value={inputs.cashConversionPct}
            onChange={(v) => setInputs({ ...inputs, cashConversionPct: v })} />
        </div>
      </section>

      {/* ------------------------------------------------- opportunities */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="label">
            Opportunities by process{compact ? ' — top three' : ''}
          </h2>
          {compact && (
            <a
              href="/roi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-medium text-signal-600 transition-colors hover:text-action-600"
            >
              Open the full model ↗
            </a>
          )}
        </div>
        {(compact ? roi.opportunities.slice(0, 3) : roi.opportunities).map((o) => (
          <article key={o.process} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-ink-900">{o.process}</h3>
                <p className="text-xs text-ink-400">{o.department} · {o.complexity} complexity</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium figure text-signal-700">
                  {gbp(mode === 'productivity' ? o.productivityValueGbp : o.cashEquivalentGbp)}
                </p>
                <p className="text-[11px] text-ink-400">
                  {o.annualHoursRecovered.toLocaleString()} hours · {o.sharePct}% of total
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-signal-500" style={{ width: `${o.sharePct}%` }} />
            </div>

            <div className={`mt-3 grid gap-3 sm:grid-cols-3 ${compact ? 'hidden' : ''}`}>
              <MiniInput label="Current minutes" value={overrides[o.process].currentMinutes}
                onChange={(v) => setOverrides({ ...overrides, [o.process]: { ...overrides[o.process], currentMinutes: v } })} />
              <MiniInput label="AI-assisted minutes" value={overrides[o.process].aiAssistedMinutes}
                onChange={(v) => setOverrides({ ...overrides, [o.process]: { ...overrides[o.process], aiAssistedMinutes: v } })} />
              <MiniInput label="Annual volume" value={overrides[o.process].annualVolume} step={50}
                onChange={(v) => setOverrides({ ...overrides, [o.process]: { ...overrides[o.process], annualVolume: v } })} />
            </div>

            <p className="mt-2 text-[11px] text-ink-400">
              Confidence: illustrative — derived from demonstration assumptions, not Field data.
            </p>
          </article>
        ))}
      </section>

      <p className="rounded-[2px] border border-[color:var(--color-caution-600)]/30 bg-[color:var(--color-caution-600)]/8 p-3 text-xs leading-relaxed text-ink-700">
        <strong className="text-[color:var(--color-caution-600)]">Illustrative synthetic scenario</strong>{' '}
        — not a Field financial estimate. {roi.assumptionsNote} Actual opportunity should be
        calculated from Field operational data.
      </p>
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[2px] border border-ink-200 bg-white p-3">
      <dt className="text-[11px] text-ink-400">{k}</dt>
      <dd className="figure mt-1 text-[15px] font-medium text-ink-800">{v}</dd>
    </div>
  );
}

function Slider({
  label, min, max, step, value, onChange, format,
}: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format?: (n: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-ink-600">{label}</span>
        <span className="mono figure text-[12px] font-medium text-signal-600">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-signal-600"
      />
    </label>
  );
}

function MiniInput({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] text-ink-400">{label}</span>
      <input
        type="number" value={value} step={step} min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="mt-0.5 w-full rounded-[2px] border border-ink-200 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-signal-500"
      />
    </label>
  );
}
