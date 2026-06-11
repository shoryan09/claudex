import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth, signIn } from "@/auth";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

async function githubSignIn() {
  "use server";
  await signIn("github", { redirectTo: "/dashboard" });
}

const MODELS = ["Opus 4.8", "Fable 5", "Sonnet 4.6", "Haiku 4.5", "Claude Code"];

const FAQ = [
  ["What is Contextis?", "A usage analytics platform for Claude Code. A CLI reads your local logs, syncs to the cloud, and a dashboard turns opaque AI usage into tokens burned, dollars spent, model splits, streaks, and a global leaderboard."],
  ["How long does setup take?", "Under a minute. npm install -g contextis, sign in with GitHub, paste your token. It autostarts in the background from then on."],
  ["What does it cost?", "Free. The CLI is on npm and the dashboard is open. No card, no trial."],
  ["Where does my data live?", "Your Claude Code logs are read locally and synced to your own account. Only you see your personal stats; the leaderboard shows aggregate token/cost totals."],
  ["Which models does it track?", "Every Claude tier — Opus, Sonnet, Haiku, and Fable 5 — with per-model cost based on current API pricing."],
];

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <main className={`${sans.className} min-h-screen bg-[#141413] text-[#F0EDE6]`}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee { animation: marquee 28s linear infinite; }
      `}</style>

      {/* ───────────── hero ───────────── */}
      <section className="mx-auto max-w-3xl px-6 pt-32 pb-14 text-center">
        <h1 className={`${serif.className} text-5xl leading-[1.05] tracking-tight sm:text-6xl`}>
          You should know where
          <br />
          <span className="text-[#CC785C]">every token goes.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-[#9B988F]">
          Tokens burned, dollars spent, model splits — one install, runs in the background.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3">
          {signedIn ? (
            <Link href="/dashboard" className="rounded-full bg-[#F0EDE6] px-5 py-2.5 text-sm font-medium text-[#141413] transition hover:bg-[#E4E1DA]">
              Open dashboard →
            </Link>
          ) : (
            <form action={githubSignIn}>
              <button type="submit" className="flex items-center gap-2 rounded-full bg-[#F0EDE6] px-5 py-2.5 text-sm font-medium text-[#141413] transition hover:bg-[#E4E1DA]">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                Sign in with GitHub
              </button>
            </form>
          )}
        </div>

        <code className="mt-8 inline-block rounded-lg border border-[#2C2C2A] bg-[#1C1C1A] px-4 py-2 text-sm text-[#9B988F]">
          npm install -g contextis
        </code>
      </section>

      {/* ───────────── model marquee ───────────── */}
      <section className="border-y border-[#2C2C2A] py-7 overflow-hidden">
        <p className="mb-5 text-center text-xs uppercase tracking-[0.14em] text-[#6B6862]">
          Tracks every Claude tier
        </p>
        <div className="flex w-max marquee">
          {[...MODELS, ...MODELS, ...MODELS, ...MODELS].map((m, i) => (
            <span key={i} className={`${serif.className} mx-8 whitespace-nowrap text-2xl text-[#4A4845]`}>
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* ───────────── feature spotlight ───────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <div className="grid items-center gap-10 rounded-3xl border border-[#2C2C2A] bg-[#1C1C1A] p-10 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#CC785C]">Cost, not just tokens</p>
            <h3 className={`${serif.className} mt-3 text-2xl tracking-tight`}>
              Know the dollar number, per model.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#9B988F]">
              Opus, Sonnet, Haiku, Fable — each priced at current API rates. The leaderboard
              ranks by spend by default, so you finally see what your AI habit actually costs.
            </p>
          </div>
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-[#242422] to-[#1C1C1A]">
            <span className={`${serif.className} text-5xl text-[#CC785C]`}>$1.2k</span>
          </div>
        </div>
      </section>

      {/* ───────────── faq ───────────── */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <p className="text-center text-xs uppercase tracking-[0.14em] text-[#6B6862]">FAQ</p>
        <h2 className={`${serif.className} mt-3 text-center text-3xl tracking-tight`}>Questions</h2>
        <div className="mt-10 divide-y divide-[#2C2C2A] border-y border-[#2C2C2A]">
          {FAQ.map(([q, a], i) => (
            <details key={i} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[#F0EDE6]">
                <span className="text-sm font-medium">{q}</span>
                <span className="text-[#6B6862] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#9B988F]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────────── final cta ───────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-28 text-center">
        <h2 className={`${serif.className} text-4xl tracking-tight`}>Start measuring today.</h2>
        <p className="mt-3 text-[#9B988F]">The longer you wait, the more invisible spend you miss.</p>
      </section>
    </main>
  );
}