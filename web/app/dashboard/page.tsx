import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { getWrapped } from "@/lib/stats";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) return <main style={{ padding: 40 }}>Please sign in on the home page first.</main>;

  await connectDB();
  const user = await User.findOne({ githubId: (session as any).githubId });
  if (!user) return <main style={{ padding: 40 }}>No user found.</main>;

  const wrapped = await getWrapped(String(user._id), "30d");

  return (
    <main style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Wrapped (raw numbers)</h1>
      <pre>{JSON.stringify(wrapped, null, 2)}</pre>
    </main>
  );
}