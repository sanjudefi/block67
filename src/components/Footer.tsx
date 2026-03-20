"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Star, Loader2, CheckCircle2 } from "lucide-react";

// ── Inline feedback form ──────────────────────────────────────────────────────
function FeedbackForm() {
  const [open,    setOpen]    = useState(false);
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState<"idle"|"loading"|"done"|"error">("idle");
  const [errMsg,  setErrMsg]  = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, rating: rating || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStatus("done");
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
      >
        <Star className="w-3.5 h-3.5" /> Share Feedback
      </button>
    );
  }

  return (
    <div className="bg-[#12141e] border border-white/10 rounded-2xl p-5 w-full max-w-md">
      {status === "done" ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-semibold">Thanks for your feedback!</p>
          <p className="text-gray-500 text-sm mt-1">It helps us make block67 better.</p>
          <button onClick={() => { setOpen(false); setStatus("idle"); setName(""); setEmail(""); setMessage(""); setRating(0); }}
            className="mt-4 text-xs text-indigo-400 hover:underline">Close</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-semibold text-sm">Give us feedback</p>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-xs transition-colors">✕</button>
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className={`text-2xl transition-colors ${n <= (hover || rating) ? "text-yellow-400" : "text-gray-700"}`}>
                ★
              </button>
            ))}
          </div>

          {status === "error" && <p className="text-red-400 text-xs">{errMsg}</p>}

          <div className="grid grid-cols-2 gap-2">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
          </div>
          <textarea required value={message} onChange={e => setMessage(e.target.value)} rows={3}
            placeholder="What do you think? What can we improve?"
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500/60 placeholder-gray-600 resize-none" />
          <button type="submit" disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {status === "loading" ? "Sending…" : "Submit Feedback"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function Footer() {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <footer className="bg-[#0a0c12] border-t border-white/10 px-4 py-12 mt-auto">
      <div className="max-w-4xl mx-auto">

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { icon: "🔒", label: "Built with OpenZeppelin" },
            { icon: "⛓️", label: "Ethereum compatible" },
            { icon: "🚀", label: "Production-ready architecture" },
            { icon: "🛡️", label: "Audited smart contracts" },
            { icon: "🔗", label: "Multi-chain support" },
          ].map(b => (
            <div key={b.label}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-gray-400">
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>

        {/* Main footer row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white text-sm">block<span className="text-indigo-400">67</span></span>
            </div>
            <p className="text-xs text-gray-600 max-w-xs">
              Build & deploy production-grade blockchain apps in minutes. No code required.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
            <Link href="/use-cases"  className="hover:text-white transition-colors">Use Cases</Link>
            <Link href="/dashboard"  className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/contact"    className="hover:text-white transition-colors">Contact</Link>
            <Link href="/terms"      className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>

        {/* Feedback section */}
        <div className="mt-8 pt-8 border-t border-white/8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} block67.app · Built for the decentralized future
            </p>
            {showFeedback ? (
              <FeedbackForm />
            ) : (
              <button
                onClick={() => setShowFeedback(true)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-indigo-400 border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-600/10 px-4 py-2 rounded-xl transition-all"
              >
                <Star className="w-3.5 h-3.5" /> Share Feedback
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
