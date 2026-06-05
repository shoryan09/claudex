// web/app/api/og/route.tsx
// Generates a 1200x630 shareable card (PNG) of the signed-in user's Wrapped.
import { ImageResponse } from "next/og";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { getWrapped } from "@/lib/stats";

export const runtime = "nodejs"; // mongoose needs Node

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Sign in first", { status: 401 });

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user) return new Response("No user", { status: 404 });

  const w = await getWrapped(String(user._id), "30d");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: "#0a0a0a", color: "#fafafa", padding: 60, fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 28, color: "#a3a3a3" }}>claudex · last 30 days</span>
          <span style={{ fontSize: 28, color: "#f97316", fontWeight: 700 }}>{session.user.name}</span>
        </div>

        <div style={{ display: "flex", marginTop: 44 }}>
          <span style={{ fontSize: 40, color: "#c084fc", fontWeight: 700 }}>{w.archetype.name}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
          <span style={{ fontSize: 28, color: "#a3a3a3" }}>Total tokens</span>
          <span style={{ fontSize: 130, fontWeight: 800, lineHeight: 1.05 }}>{fmt(w.totalTokens)}</span>
        </div>

        <div style={{ display: "flex", marginTop: 44, gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 52, fontWeight: 700 }}>{w.activeDays}</span>
            <span style={{ fontSize: 24, color: "#a3a3a3" }}>active days</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 52, fontWeight: 700 }}>{w.longestStreak}d</span>
            <span style={{ fontSize: 24, color: "#a3a3a3" }}>longest streak</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 52, fontWeight: 700 }}>{w.topProjects[0]?.project ?? "—"}</span>
            <span style={{ fontSize: 24, color: "#a3a3a3" }}>top project</span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "auto", color: "#525252", fontSize: 24 }}>
          Made with claudex
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}