"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<"email" | "wallet">("email");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // ethers.js wallet state
  const [address, setAddress]     = useState("");
  const isConnected               = !!address;

  /** Connect MetaMask via ethers.js / window.ethereum */
  async function connectWallet() {
    setError("");
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not found. Install it and refresh.");
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0] ?? "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("rejected") || msg.includes("denied") ? "Connection rejected." : msg);
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signIn("credentials", { type: "email", email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password.");
    else router.push("/dashboard");
  };

  const handleWalletLogin = async () => {
    if (!address) return;
    setError(""); setLoading(true);
    try {
      // Fetch nonce
      const res  = await fetch(`/api/auth/nonce?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Sign with ethers.js
      const { ethers } = await import("ethers");
      const provider  = new ethers.BrowserProvider(window.ethereum);
      const signer    = await provider.getSigner();
      const signature = await signer.signMessage(data.nonce);

      const result = await signIn("credentials", { type: "wallet", address, signature, nonce: data.nonce, redirect: false });
      if (result?.error) setError("Wallet sign-in failed. Please try again.");
      else router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rejected") || msg.includes("denied")) setError("Signature rejected by wallet.");
      else if (msg.includes("Database") || msg.includes("prisma")) setError("Database not ready. Contact support.");
      else setError(msg || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            block<span className="text-indigo-600">67</span>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-4">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
            {(["email", "wallet"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "email" ? "Email" : "🦊 MetaMask"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {/* Email form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* Wallet (ethers.js) */}
          {tab === "wallet" && (
            <div className="space-y-3">
              {!isConnected ? (
                <button onClick={connectWallet}
                  className="w-full flex items-center justify-center gap-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-sm py-2.5 rounded-xl transition-colors">
                  🦊 Connect MetaMask
                </button>
              ) : (
                <>
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                    Connected: <span className="font-mono text-indigo-600">{address.slice(0, 6)}…{address.slice(-4)}</span>
                  </div>
                  <button onClick={handleWalletLogin} disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                    {loading ? "Waiting for signature…" : "Sign In with MetaMask"}
                  </button>
                </>
              )}
              <p className="text-xs text-gray-400 text-center">Sign a message to verify ownership — no gas fees.</p>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            No account?{" "}
            <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
