import Link from "next/link";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { getWrapped } from "@/lib/stats";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
function fmtHour(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${h < 12 ? "AM" : "PM"}`;
}

const BAR = ["bg-orange-500", "bg-purple-500", "bg-sky-500", "bg-emerald-500"];
const DOT = ["text-orange-400", "text-purple-400", "text-sky-400", "text-emerald-400"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: "7d" | "30d" = sp.range === "7d" ? "7d" : "30d";

  const session = await auth();
  if (!session?.user)
    return <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">Please sign in on the home page first.</main>;

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user)
    return <main className="min-h-screen bg-neutral-950 text-neutral-100 p-10">No user found.</main>;

  const w = await getWrapped(String(user._id), range);
  const modelTotal = w.modelSplit.reduce((s, m) => s + m.tokens, 0) || 1;
  const topMax = w.topProjects[0]?.tokens || 1;

  const statCards = [
    { label: "Messages", value: fmt(w.messages) },
    { label: "Sessions", value: String(w.sessions) },
    { label: "Active days", value: String(w.activeDays) },
    { label: "Longest streak", value: `${w.longestStreak}d` },
  ];

  const tab = (r: "7d" | "30d", label: string) => (
    <Link
      href={`/dashboard?range=${r}`}
      className={`rounded-md px-3 py-1 text-sm ${range === r ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-neutral-400">{session.user.name} · last {range === "7d" ? "7" : "30"} days</p>
        <h1 className="mt-1 text-3xl font-bold">Your Claude Code Wrapped</h1>

        {/* range toggle */}
        <div className="mt-4 inline-flex rounded-lg border border-neutral-800 p-1">
          {tab("7d", "Week")}
          {tab("30d", "Month")}
        </div>

        {/* archetype */}
        <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Your archetype</p>
          <p className="mt-1 text-2xl font-bold">{w.archetype.emoji} {w.archetype.name}</p>
          <p className="mt-1 text-sm text-neutral-400">{w.archetype.reason}</p>
        </div>

        {/* hero */}
        <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-8">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total tokens</p>
          <p className="mt-2 text-6xl font-bold tabular-nums">{fmt(w.totalTokens)}</p>
          <p className="mt-2 text-sm text-neutral-400">
            {fmt(w.inTokens)} in · {fmt(w.outTokens)} out · {fmt(w.cacheCreate)} cache · {fmt(w.cacheRead)} cache reads
          </p>
        </div>

        {/* insight */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs text-neutral-400">Insight</p>
          <p className="mt-1 text-sm text-neutral-200">{w.insight}</p>
        </div>

        {/* stat grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs text-neutral-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* busiest */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs text-neutral-400">Busiest day</p>
            <p className="mt-1 text-xl font-semibold">{w.busiestDay?.date ?? "—"}</p>
            <p className="text-sm text-neutral-500">{w.busiestDay ? fmt(w.busiestDay.tokens) + " tokens" : ""}</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs text-neutral-400">Busiest hour</p>
            <p className="mt-1 text-xl font-semibold">{w.busiestHour ? fmtHour(w.busiestHour.hour) : "—"}</p>
            <p className="text-sm text-neutral-500">{w.busiestHour ? fmt(w.busiestHour.tokens) + " tokens" : ""}</p>
          </div>
        </div>

        {/* model split */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm font-medium">Model split</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-800">
            {w.modelSplit.map((m, i) => (
              <div key={m.model} className={BAR[i % 4]} style={{ width: `${(m.tokens / modelTotal) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {w.modelSplit.map((m, i) => (
              <div key={m.model} className="flex justify-between text-sm">
                <span className="text-neutral-300"><span className={DOT[i % 4]}>●</span> {m.model}</span>
                <span className="tabular-nums text-neutral-400">{((m.tokens / modelTotal) * 100).toFixed(0)}% · {fmt(m.tokens)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top projects */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm font-medium">Top projects</p>
          <div className="mt-3 space-y-3">
            {w.topProjects.map((p) => (
              <div key={p.project}>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-200">{p.project}</span>
                  <span className="tabular-nums text-neutral-400">{fmt(p.tokens)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-neutral-800">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(p.tokens / topMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}