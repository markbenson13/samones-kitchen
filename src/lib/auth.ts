import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

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

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminPasswordHash) return null;

        if (email.toLowerCase() !== adminEmail.toLowerCase()) return null;

        const valid = await bcrypt.compare(password, adminPasswordHash);
        if (!valid) return null;

        return { id: "admin", email: adminEmail, name: "Admin" };
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
    // Google sign-in is restricted to the single configured admin — anyone
    // else's Google account is rejected, same as a wrong Credentials password.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const adminEmail = process.env.ADMIN_EMAIL;
      return (
        !!adminEmail &&
        !!user.email &&
        user.email.toLowerCase() === adminEmail.toLowerCase()
      );
    },
  },
  trustHost: true,
});
