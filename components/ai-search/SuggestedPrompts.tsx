import Link from 'next/link';

const PROMPTS = [
  'Tooling for Boeing 787 GEnx thrust reverser maintenance',
  'Handling equipment for a 737-800 stabilizer',
  'Show me tooling for Boeing 787 exhaust maintenance',
  'I need tooling for a 777 heavy maintenance programme',
];

export function SuggestedPrompts() {
  return (
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map((p) => (
        <Link
          key={p}
          href={`/search?q=${encodeURIComponent(p)}`}
          className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs text-ink-600 transition hover:border-signal-300 hover:text-signal-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-signal-400"
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
