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
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal-800">
            <span className="h-2.5 w-2.5 rotate-45 bg-white" />
          </span>
          <span className="leading-none">
            <span className="block text-[14px] font-semibold tracking-tight text-ink-950">Field</span>
            <span className="block text-[11px] text-ink-400">AI Opportunity Lab</span>
          </span>
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
