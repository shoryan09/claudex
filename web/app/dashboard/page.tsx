import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { getWrapped } from "@/lib/stats";
import AutoRefresh from "@/app/autorefresh";
export const dynamic = "force-dynamic";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
function fmtHour(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${h < 12 ? "AM" : "PM"}`;
}

const COLORS = ["#CC785C", "#5E6B7D", "#7A8B6F", "#C9A87C"];
const CARD =
  "rounded-2xl border border-[#EEECE4] bg-white p-6 shadow-[0_1px_3px_rgba(20,20,19,0.04),0_12px_32px_-18px_rgba(20,20,19,0.12)]";
const LABEL = "text-xs font-medium uppercase tracking-[0.14em] text-[#9B988F]";

const icons: Record<string, ReactNode> = {
  messages: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  sessions: <><path d="M12 2 2 7l10 5 10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  days: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  streak: <path d="M13 2 3 14h7l-1 8 10-12h-7z" />,
};
function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function Donut({ data }: { data: { model: string; tokens: number }[] }) {
  const total = data.reduce((s, d) => s + d.tokens, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" width="116" height="116">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#EFEDE4" strokeWidth="14" />
      {data.map((d, i) => {
        const len = (d.tokens / total) * C;
        const el = (
          <circle key={d.model} cx="60" cy="60" r={r} fill="none" stroke={COLORS[i % COLORS.length]}
            strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
            transform="rotate(-90 60 60)" />
        );
        acc += len;
        return el;
      })}
      <text x="60" y="57" textAnchor="middle" fontSize="22" fontWeight="600" fill="#141413">{data.length}</text>
      <text x="60" y="73" textAnchor="middle" fontSize="9" letterSpacing="1" fill="#9B988F">MODELS</text>
    </svg>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: "7d" | "30d" = sp.range === "7d" ? "7d" : "30d";

  const session = await auth();
  if (!session?.user)
    return <main className={`${sans.className} flex min-h-screen items-center justify-center bg-[#FAF9F5] text-[#141413]`}>Please sign in on the home page first. <AutoRefresh seconds={15} /></main>;

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user)
    return <main className={`${sans.className} flex min-h-screen items-center justify-center bg-[#FAF9F5] text-[#141413]`}>No user found.</main>;

  const w = await getWrapped(String(user._id), range);
  const modelTotal = w.modelSplit.reduce((s, m) => s + m.tokens, 0) || 1;
  const topMax = w.topProjects[0]?.tokens || 1;

  const stats = [
    { label: "Messages", value: fmt(w.messages), icon: "messages", tint: "#5E6B7D" },
    { label: "Sessions", value: String(w.sessions), icon: "sessions", tint: "#CC785C" },
    { label: "Active days", value: String(w.activeDays), icon: "days", tint: "#7A8B6F" },
    { label: "Longest streak", value: `${w.longestStreak}d`, icon: "streak", tint: "#C9A87C" },
  ];

  const tab = (r: "7d" | "30d", label: string) => (
    <Link href={`/dashboard?range=${r}`}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${range === r ? "bg-white text-[#141413] shadow-sm" : "text-[#6B6862] hover:text-[#141413]"}`}>
      {label}
    </Link>
  );

  return (
    <main className={`${sans.className} relative min-h-screen overflow-hidden bg-[#FAF9F5] text-[#141413]`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(204,120,92,0.10), transparent 70%)" }} />

      <header className="relative border-b border-[#ECEAE2]/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className={`${serif.className} text-lg font-medium tracking-tight`}>Contexta</Link>
          <span className="text-sm text-[#6B6862]">{session.user.name}</span>
        </div>
      </header>

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[#9B988F]">last {range === "7d" ? "7" : "30"} days</p>
            <h1 className={`${serif.className} mt-1 text-4xl tracking-tight`}>Your Wrapped</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/og" target="_blank"
              className="cursor-pointer rounded-full border border-[#E0DDD2] bg-white/60 px-4 py-1.5 text-sm text-[#6B6862] transition hover:border-[#CC785C] hover:text-[#CC785C]">
              Share card
            </a>
            <div className="inline-flex rounded-full bg-[#F0EEE6] p-1">{tab("7d", "Week")}{tab("30d", "Month")}</div>
          </div>
        </div>

        {/* hero + archetype */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl p-8 text-white md:col-span-2 shadow-[0_10px_44px_-12px_rgba(204,120,92,0.55)]"
            style={{ background: "linear-gradient(135deg, #CC785C 0%, #B5634A 100%)" }}>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/70">Total tokens</p>
            <p className={`${serif.className} mt-3 text-7xl leading-none tracking-tight tabular-nums`}>{fmt(w.totalTokens)}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {([["in", w.inTokens], ["out", w.outTokens], ["cache", w.cacheCreate], ["reads", w.cacheRead]] as const).map(([k, v]) => (
                <span key={k} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">{fmt(v)} {k}</span>
              ))}
            </div>
          </div>

          <div className={`${CARD} flex flex-col md:col-span-1`}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#CC785C]">Archetype</p>
            <p className="mt-3 text-4xl">{w.archetype.emoji}</p>
            <p className={`${serif.className} mt-2 text-2xl leading-tight tracking-tight`}>{w.archetype.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#8A8782]">{w.archetype.reason}</p>
          </div>
        </div>

        {/* stat tiles */}
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`${CARD} flex items-center gap-4`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: s.tint + "1A", color: s.tint }}>
                <Icon name={s.icon} />
              </span>
              <div>
                <p className={`${serif.className} text-2xl leading-none tabular-nums`}>{s.value}</p>
                <p className="mt-1.5 text-xs uppercase tracking-wider text-[#9B988F]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* model split + busiest */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className={CARD}>
            <p className={LABEL}>Model split</p>
            <div className="mt-4 flex items-center gap-5">
              <Donut data={w.modelSplit} />
              <div className="flex-1 space-y-2.5">
                {w.modelSplit.map((m, i) => (
                  <div key={m.model} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#3F3D39]">
                      <span style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: COLORS[i % COLORS.length] }} />
                      {m.model.replace("claude-", "")}
                    </span>
                    <span className="tabular-nums text-[#9B988F]">{((m.tokens / modelTotal) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={CARD}>
            <p className={LABEL}>Busiest day</p>
            <p className={`${serif.className} mt-3 text-2xl`}>{w.busiestDay?.date ?? "—"}</p>
            <p className="mt-1 text-sm text-[#9B988F]">{w.busiestDay ? fmt(w.busiestDay.tokens) + " tokens" : ""}</p>
          </div>

          <div className={CARD}>
            <p className={LABEL}>Busiest hour</p>
            <p className={`${serif.className} mt-3 text-2xl`}>{w.busiestHour ? fmtHour(w.busiestHour.hour) : "—"}</p>
            <p className="mt-1 text-sm text-[#9B988F]">{w.busiestHour ? fmt(w.busiestHour.tokens) + " tokens" : ""}</p>
          </div>
        </div>

        {/* insight */}
        <div className={`${CARD} mt-4 flex items-start gap-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#CC785C1A", color: "#CC785C" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.5.5 1 1.5 1 2.5h6c0-1 .5-2 1-2.5A7 7 0 0 0 12 2z" />
            </svg>
          </span>
          <div>
            <p className={LABEL}>Insight</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#3F3D39]">{w.insight}</p>
          </div>
        </div>

        {/* top projects */}
        <div className={`${CARD} mt-4`}>
          <p className={LABEL}>Top projects</p>
          <div className="mt-5 space-y-4">
            {w.topProjects.map((p) => (
              <div key={p.project}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-[#3F3D39]">{p.project}</span>
                  <span className="tabular-nums text-[#9B988F]">{fmt(p.tokens)}</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[#F0EEE6]">
                  <div className="h-2.5 rounded-full" style={{ width: `${(p.tokens / topMax) * 100}%`, background: "linear-gradient(90deg, #CC785C, #D98E72)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}