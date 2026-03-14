"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useWalletClient } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";
import type { Metadata } from "next";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "wallet">("email");

  // Email form state
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Wagmi
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { data: walletClient }   = useWalletClient();

  // ── Email sign-in ──────────────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      type: "email",
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  };

  // ── MetaMask sign-in ───────────────────────────────────────────────────────
  const handleWalletLogin = async () => {
    if (!address || !walletClient) return;
    setError("");
    setLoading(true);

    try {
      const res  = await fetch(`/api/auth/nonce?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const signature = await walletClient.signMessage({ message: data.nonce });

      const result = await signIn("credentials", {
        type: "wallet",
        address,
        signature,
        nonce: data.nonce,
        redirect: false,
      });

      if (result?.error) {
        setError("Wallet sign-in failed. Please try again.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes("User rejected")) {
        setError("Signature rejected.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-2 text-sm">Sign in to your block67 account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl mb-7">
            {(["email", "wallet"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "email" ? "Email" : "🦊 MetaMask"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl p-3 mb-5">
              {error}
            </div>
          )}

          {/* Email form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl py-2.5 font-medium text-sm transition-colors mt-1"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* Wallet tab */}
          {tab === "wallet" && (
            <div className="space-y-4">
              {!isConnected ? (
                <button
                  onClick={() => connect({ connector: injected() })}
                  className="w-full flex items-center justify-center gap-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl py-3 font-medium text-sm transition-colors"
                >
                  🦊 Connect MetaMask
                </button>
              ) : (
                <>
                  <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm">
                    <span className="text-gray-400">Connected: </span>
                    <span className="font-mono text-indigo-400">
                      {address?.slice(0, 6)}…{address?.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleWalletLogin}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl py-2.5 font-medium text-sm transition-colors"
                  >
                    {loading ? "Waiting for signature…" : "Sign In with MetaMask"}
                  </button>
                </>
              )}
              <p className="text-xs text-gray-600 text-center">
                You&apos;ll sign a message to prove wallet ownership.
                No gas fees — this is off-chain.
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
