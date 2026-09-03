import Link from 'next/link';

const PROMPTS = [
  'Tooling for Boeing 787 GEnx thrust reverser maintenance',
  'Handling equipment for a 737-800 stabilizer',
  'Show me tooling for Boeing 787 exhaust maintenance',
  'I need tooling for a 777 heavy maintenance programme',
];

export function SuggestedPrompts({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((p) => (
        <Link
          key={p}
          href={`/search?q=${encodeURIComponent(p)}`}
          className={
            onDark
              ? 'rounded-[3px] border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs text-white transition hover:border-white/50 hover:bg-white/20'
              : 'rounded-[3px] border border-ink-200 bg-white px-3.5 py-1.5 text-xs text-signal-600 transition hover:border-signal-300 hover:bg-ink-50'
          }
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
