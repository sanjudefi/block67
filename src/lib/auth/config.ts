import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyMessage } from "viem";
import { db } from "@/lib/db";
import { notifyAdminNewUser } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60, updateAge: 24 * 60 * 60 }, // 1 year, refresh daily
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
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

        // ── MetaMask wallet sign-in ──────────────────────────────────────────
        if (credentials.type === "wallet") {
          const { address, signature, nonce } = credentials;
          const lowerAddress = address.toLowerCase();

          const nonceRecord = await db.authNonce.findUnique({
            where: { address: lowerAddress },
          });

          if (
            !nonceRecord ||
            nonceRecord.nonce !== nonce ||
            nonceRecord.expiresAt < new Date()
          ) {
            return null;
          }

          const valid = await verifyMessage({
            address: address as `0x${string}`,
            message: nonce,
            signature: signature as `0x${string}`,
          });

          if (!valid) return null;

          // Invalidate used nonce
          await db.authNonce.delete({ where: { address: lowerAddress } });

          // Find or create user by wallet address
          let user = await db.user.findUnique({
            where: { walletAddress: lowerAddress },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                walletAddress: lowerAddress,
                name: `${address.slice(0, 6)}...${address.slice(-4)}`,
              },
            });
            // Notify admin of new wallet signup (fire-and-forget)
            notifyAdminNewUser(null, lowerAddress, user.name).catch(console.error);
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
        }

        // ── Admin shortcut (env-var password, no DB needed) ─────────────────
        if (credentials.type === "email") {
          const { email, password } = credentials;
          if (!email || !password) return null;

          // Admin super-login: admin@block67.app + ADMIN_PASSWORD env var
          if (
            email.toLowerCase() === "admin@block67.app" &&
            process.env.ADMIN_PASSWORD &&
            password === process.env.ADMIN_PASSWORD
          ) {
            return { id: "admin", name: "Admin", email: "admin@block67.app", role: "ADMIN" } as never;
          }

          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;

          return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id            = user.id;
        token.role          = (user as unknown as { role: string }).role;
        token.emailVerified = (user as unknown as { emailVerified: boolean }).emailVerified ?? false;
      }
      // Re-fetch emailVerified on session update (after verification)
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { emailVerified: true } });
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
