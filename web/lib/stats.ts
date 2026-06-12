// web/lib/stats.ts
import { connectDB } from "@/lib/mongo";
import { Bucket } from "@/models/bucket";

export type Wrapped = {
  range: string;
  totalTokens: number;
  inTokens: number;
  outTokens: number;
  cacheCreate: number;
  cacheRead: number;
  messages: number;
  sessions: number;
  activeHours: number;
  activeDays: number;
  longestStreak: number;
  modelSplit: { model: string; tokens: number }[];
  topProjects: { project: string; tokens: number }[];
  busiestDay: { date: string; tokens: number } | null;
  busiestHour: { hour: number; tokens: number } | null;
  archetype: { name: string; emoji: string; reason: string };
  insight: string;
};

function fmtHour(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${h < 12 ? "AM" : "PM"}`;
}

export async function getWrapped(
  owner: string,
  range: "7d" | "30d" = "30d"
): Promise<Wrapped> {
  await connectDB();

  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const buckets: any[] = await Bucket.find({ owner, date: { $gte: cutoffStr } }).lean();

  let inTokens = 0, outTokens = 0, cacheCreate = 0, cacheRead = 0, messages = 0, sessions = 0;
  const byModel = new Map<string, number>();
  const byProject = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byHour = new Map<number, number>();
  const dateSet = new Set<string>();
  const hourSet = new Set<string>();

  for (const b of buckets) {
    // all four token types — matches the leaderboard's definition
    const spend =
      (b.inTokens || 0) + (b.outTokens || 0) + (b.cacheCreate || 0) + (b.cacheRead || 0);
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

  // all four token types — matches the leaderboard's definition
  const totalTokens = inTokens + outTokens + cacheCreate + cacheRead;

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

  // ---- archetype: time-of-day × session length ----
  const msgsPerSession = sessions > 0 ? messages / sessions : 0;
  const hour = busiestHour?.hour ?? 12;
  let timeName = "Daylight Coder", emoji = "☀️";
  if (hour <= 4 || hour >= 22) { timeName = "Night Owl"; emoji = "🦉"; }
  else if (hour <= 8) { timeName = "Dawn Raider"; emoji = "🌅"; }
  else if (hour >= 18) { timeName = "Evening Grinder"; emoji = "🌆"; }

  let style = "Steady Hand";
  if (msgsPerSession >= 25) style = "Marathoner";
  else if (sessions > 0 && msgsPerSession <= 8) style = "Sprinter";

  const archetype = {
    name: `${timeName} ${style}`,
    emoji,
    reason: `Peaks around ${fmtHour(hour)}, ~${Math.round(msgsPerSession)} messages per session.`,
  };

  // ---- insight: cache efficiency ----
  const cacheTotal = cacheRead + cacheCreate;
  const cacheEff = cacheTotal > 0 ? cacheRead / cacheTotal : 0;
  const pct = Math.round(cacheEff * 100);
  let insight: string;
  if (cacheEff >= 0.85)
    insight = `${pct}% of your context was reused from cache — Claude Code is caching very efficiently for you.`;
  else if (cacheEff >= 0.6)
    insight = `${pct}% of your context came from cache — decent reuse, with a bit of room to tighten.`;
  else
    insight = `Only ${pct}% of your context was cached — you're rebuilding context often, which burns extra tokens.`;

  return {
    range,
    totalTokens, inTokens, outTokens, cacheCreate, cacheRead,
    messages, sessions,
    activeHours: hourSet.size,
    activeDays: dateSet.size,
    longestStreak,
    modelSplit, topProjects, busiestDay, busiestHour,
    archetype, insight,
  };
}
