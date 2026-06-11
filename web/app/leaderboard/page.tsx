import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { Bucket } from "@/models/bucket";
import { User } from "@/models/user";
import { costForModel, type TokenCounts } from "@/lib/pricing";
import LeaderboardList from "@/components/LeaderboardList";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: "7d" | "30d" = sp.range === "7d" ? "7d" : "30d";
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  await connectDB();

  // group by owner + model so we can price each tier correctly
  const [session, agg, allUsers] = await Promise.all([
    auth(),
    Bucket.aggregate([
      { $match: { date: { $gte: cutoffStr } } },
      {
        $group: {
          _id: { owner: "$owner", model: "$model" },
          input:      { $sum: { $ifNull: ["$inTokens", 0] } },
          output:     { $sum: { $ifNull: ["$outTokens", 0] } },
          cacheWrite: { $sum: { $ifNull: ["$cacheCreate", 0] } },
          cacheRead:  { $sum: { $ifNull: ["$cacheRead", 0] } },
        },
      },
    ]),
    User.find({}).lean(),
  ]);

  // accumulate tokens + $ cost per owner across their model rows
  const statMap = new Map<string, { tokens: number; cost: number }>();
  for (const a of agg as any[]) {
    const owner = String(a._id.owner);
    const counts: TokenCounts = {
      input: a.input, output: a.output, cacheWrite: a.cacheWrite, cacheRead: a.cacheRead,
    };
    const tokens = counts.input + counts.output + counts.cacheWrite + counts.cacheRead;
    const cost = costForModel(a._id.model, counts);
    const cur = statMap.get(owner) ?? { tokens: 0, cost: 0 };
    cur.tokens += tokens;
    cur.cost += cost;
    statMap.set(owner, cur);
  }

  // find "me" from already-fetched users (no extra DB call)
  let meId = "";
  if (session?.user) {
    const meUser = (allUsers as any[]).find(
      (u) => String(u.githubId) === String((session as any).githubId)
    );
    meId = meUser ? String(meUser._id) : "";
  }

  // rows for ALL signed-up users; ranking happens client-side per metric
  const rows = (allUsers as any[]).map((u) => {
    const s = statMap.get(String(u._id)) ?? { tokens: 0, cost: 0 };
    return {
      id:     String(u._id),
      name:   u.name  ?? "Anonymous coder",
      image:  u.image ?? "",
      tokens: s.tokens,
      cost:   s.cost,
    };
  });

  const tab = (r: "7d" | "30d", label: string) => (
    <Link
      href={`/leaderboard?range=${r}`}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        range === r ? "bg-[#2C2C2A] text-[#F0EDE6] shadow-sm" : "text-[#9B988F] hover:text-[#F0EDE6]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className={`${sans.className} min-h-screen bg-[#141413] text-[#F0EDE6]`}>
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#CC785C]">Compete</p>
            <h1 className={`${serif.className} mt-2 text-4xl tracking-tight`}>Leaderboard</h1>
            <p className="mt-1 text-sm text-[#6B6862]">
              Top coders · last {range === "7d" ? "7" : "30"} days
            </p>
          </div>
          <div className="inline-flex rounded-full bg-[#1C1C1A] p-1">
            {tab("7d", "Week")}
            {tab("30d", "Month")}
          </div>
        </div>

        <LeaderboardList rows={rows} meId={meId} />

        <p className="mt-8 text-center text-xs text-[#6B6862]">
          Onwards and Upwards 🚀
        </p>
      </div>
    </main>
  );
}