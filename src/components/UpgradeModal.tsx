"use client";
// UpgradeModal — single Premium plan, MetaMask payment, prominent success state

import { useState, useEffect } from "react";
import { Loader2, Zap, Check, ExternalLink, X, Star, AlertTriangle } from "lucide-react";
import type { PlanConfig } from "@/lib/upgrade/plans";

interface Props {
  onClose:      () => void;
  onUpgraded:   () => void;
  projectCount: number;
  freeLimit:    number;
}

export function UpgradeModal({ onClose, onUpgraded, projectCount, freeLimit }: Props) {
  const [plan,    setPlan]    = useState<PlanConfig | null>(null);
  const [paying,  setPaying]  = useState(false);
  const [txHash,  setTxHash]  = useState("");
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const premium = (d.plans as PlanConfig[])?.find(p => p.slug === "premium");
        if (premium) setPlan(premium);
      })
      .catch(() => {
        // Fallback hardcoded
        setPlan({
          id: "premium", slug: "premium", name: "Premium",
          priceMonthly: 9.99, totalPrice: 99.99,
          billingNote: "11 months + 2 months free",
          projectLimit: 6, domainLimit: 6,
          frontendChangesPerDay: 50, contractChangesPerDay: 10,
          paymentAddress: "0xd76DBc2603FF17c3e01751Dbce38a961121229Bc",
          paymentAmountEth: "0.033",
          testnetsEnabled: false,
          features: ["6 projects", "6 custom domains", "50 frontend changes/day", "10 contract changes/day", "Priority support"],
        });
      });
  }, []);

  async function pay() {
    if (!plan) return;
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask and try again.");
      return;
    }
    setPaying(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const from = accounts[0];
      if (!from) throw new Error("No account selected in MetaMask.");

      const ethAmount = plan.paymentAmountEth ?? "0.033";
      const wei    = BigInt(Math.round(parseFloat(ethAmount) * 1e18));
      const weiHex = "0x" + wei.toString(16);
      const to     = plan.paymentAddress ?? "0xd76DBc2603FF17c3e01751Dbce38a961121229Bc";

      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to, value: weiHex, gas: "0x5208" }],
      }) as string;

      setTxHash(hash);

      const res = await fetch("/api/upgrade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ txHash: hash, plan: "yearly", walletAddress: from }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Server error");
      }

      setDone(true);
      setTimeout(onUpgraded, 3000);
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

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">You're Premium!</h2>
            <p className="text-indigo-100 text-sm">Payment received. Your account has been upgraded.</p>
          </div>
          <div className="p-6">
            <div className="space-y-2.5 mb-6">
              {(plan?.features ?? []).map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            {txHash && (
              <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 mb-4">
                View transaction on Etherscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <p className="text-center text-xs text-gray-400">Closing automatically…</p>
          </div>
        </div>
      </div>
    );
  }

  const paymentAddress = plan?.paymentAddress ?? "0xd76DBc2603FF17c3e01751Dbce38a961121229Bc";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Upgrade to Premium</h2>
            </div>
            <p className="text-sm text-gray-500">
              You've used {projectCount}/{freeLimit} free projects.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan card */}
        {plan ? (
          <div className="mx-6 mb-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                {plan.billingNote && (
                  <p className="text-xs text-indigo-500 font-medium mt-0.5">{plan.billingNote}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-600">${plan.totalPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-400">/ year  ·  ${plan.priceMonthly.toFixed(2)}/mo</p>
              </div>
            </div>
            {plan.testnetsEnabled && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">Test Mode — Testnet payments accepted</p>
              </div>
            )}
            <div className="space-y-1.5">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-6 mb-4 h-40 bg-gray-100 rounded-2xl animate-pulse" />
        )}

        {/* Payment info */}
        <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Payment sent directly to</p>
          <p className="text-xs font-mono text-amber-800 break-all">{paymentAddress}</p>
          <p className="text-[10px] text-amber-600 mt-1">
            {plan?.paymentAmountEth ?? "…"} ETH via MetaMask
            {plan?.testnetsEnabled ? " (testnet accepted)" : " on any EVM network"}
          </p>
        </div>

        {error && (
          <div className="mx-6 mb-3 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* CTA */}
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={pay} disabled={paying || !plan}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl transition-colors">
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {paying ? "Confirm in MetaMask…" : `Pay ${plan?.paymentAmountEth ?? "…"} ETH`}
          </button>
        </div>
      </div>
    </div>
  );
}
