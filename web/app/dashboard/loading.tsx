
import { Fraunces, Inter } from "next/font/google";

const serif = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });
const sans  = Inter({ subsets: ["latin"] });

const CARD  = "rounded-2xl border border-[#2C2C2A] bg-[#1C1C1A] p-6";
const BONE  = "bg-[#2C2C2A] rounded";

export default function DashboardLoading() {
  return (
    <main className={`${sans.className} relative min-h-screen bg-[#141413] text-[#F0EDE6] animate-pulse`}>
      {/* header */}
      <header className="border-b border-[#2C2C2A]/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className={`${serif.className} text-lg font-medium`}>Contextis</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* page title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="space-y-2">
            <div className={`${BONE} h-3 w-24`} />
            <div className={`${BONE} h-10 w-44`} />
          </div>
          <div className={`${BONE} h-9 w-44 rounded-full`} />
        </div>

        {/* hero + archetype */}
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="rounded-2xl bg-[#2C2C2A] h-52 md:col-span-2" />
          <div className={`${CARD} h-52 flex flex-col gap-3`}>
            <div className={`${BONE} h-3 w-20`} />
            <div className={`${BONE} h-10 w-10`} />
            <div className={`${BONE} h-6 w-32`} />
            <div className={`${BONE} h-3 w-full`} />
            <div className={`${BONE} h-3 w-3/4`} />
          </div>
        </div>

        {/* stat tiles */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${CARD} flex items-center gap-4`}>
              <div className={`${BONE} h-11 w-11 rounded-xl`} />
              <div className="space-y-2">
                <div className={`${BONE} h-7 w-12`} />
                <div className={`${BONE} h-2.5 w-16`} />
              </div>
            </div>
          ))}
        </div>

        {/* model split + busiest cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${CARD} h-40 flex flex-col gap-3`}>
              <div className={`${BONE} h-3 w-24`} />
              <div className={`${BONE} h-8 w-28`} />
              <div className={`${BONE} h-3 w-20`} />
            </div>
          ))}
        </div>

        {/* insight */}
        <div className={`${CARD} mb-4 flex items-start gap-4`}>
          <div className={`${BONE} h-10 w-10 rounded-xl shrink-0`} />
          <div className="flex-1 space-y-2 pt-1">
            <div className={`${BONE} h-3 w-16`} />
            <div className={`${BONE} h-3 w-full`} />
            <div className={`${BONE} h-3 w-4/5`} />
          </div>
        </div>

        {/* top projects */}
        <div className={CARD}>
          <div className={`${BONE} h-3 w-28 mb-6`} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-5">
              <div className="flex justify-between mb-2">
                <div className={`${BONE} h-3.5 w-32`} />
                <div className={`${BONE} h-3.5 w-12`} />
              </div>
              <div className={`${BONE} h-2.5 w-full rounded-full`} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
