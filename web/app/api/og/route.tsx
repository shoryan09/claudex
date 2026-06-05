// web/app/api/og/route.tsx
// Generates a shareable card (PNG) of the signed-in user's Wrapped.
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

// adaptive size so long archetype names never overflow the clay panel
function archetypeSize(name: string) {
  const len = name.length;
  if (len <= 6) return 72;
  if (len <= 9) return 58;
  if (len <= 12) return 48;
  if (len <= 16) return 38;
  return 32;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Sign in first", { status: 401 });

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user) return new Response("No user", { status: 404 });

  const w = await getWrapped(String(user._id), "30d");

  const stats = [
    { value: String(w.activeDays), label: "ACTIVE DAYS" },
    { value: `${w.longestStreak}d`, label: "LONGEST STREAK" },
    { value: fmt(w.messages), label: "MESSAGES" },
  ];

  // mid-sized export: smaller base canvas + 1.5x scale for crispness
  const SCALE = 1.5;
  const W = 1000;
  const H = 525;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#141413",
          fontFamily: "sans-serif",
        }}
      >
        {/* LEFT: dark column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 630,
            padding: 52,
          }}
        >
          {/* brand — dot + wordmark on one baseline */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 18,
                height: 18,
                borderRadius: 18,
                background: "#CC785C",
              }}
            />
            <span style={{ fontSize: 28, fontWeight: 800, color: "#F5F4EF", marginLeft: 13, lineHeight: 1 }}>
              claudex
            </span>
            <span style={{ fontSize: 20, color: "#7C7970", marginLeft: 15, lineHeight: 1 }}>
              WRAPPED · 30 DAYS
            </span>
          </div>

          {/* hero token count */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, letterSpacing: 5, color: "#CC785C", fontWeight: 700 }}>
              TOTAL TOKENS
            </span>
            <span style={{ fontSize: 158, fontWeight: 800, lineHeight: 0.9, color: "#F5F4EF", marginTop: 6 }}>
              {fmt(w.totalTokens)}
            </span>
          </div>

          {/* stat row as flat blocks */}
          <div style={{ display: "flex", gap: 14 }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  background: i === 0 ? "#CC785C" : "#1F1E1C",
                  borderRadius: 18,
                  padding: "18px 20px",
                }}
              >
                <span style={{ fontSize: 42, fontWeight: 800, color: i === 0 ? "#141413" : "#F5F4EF" }}>
                  {s.value}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    color: i === 0 ? "#5C2E1E" : "#7C7970",
                    marginTop: 7,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: solid clay block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 370,
            background: "#CC785C",
            padding: 46,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, letterSpacing: 4, color: "#5C2E1E", fontWeight: 800 }}>
              ARCHETYPE
            </span>
            <span
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: archetypeSize(w.archetype.name),
                fontWeight: 800,
                lineHeight: 1,
                color: "#141413",
                marginTop: 14,
                maxWidth: 278,
              }}
            >
              {w.archetype.name}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#141413" }}>
              {w.topProjects[0]?.project ?? "—"}
            </span>
            <span style={{ fontSize: 17, letterSpacing: 1.5, fontWeight: 700, color: "#5C2E1E", marginTop: 5 }}>
              TOP PROJECT
            </span>
          </div>
        </div>
      </div>
    ),
    { width: W * SCALE, height: H * SCALE }
  );
}