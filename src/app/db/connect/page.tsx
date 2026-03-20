"use client";
// /db/connect — standalone DB migration runner
// No layout wrapper, no auth gate — run this once to create DB tables.

import { useState } from "react";

type StepResult = { step: string; ok: boolean; error?: string };

export default function DbConnectPage() {
  const [results, setResults]   = useState<StepResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [done,    setDone]      = useState(false);
  const [secret,  setSecret]    = useState("");
  const [error,   setError]     = useState("");

  async function runMigration() {
    if (!secret.trim()) { setError("Enter the admin secret."); return; }
    setError(""); setLoading(true); setDone(false); setResults([]);

    try {
      const res = await fetch("/api/admin/migrate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results ?? []);
        setDone(true);
      } else {
        setError(data.error ?? "Migration failed.");
      }
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const allOk = results.length > 0 && results.every(r => r.ok);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="text-white text-base font-black">b</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">block67</span>
          </div>
          <p className="text-gray-400 text-sm">Database Migration Runner</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl">

          <p className="text-sm text-gray-400">
            This will create the required tables and columns in your production database:
          </p>

          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>Add <code className="text-indigo-400">emailVerified</code>, <code className="text-indigo-400">emailVerificationToken</code>, <code className="text-indigo-400">emailVerificationTokenExp</code> columns to users table</li>
            <li>Create <code className="text-indigo-400">block67_feedback</code> table</li>
            <li>Create <code className="text-indigo-400">block67_leads</code> table</li>
          </ul>

          {/* Secret input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              Admin secret (NEXTAUTH_SECRET)
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Paste your NEXTAUTH_SECRET value"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600
                         focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            <p className="mt-1 text-xs text-gray-600">Used to verify this is an authorised request.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">
              <span>✗</span> {error}
            </div>
          )}

          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-bold rounded-xl transition-colors shadow-md"
          >
            {loading ? "Running migration…" : "Run DB Migration →"}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                    r.ok
                      ? "bg-green-950/60 border border-green-800/60 text-green-300"
                      : "bg-red-950/60 border border-red-800/60 text-red-400"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{r.ok ? "✓" : "✗"}</span>
                  <div>
                    <span className="font-medium">{r.step}</span>
                    {r.error && <div className="text-red-500 mt-0.5">{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {done && allOk && (
            <div className="text-center text-sm text-green-400 font-medium pt-2">
              ✓ Migration complete! Your database is ready.
              <div className="mt-3">
                <a
                  href="/admin-login"
                  className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Go to Admin Panel →
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-gray-700">
          Safe to run multiple times — uses <code>IF NOT EXISTS</code> guards.
        </p>
      </div>
    </div>
  );
}
