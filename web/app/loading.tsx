import { Fraunces, Inter } from "next/font/google";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans  = Inter({ subsets: ["latin"] });

const BONE = "bg-[#2C2C2A] rounded";

export default function HomeLoading() {
  return (
    <main className={`${sans.className} flex min-h-screen flex-col bg-[#141413] animate-pulse`}>
      {/* header */}
      <header className="flex items-center justify-between px-8 py-6">
        <span className={`${serif.className} text-xl font-medium tracking-tight text-[#F0EDE6]`}>
          Contextis
        </span>
      </header>

      {/* centered content */}
      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md text-center flex flex-col items-center gap-4">
          {/* "Claude Code, wrapped" label */}
          <div className={`${BONE} h-3 w-32`} />

          {/* headline */}
          <div className="space-y-2 w-full">
            <div className={`${BONE} h-12 w-full`} />
            <div className={`${BONE} h-12 w-4/5 mx-auto`} />
          </div>

          {/* description */}
          <div className="space-y-2 w-full mt-1">
            <div className={`${BONE} h-3.5 w-full`} />
            <div className={`${BONE} h-3.5 w-11/12 mx-auto`} />
            <div className={`${BONE} h-3.5 w-3/4 mx-auto`} />
          </div>

          {/* CTA button */}
          <div className={`${BONE} h-12 w-52 rounded-full mt-3`} />

          {/* leaderboard link */}
          <div className={`${BONE} h-3 w-44`} />

          {/* privacy note */}
          <div className={`${BONE} h-3 w-64 mt-1`} />
        </div>
      </div>
    </main>
  );
}