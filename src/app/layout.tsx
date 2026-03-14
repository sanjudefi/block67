// ROOT LAYOUT — required by every page in the app
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "block67 — Build Blockchain Apps", template: "%s | block67" },
  description:
    "Deploy token contracts, NFTs, and DAOs in minutes. Customize, deploy with MetaMask, get an instant dashboard and a free subdomain.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
