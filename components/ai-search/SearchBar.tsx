'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({
  initial = '', size = 'lg', autoFocus = false, onDark = false,
}: { initial?: string; size?: 'lg' | 'sm'; autoFocus?: boolean; onDark?: boolean }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setBusy(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const big = size === 'lg';

  return (
    <form onSubmit={submit} className="w-full">
      <div className={`group relative flex items-start gap-3 rounded-[3px] border border-ink-200 bg-white transition focus-within:border-signal-500 focus-within:ring-4 focus-within:ring-signal-600/10   ${big ? 'p-3' : 'p-2'}`}>
        <svg viewBox="0 0 20 20" className={`mt-2 ml-2 shrink-0 text-ink-400 ${big ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden="true">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
          rows={big ? 2 : 1}
          autoFocus={autoFocus}
          placeholder="What tooling are you looking for?"
          aria-label="Describe your tooling requirement"
          className={`min-h-0 flex-1 resize-none bg-transparent py-2 leading-relaxed text-ink-900 outline-none placeholder:text-ink-400  ${big ? 'text-base' : 'text-sm'}`}
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className={`shrink-0 rounded-[3px] bg-action-600 font-medium text-white transition hover:bg-action-500 disabled:opacity-40 ${big ? 'px-6 py-2.5 text-sm' : 'px-3.5 py-2 text-xs'}`}
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      {big && (
        <p className={`mt-2 px-1 text-xs ${onDark ? 'text-signal-300' : 'text-ink-400'}`}>
          Describe the aircraft, the maintenance task, or the tooling you need — in plain English.
          Press Enter to search.
        </p>
      )}
    </form>
  );
}
