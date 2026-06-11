"use client";
import { useState, useMemo } from "react";
import { Fraunces } from "next/font/google";
import { formatUSD } from "@/lib/pricing";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Row = { id: string; name: string; image: string; tokens: number; cost: number };
type Metric = "cost" | "tokens";

function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function LeaderboardList({ rows, meId }: { rows: Row[]; meId: string }) {
  const [metric, setMetric] = useState<Metric>("cost"); // dollars is default

  const ranked = useMemo(
    () => [...rows].sort((a, b) => b[metric] - a[metric]).map((r, i) => ({ ...r, rank: i + 1 })),
    [rows, metric]
  );

  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-[#6B6862]">
          Ranked by {metric === "cost" ? "spend" : "tokens"}
        </p>
        <div className="relative">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="cursor-pointer appearance-none rounded-full border border-[#2C2C2A] bg-[#1C1C1A] py-1.5 pl-4 pr-9 text-sm text-[#F0EDE6] transition hover:border-[#383836] focus:border-[#CC785C] focus:outline-none"
          >
            <option value="cost">Cost ($)</option>
            <option value="tokens">Tokens</option>
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B988F]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {ranked.length === 0 && (
          <div className="rounded-2xl border border-[#2C2C2A] bg-[#1C1C1A] p-8 text-center text-[#6B6862]">
            No one&apos;s signed up yet. Be the first!
          </div>
        )}

        {ranked.map((r) => {
          const isMe = r.id === meId;
          const value = metric === "cost" ? r.cost : r.tokens;
          const top3 = r.rank <= 3 && value > 0;
          const display =
            value === 0 ? "—" : metric === "cost" ? formatUSD(r.cost) : fmtTokens(r.tokens);
          return (
            <div
              key={r.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${
                isMe ? "border-[#CC785C] bg-[#2A1A14]" : "border-[#2C2C2A] bg-[#1C1C1A]"
              }`}
            >
              <span
                className={`${serif.className} w-7 text-center text-2xl tabular-nums ${
                  top3 ? "text-[#CC785C]" : "text-[#4A4845]"
                }`}
              >
                {r.rank}
              </span>
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" width={36} height={36} className="rounded-full" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#242422] text-sm text-[#6B6862]">
                  {r.name.charAt(0)}
                </span>
              )}
              <span className="flex-1 truncate font-medium">
                {r.name}
                {isMe && <span className="ml-2 text-xs text-[#CC785C]">you</span>}
              </span>
              <span
                className={`${serif.className} text-xl tabular-nums ${
                  value === 0 ? "text-[#4A4845]" : ""
                }`}
              >
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}