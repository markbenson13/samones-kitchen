import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Anyone can attempt Google sign-in. A new email is auto-provisioned as
    // an unapproved User row on the spot instead of being rejected outright,
    // but can't establish a session until an existing user approves it from
    // the Users page — same gate applies if an approved user is later
    // revoked.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const email = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        await prisma.user.create({
          data: { email, name: user.name ?? null, isApproved: false },
        });
        return "/login?error=pending";
      }

      if (!existing.isApproved) return "/login?error=pending";

      return true;
    },
  },
  trustHost: true,
});
