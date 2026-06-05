// web/lib/stats.ts
// Reads a user's buckets and computes the Wrapped metrics for a time range.
import { connectDB } from "@/lib/mongo";
import { Bucket } from "@/models/bucket";

export type Wrapped = {
  range: string;
  totalTokens: number; // in + out + cacheCreate (the "real" spend)
  inTokens: number;
  outTokens: number;
  cacheCreate: number;
  cacheRead: number;
  messages: number;
  sessions: number;      // approx — overcounts sessions that span multiple hours
  activeHours: number;   // distinct (date, hour)
  activeDays: number;    // distinct dates
  longestStreak: number; // consecutive active days
  modelSplit: { model: string; tokens: number }[];
  topProjects: { project: string; tokens: number }[];
  busiestDay: { date: string; tokens: number } | null;
  busiestHour: { hour: number; tokens: number } | null;
};

export async function getWrapped(
  owner: string,
  range: "7d" | "30d" = "30d"
): Promise<Wrapped> {
  await connectDB();

  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const buckets: any[] = await Bucket.find({
    owner,
    date: { $gte: cutoffStr },
  }).lean();

  let inTokens = 0, outTokens = 0, cacheCreate = 0, cacheRead = 0, messages = 0, sessions = 0;
  const byModel = new Map<string, number>();
  const byProject = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byHour = new Map<number, number>();
  const dateSet = new Set<string>();
  const hourSet = new Set<string>();

  for (const b of buckets) {
    const spend = (b.inTokens || 0) + (b.outTokens || 0) + (b.cacheCreate || 0);
    inTokens += b.inTokens || 0;
    outTokens += b.outTokens || 0;
    cacheCreate += b.cacheCreate || 0;
    cacheRead += b.cacheRead || 0;
    messages += b.messages || 0;
    sessions += b.sessions || 0;
    byModel.set(b.model, (byModel.get(b.model) || 0) + spend);
    byProject.set(b.project, (byProject.get(b.project) || 0) + spend);
    byDay.set(b.date, (byDay.get(b.date) || 0) + spend);
    byHour.set(b.hour, (byHour.get(b.hour) || 0) + spend);
    dateSet.add(b.date);
    hourSet.add(`${b.date} ${b.hour}`);
  }

  const totalTokens = inTokens + outTokens + cacheCreate;

  const modelSplit = [...byModel.entries()]
    .map(([model, tokens]) => ({ model, tokens }))
    .sort((a, b) => b.tokens - a.tokens);

  const topProjects = [...byProject.entries()]
    .map(([project, tokens]) => ({ project, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  let busiestDay: { date: string; tokens: number } | null = null;
  for (const [date, tokens] of byDay)
    if (!busiestDay || tokens > busiestDay.tokens) busiestDay = { date, tokens };

  let busiestHour: { hour: number; tokens: number } | null = null;
  for (const [hour, tokens] of byHour)
    if (!busiestHour || tokens > busiestHour.tokens) busiestHour = { hour, tokens };

  // longest run of consecutive active days
  const dates = [...dateSet].sort();
  let longestStreak = 0, cur = 0;
  let prev: Date | null = null;
  for (const d of dates) {
    const cd = new Date(`${d}T00:00:00Z`);
    if (prev && cd.getTime() - prev.getTime() === 86_400_000) cur += 1;
    else cur = 1;
    if (cur > longestStreak) longestStreak = cur;
    prev = cd;
  }

  return {
    range,
    totalTokens, inTokens, outTokens, cacheCreate, cacheRead,
    messages, sessions,
    activeHours: hourSet.size,
    activeDays: dateSet.size,
    longestStreak,
    modelSplit, topProjects, busiestDay, busiestHour,
  };
}