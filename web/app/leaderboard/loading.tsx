
import { Fraunces, Inter } from "next/font/google";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans  = Inter({ subsets: ["latin"] });

const BONE = "bg-[#2C2C2A] rounded";

export default function LeaderboardLoading() {
  return (
    <main className={`${sans.className} min-h-screen bg-[#141413] text-[#F0EDE6] animate-pulse`}>
      {/* header */}
      <header className="border-b border-[#2C2C2A]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className={`${serif.className} text-lg font-medium`}>Contextis</span>
          <div className={`${BONE} h-4 w-20`} />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* page title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="space-y-2">
            <div className={`${BONE} h-3 w-16`} />
            <div className={`${BONE} h-10 w-44`} />
            <div className={`${BONE} h-3 w-52`} />
          </div>
          <div className={`${BONE} h-9 w-36 rounded-full`} />
        </div>

        {/* rows */}
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-[#2C2C2A] bg-[#1C1C1A] px-5 py-4"
            >
              <div className={`${BONE} h-7 w-6`} />
              <div className={`${BONE} h-9 w-9 rounded-full`} />
              <div className={`${BONE} h-4 flex-1`} style={{ maxWidth: `${55 + (i % 4) * 10}%` }} />
              <div className={`${BONE} h-6 w-14`} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}