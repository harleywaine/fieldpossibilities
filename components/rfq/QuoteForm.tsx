'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalogue/types.ts';
import { Button } from '@/components/ui/primitives.tsx';

/** Demonstration customer (brief §33) — clearly labelled as synthetic. */
const DEMO = {
  company: 'Global Aero MRO',
  contact: 'Sarah Mitchell',
  email: 'sarah.mitchell@globalaero-mro.example',
  location: 'Singapore',
};

export function QuoteForm({ products, query }: { products: Product[]; query: string }) {
  const [form, setForm] = useState({
    company: '', contact: '', email: '', location: '',
    aircraft: '', requirement: query, requiredDate: '', additional: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productIds: products.map((p) => p.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to record request.');
      setDone({ reference: data.reference });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record request.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-strong-600)]/12 text-[color:var(--color-strong-600)] dark:text-[color:var(--color-strong-400)]">
          <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Quote request recorded</h2>
        <p className="mono mt-1 text-sm text-signal-600 dark:text-signal-400">Reference {done.reference}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600 dark:text-ink-300">
          This request was saved locally in the prototype. <strong>It has not been transmitted to
          Field International</strong> — this demonstration has no commercial backend integration.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button href="/requests" variant="secondary">View recorded requests</Button>
          <Button href="/search">New search</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-lg border border-[color:var(--color-caution-600)]/25 bg-[color:var(--color-caution-600)]/8 p-3">
        <p className="text-xs text-ink-700 dark:text-ink-200">
          <strong>Demonstration only.</strong> Nothing entered here is sent to Field International.
          Use synthetic details.{' '}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, ...DEMO }))}
            className="font-medium text-signal-600 underline underline-offset-2 dark:text-signal-400"
          >
            Fill with demo customer
          </button>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company" required {...field('company')} />
        <Input label="Contact" required {...field('contact')} />
        <Input label="Email" type="email" required {...field('email')} />
        <Input label="Location" {...field('location')} />
        <Input label="Aircraft" placeholder="e.g. Boeing 787-9" {...field('aircraft')} />
        <Input label="Required date" type="date" {...field('requiredDate')} />
      </div>

      <Textarea label="Maintenance requirement" rows={3} {...field('requirement')} />

      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Selected tooling ({products.length})
        </span>
        {products.length === 0 ? (
          <p className="text-sm text-ink-400">
            No products selected.{' '}
            <Link href="/search" className="text-signal-600 underline">Search the catalogue</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 dark:divide-ink-800 dark:border-ink-800">
            {products.map((p) => (
              <li key={p.id} className="flex items-baseline gap-3 p-2.5">
                <span className="mono shrink-0 text-xs font-semibold text-signal-600 dark:text-signal-400">
                  {p.partNumber ?? p.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-600 dark:text-ink-300">{p.name}</span>
                <span className="shrink-0 text-[11px] text-ink-400">
                  {p.leadTimeDays !== null ? `${p.leadTimeDays} days` : 'lead time not published'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Textarea label="Additional information" rows={3} {...field('additional')} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? 'Recording…' : 'Request a quote'}</Button>
        <p className="text-xs text-ink-400">Creates a local demo RFQ record.</p>
      </div>
    </form>
  );
}

function Input({ label, required, ...rest }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}{required && <span className="text-signal-600"> *</span>}
      </span>
      <input
        required={required}
        {...rest}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-signal-400 focus:ring-4 focus:ring-signal-500/10 dark:border-ink-700 dark:bg-ink-850"
      />
    </label>
  );
}

function Textarea({ label, ...rest }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea
        {...rest}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-signal-400 focus:ring-4 focus:ring-signal-500/10 dark:border-ink-700 dark:bg-ink-850"
      />
    </label>
  );
}
