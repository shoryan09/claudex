import { auth, signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";

export default async function Home() {
  const session = await auth();
  let cliToken = "";
  if (session?.user) {
    await connectDB();
    const u = await User.findOne({ githubId: (session as any).githubId });
    cliToken = u?.cliToken ?? "";
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 640 }}>
      <h1>claudex</h1>
      {session?.user ? (
        <>
          <p>Signed in as {session.user.name ?? session.user.email}</p>
          <p>Your CLI token:</p>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 6, overflowX: "auto" }}>
            {cliToken || "(no token found)"}
          </pre>
          <p>Connect your CLI (run from your collector folder):</p>
          <pre style={{ background: "#111", color: "#eee", padding: 12, borderRadius: 6, overflowX: "auto" }}>
            npx tsx collect.ts login {cliToken} --server http://localhost:3000/api/ingest
          </pre>
          <form action={async () => { "use server"; await signOut(); }}>
            <button>Sign out</button>
          </form>
        </>
      ) : (
        <form action={async () => { "use server"; await signIn("github"); }}>
          <button>Sign in with GitHub</button>
        </form>
      )}
    </main>
  );
}