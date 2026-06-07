import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { connectDB } from "@/lib/mongo";
import { User } from "@/models/user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectDB();
      const githubId = String(account?.providerAccountId ?? (profile as any)?.id ?? "");
      if (!githubId) return false;
      await User.findOneAndUpdate(
        { githubId },
        { $set: { name: user.name, email: user.email, image: user.image } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) token.githubId = String(account.providerAccountId);
      return token;
    },
    async session({ session, token }) {
      (session as any).githubId = token.githubId;
      return session;
    },
  },
});