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
              ? 'rounded-[2px] border border-white/20 bg-white/[0.07] px-3 py-1.5 text-[12px] text-signal-100 transition-colors hover:border-white/40 hover:bg-white/[0.14] hover:text-white'
              : 'rounded-[2px] border border-ink-200 bg-white px-3 py-1.5 text-[12px] text-ink-600 transition-colors hover:border-signal-300 hover:text-signal-600'
          }
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
