/** Minimal structured logger with timing + progress helpers. */
const START = Date.now();

function ts(): string {
  const s = Math.floor((Date.now() - START) / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(3, ' ')}m${String(s % 60).padStart(2, '0')}s`;
}

export type Level = 'info' | 'warn' | 'error' | 'debug';

let debugEnabled = process.env.INGEST_DEBUG === '1';

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  if (level === 'debug' && !debugEnabled) return;
  const tag = { info: ' ', warn: ' WARN', error: 'ERROR', debug: 'DEBUG' }[level];
  const line = `[${ts()}]${tag} ${scope.padEnd(11)} ${msg}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  extra === undefined ? out(line) : out(line, extra);
}

export function makeLogger(scope: string) {
  return {
    info: (m: string, e?: unknown) => emit('info', scope, m, e),
    warn: (m: string, e?: unknown) => emit('warn', scope, m, e),
    error: (m: string, e?: unknown) => emit('error', scope, m, e),
    debug: (m: string, e?: unknown) => emit('debug', scope, m, e),
    /** Rewritable single-line progress (falls back to periodic lines when not a TTY). */
    progress: (done: number, total: number, note = '') => {
      const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
      const text = `${scope.padEnd(11)} ${done}/${total} (${pct}%) ${note}`;
      if (process.stdout.isTTY) {
        process.stdout.write(`\r[${ts()}]  ${text.slice(0, 150).padEnd(150)}`);
        if (done >= total) process.stdout.write('\n');
      } else if (done === total || done % 250 === 0) {
        emit('info', scope, `${done}/${total} (${pct}%) ${note}`);
      }
    },
  };
}

export type Logger = ReturnType<typeof makeLogger>;
