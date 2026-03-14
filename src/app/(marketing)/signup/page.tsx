"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useWalletClient } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { data: walletClient }   = useWalletClient();

  // ── Email signup ───────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Signup failed.");
      setLoading(false);
      return;
    }

    // Auto sign-in
    const result = await signIn("credentials", {
      type: "email",
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Account created! Please sign in.");
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  };

  // ── MetaMask signup (find-or-create) ──────────────────────────────────────
  const handleWalletSignup = async () => {
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
        setError("Wallet sign-up failed. Please try again.");
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
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-2 text-sm">Start building blockchain apps for free</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-sm rounded-xl p-3 mb-5">
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Name <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
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
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* MetaMask */}
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full flex items-center justify-center gap-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl py-3 font-medium text-sm transition-colors"
            >
              🦊 Continue with MetaMask
            </button>
          ) : (
            <button
              onClick={handleWalletSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl py-3 font-medium text-sm disabled:opacity-60 transition-colors"
            >
              🦊 {address?.slice(0, 6)}…{address?.slice(-4)} — Sign Up
            </button>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          By signing up you agree to our terms. No credit card required.
        </p>
      </div>
    </div>
  );
}
