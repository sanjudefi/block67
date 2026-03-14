import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyMessage } from "viem";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }

        // ── Email / password sign-in ─────────────────────────────────────────
        if (credentials.type === "email") {
          const { email, password } = credentials;
          if (!email || !password) return null;

          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id   = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
