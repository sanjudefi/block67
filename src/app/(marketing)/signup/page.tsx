"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// useSearchParams() requires a Suspense boundary in Next.js 14
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") ?? "";

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // ethers.js wallet state
  const [address, setAddress]   = useState("");
  const isConnected             = !!address;

  /** Connect MetaMask — redirects into MetaMask app on mobile if needed */
  async function connectWallet() {
    setError("");
    if (typeof window === "undefined" || !window.ethereum) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const dappUrl = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);

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

    const result = await signIn("credentials", { type: "email", email, password, redirect: false });
    setLoading(false);
    if (result?.error) { router.push("/login"); return; }

    const dest = initialPrompt ? `/projects/new?prompt=${encodeURIComponent(initialPrompt)}` : "/dashboard";
    router.push(dest);
  };

  const handleWalletSignup = async () => {
    if (!address) return;
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`/api/auth/nonce?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Sign with ethers.js
      const { ethers } = await import("ethers");
      const provider  = new ethers.BrowserProvider(window.ethereum);
      const signer    = await provider.getSigner();
      const signature = await signer.signMessage(data.nonce);

      const result = await signIn("credentials", { type: "wallet", address, signature, nonce: data.nonce, redirect: false });
      const dest = initialPrompt ? `/projects/new?prompt=${encodeURIComponent(initialPrompt)}` : "/dashboard";
      if (result?.error) setError("Wallet sign-up failed. Please try again.");
      else router.push(dest);
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
          <h1 className="text-xl font-semibold text-gray-900 mt-4">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start building blockchain apps for free</p>
        </div>

        {/* Prompt carry-over */}
        {initialPrompt && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 text-sm text-indigo-700">
            <span className="font-medium">Your project:</span> {initialPrompt.slice(0, 80)}{initialPrompt.length > 80 ? "…" : ""}
          </div>
        )}

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          {/* Email form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* MetaMask (ethers.js) */}
          {!isConnected ? (
            <button onClick={connectWallet}
              className="w-full flex items-center justify-center gap-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-sm py-2.5 rounded-xl transition-colors">
              🦊 Continue with MetaMask
            </button>
          ) : (
            <button onClick={handleWalletSignup} disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-sm py-2.5 rounded-xl disabled:opacity-50 transition-colors">
              🦊 {address.slice(0, 6)}…{address.slice(-4)} — Sign Up
            </button>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link>
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">No credit card required · Free forever for open projects</p>
      </div>
    </div>
  );
}
