// Minimal OpenRouter chat-completions client (browser-side; the key never leaves this browser except to OpenRouter).

const BASE = 'https://openrouter.ai/api/v1';

export interface Tool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  toolArgs: Record<string, unknown> | null;
  content: string;
  cost: number;
  tokens: number;
  model: string;
}

export class OpenRouterError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function chat(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tool?: Tool;
  temperature?: number;
  maxTokens?: number;
  forceTool?: boolean;
  signal?: AbortSignal;
}): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens ?? 6000,
    usage: { include: true },
  };
  if (opts.tool) {
    body.tools = [opts.tool];
    body.tool_choice = opts.forceTool === false ? 'auto' : { type: 'function', function: { name: opts.tool.function.name } };
  }
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': location.origin,
      'X-Title': 'How I Met Your LLM',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new OpenRouterError(msg, res.status);
  }
  const msg = json.choices?.[0]?.message ?? {};
  const content: string = typeof msg.content === 'string' ? msg.content : '';
  let toolArgs: Record<string, unknown> | null = null;
  const call = msg.tool_calls?.[0];
  if (call?.function?.arguments) {
    toolArgs = parseLooseJson(call.function.arguments);
  }
  if (!toolArgs && content) toolArgs = parseLooseJson(content);
  return {
    toolArgs,
    content,
    cost: Number(json.usage?.cost ?? 0) || 0,
    tokens: Number(json.usage?.total_tokens ?? 0) || 0,
    model: json.model ?? opts.model,
  };
}

/** Parse JSON that may be wrapped in prose or code fences, or be a JSON string of JSON. */
export function parseLooseJson(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return null;
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      if (typeof v === 'string') return tryParse(v);
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const v = tryParse(fenced[1]);
    if (v) return v;
  }
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) return tryParse(raw.slice(a, b + 1));
  return null;
}

export interface ModelInfo {
  id: string;
  name: string;
  promptPrice: number;
  completionPrice: number;
}

export async function listModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? [])
    .filter((m: { supported_parameters?: string[] }) => m.supported_parameters?.includes('tools'))
    .map((m: { id: string; name: string; pricing?: { prompt?: string; completion?: string } }) => ({
      id: m.id,
      name: m.name,
      promptPrice: Number(m.pricing?.prompt ?? 0),
      completionPrice: Number(m.pricing?.completion ?? 0),
    }));
}
