"use client";

import { SessionProvider } from "next-auth/react";

// Session is fetched client-side by SessionProvider — no server prop needed.
// WagmiProvider removed: nothing in the app uses wagmi hooks (builder uses
// ethers.js directly, dapp pages use their own wallet hook), and its
// dependency chain pulls in @metamask/sdk which requires React Native modules
// that don't exist in a Next.js build.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
