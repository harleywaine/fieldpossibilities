/**
 * LLM provider abstraction (brief §44: do not hard-wire a single provider).
 *
 * Two implementations ship:
 *
 *  • `local`     — deterministic, composes prose strictly from retrieved fields.
 *                  No key, no network, no per-query cost. This is the default so
 *                  the demo cannot fail on a missing credential or rate limit.
 *  • `anthropic` — Claude, for more fluent prose. Enabled by setting
 *                  AI_PROVIDER=anthropic with ANTHROPIC_API_KEY present.
 *
 * Both paths receive the same grounded context and are held to the same rule:
 * factual claims must be traceable to a retrieved catalogue record (§20, §43).
 */

export interface CompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Deterministic fallback used when no LLM is configured or a call fails. */
  fallback: () => string;
}

export interface AIProvider {
  readonly name: string;
  readonly kind: 'local' | 'anthropic';
  readonly describe: string;
  complete(req: CompletionRequest): Promise<{ text: string; provider: string; grounded: true }>;
}

/**
 * Deterministic provider. It does not generate language models' prose — it
 * assembles sentences from values that were already retrieved, which makes
 * fabrication structurally impossible.
 */
class LocalProvider implements AIProvider {
  readonly name = 'local-grounded';
  readonly kind = 'local' as const;
  readonly describe = 'Deterministic grounded composition (no external model)';

  async complete(req: CompletionRequest) {
    return { text: req.fallback(), provider: this.name, grounded: true as const };
  }
}

class AnthropicProvider implements AIProvider {
  readonly kind = 'anthropic' as const;
  readonly name: string;
  readonly describe: string;
  private model: string;

  constructor(model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5') {
    this.model = model;
    this.name = model;
    this.describe = `Anthropic ${model}`;
  }

  async complete(req: CompletionRequest) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic();
      const response = await client.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: [{ role: 'user', content: req.prompt }],
      });
      const text = response.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!text) throw new Error('empty completion');
      return { text, provider: this.model, grounded: true as const };
    } catch (err) {
      // A provider outage must degrade to grounded output, never to a broken page.
      console.warn('[ai] provider failed, using deterministic fallback:', (err as Error).message);
      return { text: req.fallback(), provider: 'local-grounded (fallback)', grounded: true as const };
    }
  }
}

let cachedProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const configured = (process.env.AI_PROVIDER ?? 'local').toLowerCase();
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  cachedProvider =
    configured === 'anthropic' && hasKey ? new AnthropicProvider() : new LocalProvider();
  return cachedProvider;
}

export function providerInfo(): { name: string; kind: string; describe: string; usingLLM: boolean } {
  const p = getProvider();
  return { name: p.name, kind: p.kind, describe: p.describe, usingLLM: p.kind !== 'local' };
}
