"use client";
// UpgradeModal — MetaMask payment flow to unlock 6-project Pro plan
// ETH is sent directly to PAYMENT_ADDRESS. txHash is submitted to /api/upgrade.

import { useState } from "react";
import { Loader2, Zap, Check, ExternalLink, X } from "lucide-react";
import { PAYMENT_ADDRESS } from "@/lib/upgrade/plans";
import type { PlanKey } from "@/lib/upgrade/plans";

const PLANS = {
  monthly: { eth: "0.005", usd: 10,  days: 30,  label: "Monthly",  badge: "" },
  yearly:  { eth: "0.04",  usd: 100, days: 365, label: "Yearly",   badge: "Save 17%" },
} as const;

interface Props {
  onClose:    () => void;
  onUpgraded: () => void;   // called after successful upgrade
  projectCount: number;
  freeLimit:    number;
}

export function UpgradeModal({ onClose, onUpgraded, projectCount, freeLimit }: Props) {
  const [plan,      setPlan]      = useState<PlanKey>("yearly");
  const [paying,    setPaying]    = useState(false);
  const [txHash,    setTxHash]    = useState("");
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  async function pay() {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask and try again.");
      return;
    }
    setPaying(true);
    try {
      // Request wallet connection
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const from = accounts[0];
      if (!from) throw new Error("No account selected in MetaMask.");

      // Convert ETH amount to Wei hex
      const ethAmount = PLANS[plan].eth;
      const wei = BigInt(Math.round(parseFloat(ethAmount) * 1e18));
      const weiHex = "0x" + wei.toString(16);

      // Send ETH transaction
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: PAYMENT_ADDRESS, value: weiHex, gas: "0x5208" }],
      }) as string;

      setTxHash(hash);

      // Record on server
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash, plan, walletAddress: from }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Server error");
      }

      setDone(true);
      setTimeout(onUpgraded, 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("user rejected") || msg.includes("denied"))
        setError("Transaction cancelled.");
      else
        setError(msg.slice(0, 200));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Upgrade to Pro</h2>
            </div>
            <p className="text-sm text-gray-500">
              You've used {projectCount}/{freeLimit} free projects. Pro unlocks 6 projects.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan selector */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, p]) => (
            <button key={key} onClick={() => setPlan(key)}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                plan === key
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-200"
              }`}>
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              <p className="font-bold text-gray-900 mb-0.5">{p.label}</p>
              <p className="text-2xl font-bold text-indigo-600">${p.usd}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.eth} ETH</p>
              {plan === key && (
                <Check className="absolute top-3 right-3 w-4 h-4 text-indigo-500" />
              )}
            </button>
          ))}
        </div>

        {/* What you get */}
        <div className="mx-6 mb-4 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Pro includes</p>
          {[
            "6 total projects (3 extra)",
            "Unlimited frontend publishes",
            "Priority support",
          ].map(f => (
            <div key={f} className="flex items-center gap-2 mb-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-sm text-gray-700">{f}</span>
            </div>
          ))}
        </div>

        {/* Payment address */}
        <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Payment goes directly to</p>
          <p className="text-xs font-mono text-amber-800 break-all">{PAYMENT_ADDRESS}</p>
          <p className="text-[10px] text-amber-600 mt-1">Sending {PLANS[plan].eth} ETH via MetaMask on any EVM network</p>
        </div>

        {error && (
          <div className="mx-6 mb-3 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {done && txHash && (
          <div className="mx-6 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <p className="text-xs font-bold text-emerald-700 mb-1">✓ Payment received — Pro unlocked!</p>
            <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800">
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* CTA */}
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={pay} disabled={paying || done}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl transition-colors">
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {done ? "Upgraded ✓" : paying ? "Confirm in MetaMask…" : `Pay ${PLANS[plan].eth} ETH`}
          </button>
        </div>
      </div>
    </div>
  );
}
