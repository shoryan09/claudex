import Link from "next/link";
import mongoose from "mongoose";
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

  // sum tokens per user over the window
  const agg = await Bucket.aggregate([
    { $match: { date: { $gte: cutoffStr } } },
    { $group: { _id: "$owner", total: { $sum: { $add: ["$inTokens", "$outTokens", "$cacheCreate"] } } } },
    { $sort: { total: -1 } },
    { $limit: 50 },
  ]);

  const ids = agg.map((a) => a._id).filter((id: string) => mongoose.isValidObjectId(id));
  const users = await User.find({ _id: { $in: ids } }).lean();
  const userMap = new Map(users.map((u: any) => [String(u._id), u]));

  // who am I (for highlighting)?
  const session = await auth();
  let meId = "";
  if (session?.user) {
    const me = await User.findOne({ githubId: (session as any).githubId }).lean();
    meId = me ? String((me as any)._id) : "";
  }

  const rows = agg.map((a, i) => {
    const u = userMap.get(a._id) as any;
    return { rank: i + 1, id: a._id, name: u?.name ?? "Anonymous coder", image: u?.image ?? "", total: a.total };
  });

  const tab = (r: "7d" | "30d", label: string) => (
    <Link
      href={`/leaderboard?range=${r}`}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        range === r ? "bg-white text-[#141413] shadow-sm" : "text-[#6B6862] hover:text-[#141413]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main className={`${sans.className} min-h-screen bg-[#FAF9F5] text-[#141413]`}>
      <header className="border-b border-[#ECEAE2]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className={`${serif.className} text-lg font-medium tracking-tight`}>claudex</Link>
          {session?.user ? (
            <Link href="/dashboard" className="text-sm text-[#6B6862] transition hover:text-[#141413]">My dashboard</Link>
          ) : (
            <Link href="/" className="text-sm text-[#6B6862] transition hover:text-[#141413]">Sign in</Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#CC785C]">Compete</p>
            <h1 className={`${serif.className} mt-2 text-4xl tracking-tight`}>Leaderboard</h1>
            <p className="mt-1 text-sm text-[#9B988F]">Most tokens burned · last {range === "7d" ? "7" : "30"} days</p>
          </div>
          <div className="inline-flex rounded-full bg-[#F0EEE6] p-1">
            {tab("7d", "Week")}
            {tab("30d", "Month")}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {rows.length === 0 && (
            <div className="rounded-2xl border border-[#ECEAE2] bg-white p-8 text-center text-[#9B988F]">
              No one's on the board yet. Be the first — sync your usage and refresh.
            </div>
          )}

          {rows.map((r) => {
            const isMe = r.id === meId;
            const top3 = r.rank <= 3;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-[0_1px_2px_rgba(20,20,19,0.04)] ${
                  isMe ? "border-[#CC785C] bg-[#F7ECE6]" : "border-[#ECEAE2] bg-white"
                }`}
              >
                <span className={`${serif.className} w-7 text-center text-2xl tabular-nums ${top3 ? "text-[#CC785C]" : "text-[#C4C0B6]"}`}>
                  {r.rank}
                </span>
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" width={36} height={36} className="rounded-full" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0EEE6] text-sm text-[#9B988F]">
                    {r.name.charAt(0)}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">
                  {r.name}
                  {isMe && <span className="ml-2 text-xs text-[#CC785C]">you</span>}
                </span>
                <span className={`${serif.className} text-xl tabular-nums`}>{fmt(r.total)}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#9B988F]">
          Only aggregate token counts are shown — never your code or prompts.
        </p>
      </div>
    </main>
  );
}