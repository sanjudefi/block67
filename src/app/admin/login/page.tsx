"use client";
// Dedicated admin login — /admin/login
// Uses admin@block67.app + ADMIN_PASSWORD env var (no DB user required).

import { useState } from "react";
import { signIn }   from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const res = await signIn("credentials", {
      redirect:  false,
      type:      "email",
      email:     "admin@block67.app",
      password,
    });

    setLoading(false);

    if (res?.ok) {
      router.push("/admin/plans");
    } else {
      setError("Invalid password.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">b</span>
            </div>
            <span className="text-white font-bold text-lg">block67</span>
          </div>
          <p className="text-gray-400 text-sm">Admin Panel</p>
        </div>

        <form onSubmit={submit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 font-mono">
              admin@block67.app
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !password}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
