import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { Bucket } from "@/models/bucket";
import { User } from "@/models/user";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

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

  // fetch all users + token aggregation in parallel
  const [session, agg, allUsers] = await Promise.all([
    auth(),
    Bucket.aggregate([
      { $match: { date: { $gte: cutoffStr } } },
      { $group: { _id: "$owner", total: { $sum: { $add: ["$inTokens", "$outTokens", "$cacheCreate"] } } } },
    ]),
    User.find({}).lean(),
  ]);

  // map userId → token total for quick lookup
  const tokenMap = new Map<string, number>(
    agg.map((a: any) => [String(a._id), a.total])
  );

  // find "me" from the already-fetched allUsers (no extra DB call)
  let meId = "";
  if (session?.user) {
    const meUser = (allUsers as any[]).find(
      (u) => String(u.githubId) === String((session as any).githubId)
    );
    meId = meUser ? String(meUser._id) : "";
  }

  // build rows for ALL signed-up users, merge token totals
  const rows = (allUsers as any[])
    .map((u) => ({
      id:    String(u._id),
      name:  u.name  ?? "Anonymous coder",
      image: u.image ?? "",
      total: tokenMap.get(String(u._id)) ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, rank: i + 1 }));

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
              Most tokens burned · last {range === "7d" ? "7" : "30"} days
            </p>
          </div>
          <div className="inline-flex rounded-full bg-[#1C1C1A] p-1">
            {tab("7d", "Week")}
            {tab("30d", "Month")}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {rows.length === 0 && (
            <div className="rounded-2xl border border-[#2C2C2A] bg-[#1C1C1A] p-8 text-center text-[#6B6862]">
              No one's signed up yet. Be the first!
            </div>
          )}

          {rows.map((r) => {
            const isMe = r.id === meId;
            const top3 = r.rank <= 3 && r.total > 0;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${
                  isMe ? "border-[#CC785C] bg-[#2A1A14]" : "border-[#2C2C2A] bg-[#1C1C1A]"
                }`}
              >
                <span className={`${serif.className} w-7 text-center text-2xl tabular-nums ${top3 ? "text-[#CC785C]" : "text-[#4A4845]"}`}>
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
                <span className={`${serif.className} text-xl tabular-nums ${r.total === 0 ? "text-[#4A4845]" : ""}`}>
                  {r.total === 0 ? "—" : fmt(r.total)}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B6862]">
          Onwards and Upwards 🚀
        </p>
      </div>
    </main>
  );
}