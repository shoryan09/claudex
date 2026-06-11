type Rate = { input: number; output: number; cacheWrite: number; cacheRead: number };

const PRICING: Record<"fable" | "opus" | "sonnet" | "haiku", Rate> = {
  fable:  { input: 10,  output: 50, cacheWrite: 12.5,  cacheRead: 1.0  }, // claude-fable-5
  opus:   { input: 5,   output: 25, cacheWrite: 6.25,  cacheRead: 0.5  }, // opus 4.8
  sonnet: { input: 3,   output: 15, cacheWrite: 3.75,  cacheRead: 0.3  },
  haiku:  { input: 0.8, output: 4,  cacheWrite: 1.0,   cacheRead: 0.08 },
};

function tierFor(model: string): keyof typeof PRICING {
  const m = (model || "").toLowerCase();
  if (m.includes("fable") || m.includes("mythos")) return "fable";
  if (m.includes("opus")) return "opus";
  if (m.includes("haiku")) return "haiku";
  return "sonnet";
}

export type TokenCounts = { input: number; output: number; cacheWrite: number; cacheRead: number };

export function costForModel(model: string, t: TokenCounts): number {
  const r = PRICING[tierFor(model)];
  return (
    t.input * r.input +
    t.output * r.output +
    t.cacheWrite * r.cacheWrite +
    t.cacheRead * r.cacheRead
  ) / 1_000_000;
}

export function formatUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}