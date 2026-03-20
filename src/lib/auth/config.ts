import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { verifyMessage } from "viem";
import { db } from "@/lib/db";
import { notifyAdminNewUser } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // ── Google OAuth ───────────────────────────────────────────────────────
    ...(process.env.OAUTH_CLIENT_GOOGLE_ID && process.env.OAUTH_CLIENT_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId:     process.env.OAUTH_CLIENT_GOOGLE_ID,
            clientSecret: process.env.OAUTH_CLIENT_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // ── Credentials (email/password + MetaMask wallet) ─────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        type:      { label: "Type",      type: "text" },
        email:     { label: "Email",     type: "email" },
        password:  { label: "Password",  type: "password" },
        address:   { label: "Address",   type: "text" },
        signature: { label: "Signature", type: "text" },
        nonce:     { label: "Nonce",     type: "text" },
      },

      async authorize(credentials) {
        if (!credentials) return null;

        // ── MetaMask wallet sign-in ──────────────────────────────────────
        if (credentials.type === "wallet") {
          const { address, signature, nonce } = credentials;
          const lowerAddress = address.toLowerCase();

          const nonceRecord = await db.authNonce.findUnique({
            where: { address: lowerAddress },
          });

          if (!nonceRecord || nonceRecord.nonce !== nonce || nonceRecord.expiresAt < new Date()) {
            return null;
          }

          const valid = await verifyMessage({
            address: address as `0x${string}`,
            message: nonce,
            signature: signature as `0x${string}`,
          });
          if (!valid) return null;

          await db.authNonce.delete({ where: { address: lowerAddress } });

          let user = await db.user.findUnique({ where: { walletAddress: lowerAddress } });
          if (!user) {
            user = await db.user.create({
              data: { walletAddress: lowerAddress, name: `${address.slice(0, 6)}...${address.slice(-4)}` },
            });
            notifyAdminNewUser(null, lowerAddress, user.name).catch(console.error);
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
        }

        // ── Admin shortcut ────────────────────────────────────────────────
        if (credentials.type === "email") {
          const { email, password } = credentials;
          if (!email || !password) return null;

          if (
            email.toLowerCase() === "admin@block67.app" &&
            process.env.ADMIN_PASSWORD &&
            password === process.env.ADMIN_PASSWORD
          ) {
            return { id: "admin", name: "Admin", email: "admin@block67.app", role: "ADMIN", emailVerified: true } as never;
          }

          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;

          return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    // ── Google sign-in: upsert user in DB ─────────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existing = await db.user.findUnique({ where: { email: user.email } });
          if (!existing) {
            const newUser = await db.user.create({
              data: {
                email:         user.email,
                name:          user.name ?? null,
                emailVerified: true, // Google emails are pre-verified
              },
            });
            notifyAdminNewUser(user.email, null, user.name ?? null).catch(console.error);
            user.id = newUser.id;
          } else {
            // Ensure email is marked verified if signing in with Google
            if (!existing.emailVerified) {
              await db.user.update({ where: { id: existing.id }, data: { emailVerified: true } });
            }
            user.id = existing.id;
          }
        } catch (err) {
          console.error("[google signIn]", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id            = user.id;
        token.role          = (user as unknown as { role: string }).role ?? "USER";
        token.emailVerified = (user as unknown as { emailVerified: boolean }).emailVerified ?? false;
      }
      // Google OAuth: load role + emailVerified from DB
      if (account?.provider === "google" && token.id) {
        const dbUser = await db.user.findUnique({
          where:  { id: token.id as string },
          select: { role: true, emailVerified: true },
        });
        if (dbUser) {
          token.role          = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
        }
      }
      // Session refresh: re-fetch emailVerified
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where:  { id: token.id as string },
          select: { emailVerified: true },
        });
        if (dbUser) token.emailVerified = dbUser.emailVerified;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id            = token.id;
      session.user.role          = token.role;
      session.user.emailVerified = token.emailVerified as boolean | undefined;
      return session;
    },
  },
};
