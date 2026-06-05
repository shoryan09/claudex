// web/app/api/ingest/route.ts
// Validates the CLI token against the users collection, then upserts buckets
// owned by the real user.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Bucket } from "@/models/bucket";
import { User } from "@/models/user";

export const runtime = "nodejs";

const MAX_PER_BUCKET = 50_000_000; // light anti-cheat: reject implausible totals

export async function POST(req: NextRequest) {
  // 1) read the bearer token
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  // 2) parse body
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const buckets = Array.isArray(body?.buckets) ? body.buckets : [];
  if (buckets.length === 0)
    return NextResponse.json({ error: "no buckets" }, { status: 400 });

  await connectDB();

  // 3) validate the token → find the real user
  const user = await User.findOne({ cliToken: token });
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  const owner = String(user._id);

  // 4) upsert each bucket, owned by the real user
  const ops: any[] = [];
  for (const b of buckets) {
    if (typeof b?.date !== "string" || typeof b?.hour !== "number") continue;
    const inTokens = Math.max(0, Number(b.inTokens) || 0);
    const outTokens = Math.max(0, Number(b.outTokens) || 0);
    if (inTokens > MAX_PER_BUCKET || outTokens > MAX_PER_BUCKET) continue;

    ops.push({
      updateOne: {
        filter: {
          owner, date: b.date, hour: b.hour,
          model: String(b.model || "unknown"),
          project: String(b.project || "unknown"),
        },
        update: {
          $set: {
            inTokens, outTokens,
            cacheCreate: Math.max(0, Number(b.cacheCreate) || 0),
            cacheRead: Math.max(0, Number(b.cacheRead) || 0),
            messages: Math.max(0, Number(b.messages) || 0),
            sessions: Math.max(0, Number(b.sessions) || 0),
            day: new Date(`${b.date}T00:00:00Z`),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length === 0)
    return NextResponse.json({ error: "no valid buckets" }, { status: 400 });

  const res = await Bucket.bulkWrite(ops);
  return NextResponse.json({
    ok: true,
    written: ops.length,
    upserted: res.upsertedCount,
    modified: res.modifiedCount,
  });
}