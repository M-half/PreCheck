import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import db from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user || !user.passwordHash) return null;

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        if (user.status !== "ACTIVE") {
          throw new Error("Akun Anda sedang ditangguhkan atau tidak aktif.");
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.phone = user.phone;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "MITRA" | "PEMBELI" | "ADMIN";
        session.user.status = token.status as "ACTIVE" | "SUSPENDED" | "CLOSED";
        session.user.phone = token.phone as string | null | undefined;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
