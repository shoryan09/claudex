import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";
import { Bucket } from "@/models/bucket";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const githubId = (session as any).githubId;
  if (!githubId) return NextResponse.json({ error: "No githubId" }, { status: 400 });
  const user = await User.findOne({ githubId });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await Bucket.deleteMany({ owner: String(user._id) });
  await User.deleteOne({ githubId });
  return NextResponse.json({ ok: true });
}