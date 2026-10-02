import type { Metadata } from 'next';
import { safeNext } from '@/lib/access.ts';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#07162a] px-4 py-10"
      style={{
        backgroundImage:
          'radial-gradient(60% 60% at 80% 0%, rgba(17,96,173,0.5), transparent 70%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: 'auto, 32px 32px, 32px 32px',
      }}
    >
      <form
        method="post"
        action="/api/unlock"
        className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]"
      >
        <input type="hidden" name="next" value={safeNext(next)} />
        <span className="flex items-center justify-between gap-3">
          <img src="https://www.fieldinternational.com/wp-content/uploads/2021/03/field-international-logo.svg" alt="Field International" style={{ height: 48, width: 'auto' }} />
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-400">AI Opportunity Lab</span>
        </span>

        <h1 className="mt-7 font-display text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink-950">
          This demo is private.
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">Enter the password you were sent with the link.</p>

        <label className="mt-6 block">
          <span className="text-[12px] font-medium text-ink-700">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            className={`mt-1.5 h-11 w-full rounded-lg border px-3 text-[14px] text-ink-950 outline-none transition-shadow focus:ring-2 ${
              error ? 'border-action-600 focus:ring-action-600/15' : 'border-ink-200 focus:border-signal-500 focus:ring-signal-500/15'
            }`}
          />
        </label>
        {error && <p className="mt-2 text-[12.5px] text-action-600">That password isn’t right. Try again.</p>}

        <button
          type="submit"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#0a1a2f] text-[14px] font-semibold text-white transition-colors hover:bg-signal-800"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
