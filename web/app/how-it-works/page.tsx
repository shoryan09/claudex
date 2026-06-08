import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans  = Inter({ subsets: ["latin"] });

const STEPS = [
  {
    title: "Sign in with GitHub",
    desc: "Create your account. We generate a personal CLI token tied to your GitHub profile — no passwords, no extra setup.",
    code: null,
  },
  {
    title: "Install the CLI",
    desc: "Add the lightweight background agent to your machine with a single command.",
    code: "npm install -g contextis",
  },
  {
    title: "Connect your token",
    desc: "Link the CLI to your account. Your token is shown on the home page after signing in.",
    code: "contextis login <your-token> --server https://contextis.vercel.app/api/ingest",
  },
  {
    title: "Code with Claude",
    desc: "Use Claude Code as you normally would. Contextis watches your JSONL usage logs silently in the background — zero interruptions.",
    code: null,
  },
  {
    title: "See your Wrapped",
    desc: "Head to your personal dashboard for token breakdowns, session history, active days, streaks, and your developer archetype.",
    code: null,
  },
];

export default function HowItWorks() {
  return (
    <main className={`${sans.className} min-h-screen bg-[#141413] text-[#F0EDE6]`}>

      <div className="mx-auto max-w-2xl px-6 pt-24 pb-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#CC785C]">
          Setup guide
        </p>
        <h1 className={`${serif.className} mt-3 text-5xl tracking-tight`}>
          How it works
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#9B988F]">
          Up and running in under a minute.
        </p>

        <ol className="mt-12 space-y-10">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CC785C]/15 text-sm font-semibold text-[#CC785C]">
                {i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <p className={`${serif.className} text-xl tracking-tight`}>{step.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#9B988F]">{step.desc}</p>
                {step.code && (
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-[#2C2C2A] bg-[#1C1C1A] px-4 py-3 font-mono text-sm text-[#9B988F]">
                    {step.code}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 border-t border-[#2C2C2A] pt-10">
          <p className={`${serif.className} text-2xl`}>Ready to start tracking?</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#F0EDE6] px-7 py-3.5 text-[15px] font-medium text-[#141413] transition hover:bg-[#E4E1DA]"
            >
              Get started →
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center rounded-full border border-[#2C2C2A] px-7 py-3.5 text-[15px] font-medium text-[#F0EDE6] transition hover:border-[#CC785C] hover:text-[#CC785C]"
            >
              View leaderboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}