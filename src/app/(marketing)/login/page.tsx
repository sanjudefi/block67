"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<"email" | "wallet">("email");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [address, setAddress] = useState("");
  const isConnected           = !!address;

  async function connectWallet() {
    setError("");
    if (typeof window === "undefined" || !window.ethereum) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.href.replace(/^https?:\/\//, "")}`;
        return;
      }
      setError("MetaMask not installed. Get it at metamask.io");
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

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
      const res  = await fetch(`/api/auth/nonce?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const signature  = await signer.signMessage(data.nonce);

      const result = await signIn("credentials", { type: "wallet", address, signature, nonce: data.nonce, redirect: false });
      if (result?.error) setError("Wallet sign-in failed. Please try again.");
      else router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rejected") || msg.includes("denied")) setError("Signature rejected by wallet.");
      else setError(msg || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 bg-[#0f1117]">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-white">
            block<span className="text-indigo-400">67</span>
          </Link>
          <h1 className="text-xl font-semibold text-white mt-4">Welcome back</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-[#12141e] border border-white/10 rounded-2xl shadow-xl p-7">

          {/* Google Sign-In */}
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-800 font-semibold py-2.5 rounded-xl text-sm transition-colors border border-gray-200 shadow-sm mb-4">
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            }
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-5">
            {(["email", "wallet"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}>
                {t === "email" ? "Email" : "🦊 MetaMask"}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">{error}</p>
          )}

          {/* Email form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* Wallet */}
          {tab === "wallet" && (
            <div className="space-y-3">
              {!isConnected ? (
                <button onClick={connectWallet}
                  className="w-full flex items-center justify-center gap-2 border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-medium text-sm py-2.5 rounded-xl transition-colors">
                  🦊 Connect MetaMask
                </button>
              ) : (
                <>
                  <div className="text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                    Connected: <span className="font-mono text-indigo-400">{address.slice(0, 6)}…{address.slice(-4)}</span>
                  </div>
                  <button onClick={handleWalletLogin} disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                    {loading ? "Waiting for signature…" : "Sign In with MetaMask"}
                  </button>
                </>
              )}
              <p className="text-xs text-gray-600 text-center">Sign a message — no gas fees.</p>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            No account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
