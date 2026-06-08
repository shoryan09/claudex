import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { auth, signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"] });

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

export default async function Home() {
  const session = await auth();

  let cliToken = "";
  if (session?.user) {
    await connectDB();
    const user = await User.findOne({ githubId: (session as any).githubId });
    cliToken = user?.cliToken ?? "";
  }

  return (
    <main className={`${sans.className} flex min-h-screen flex-col bg-[#141413] text-[#F0EDE6] pt-16`}>

      {/* center */}
      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        {!session?.user ? (
          /* ---------- signed out ---------- */
          <div className="w-full max-w-md text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#CC785C]">
              Claude Code, wrapped
            </p>
            <h1 className={`${serif.className} mt-5 text-5xl leading-[1.1] tracking-tight`}>
              See how you code with Claude.
            </h1>
            <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-[#9B988F]">
              Your tokens, models, and coding habits — quietly tracked and turned
              into a personal recap.
            </p>

            <form className="mt-9" action={async () => { "use server"; await signIn("github"); }}>
              <button
                className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[#F0EDE6] px-7 py-3.5 text-[15px] font-medium text-[#141413] shadow-sm transition hover:bg-[#E4E1DA] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CC785C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141413]"
              >
                <GitHubIcon />
                Sign in with GitHub
              </button>
            </form>

            <Link
              href="/leaderboard"
              className="mt-6 inline-block text-sm text-[#9B988F] underline-offset-4 transition hover:text-[#CC785C] hover:underline"
            >
              Or peek at the leaderboard →
            </Link>

            <p className="mt-6 text-xs text-[#6B6862]">
              Only aggregate stats are stored — never your code or prompts.
            </p>
          </div>
        ) : (
          /* ---------- signed in ---------- */
          <div className="w-full max-w-lg">
            <h1 className={`${serif.className} text-4xl tracking-tight`}>
              Welcome back, {session.user.name?.split(" ")[0] ?? "there"}.
            </h1>
            <p className="mt-3 text-[15px] text-[#9B988F]">
              Install the CLI, connect it with your personal token, then run a sync.
            </p>

            <div className="mt-7">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B6862]">
                Your CLI token
              </p>
              <pre className="overflow-x-auto rounded-xl border border-[#2C2C2A] bg-[#1C1C1A] px-4 py-3 font-mono text-sm text-[#F0EDE6]">
                {cliToken || "—"}
              </pre>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B6862]">
                Connect your CLI
              </p>
              <pre className="overflow-x-auto rounded-xl border border-[#2C2C2A] bg-[#1C1C1A] px-4 py-3 font-mono text-sm text-[#9B988F]">
                {`npm install -g contextis\ncontextis login ${cliToken} --server https://contextis.vercel.app/api/ingest`}
              </pre>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#F0EDE6] px-7 py-3.5 text-[15px] font-medium text-[#141413] shadow-sm transition hover:bg-[#E4E1DA] hover:shadow-md"
              >
                Open your dashboard <span aria-hidden>→</span>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex cursor-pointer items-center rounded-full border border-[#2C2C2A] px-7 py-3.5 text-[15px] font-medium text-[#F0EDE6] transition hover:border-[#CC785C] hover:text-[#CC785C]"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}