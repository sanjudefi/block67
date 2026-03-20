"use client";
// Admin login page — lives outside /admin layout to avoid redirect loop
// URL: /admin-login

import { useState } from "react";
import { signIn }   from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      type:     "email",
      email:    "admin@block67.app",
      password,
    });
    setLoading(false);
    if (res?.ok) router.push("/admin/users");
    else setError("Invalid password.");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-2">
          <Image src="/block_67-logo.png" alt="Block67" width={140} height={39} className="invert" />
        </div>
        <p className="text-gray-500 text-sm">Admin Panel</p>
      </div>

      {/* Card */}
      <form
        onSubmit={submit}
        className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl"
      >
        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
            Admin email
          </label>
          <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-400 font-mono select-all">
            admin@block67.app
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            autoFocus
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600
                       focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">
            <span className="text-red-500">✗</span> {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-bold rounded-xl transition-colors shadow-md"
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </form>

      <p className="mt-5 text-xs text-gray-700">block67 internal admin only</p>
    </div>
  );
}
