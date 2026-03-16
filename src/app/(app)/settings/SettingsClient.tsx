"use client";

import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Globe, Key, User, Link2, Unlink, Save, AlertCircle, Shield } from "lucide-react";

interface UserData {
  id?:            string | null;
  name?:          string | null;
  email?:         string | null;
  walletAddress?: string | null;
  role?:          string;
}

export function SettingsClient({ user: initial }: { user: UserData }) {
  const [user,    setUser]    = useState(initial);
  const [name,    setName]    = useState(initial.name  ?? "");
  const [email,   setEmail]   = useState(initial.email ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  // Wallet linking
  const [walletAddr,    setWalletAddr]    = useState("");
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [walletErr,     setWalletErr]     = useState("");
  const [walletMsg,     setWalletMsg]     = useState("");

  const isWalletOnly = !initial.email && !!initial.walletAddress;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr(""); setSaveMsg(""); setSaving(true);
    const res  = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveErr(data.error ?? "Failed to save."); return; }
    setUser(data.user);
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2500);
  }

  async function connectWallet() {
    setWalletErr("");
    if (typeof window === "undefined" || !window.ethereum) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const dappUrl = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
        return;
      }
      setWalletErr("MetaMask not installed. Get it at metamask.io");
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddr(accounts[0] ?? "");
    } catch {
      setWalletErr("Connection rejected.");
    }
  }

  async function linkWallet() {
    if (!walletAddr) return;
    setWalletErr(""); setWalletMsg(""); setLinkingWallet(true);
    try {
      const nonceRes  = await fetch(`/api/auth/nonce?address=${walletAddr}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error);

      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const signature  = await signer.signMessage(nonceData.nonce);

      const res  = await fetch("/api/user/link-wallet", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ address: walletAddr, signature, nonce: nonceData.nonce }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      setWalletAddr("");
      setWalletMsg("Wallet linked successfully!");
      setTimeout(() => setWalletMsg(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWalletErr(msg.includes("rejected") || msg.includes("denied") ? "Signature rejected." : msg);
    }
    setLinkingWallet(false);
  }

  async function unlinkWallet() {
    if (!confirm("Unlink your MetaMask wallet?")) return;
    setWalletErr(""); setWalletMsg("");
    const res  = await fetch("/api/user/link-wallet", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setWalletErr(data.error ?? "Failed to unlink."); return; }
    setUser(data.user);
    setWalletMsg("Wallet unlinked.");
    setTimeout(() => setWalletMsg(""), 3000);
  }

  return (
    <PageLayout user={user}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-500 mb-8 text-sm">Manage your account and preferences.</p>

        {/* Email required banner for wallet-only users */}
        {isWalletOnly && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Add an email to your account</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Your account uses MetaMask only. Add an email so you can still log in if you lose wallet access.
              </p>
            </div>
          </div>
        )}

        {/* Account */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Email{isWalletOnly && <span className="text-amber-600 font-semibold ml-1">* required</span>}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required={isWalletOnly}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs space-y-0.5">
                {saveErr && <p className="text-red-500">{saveErr}</p>}
                {saveMsg && <p className="text-green-600">{saveMsg}</p>}
                <p className="text-gray-400">
                  Role: <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{user.role ?? "USER"}</span>
                </p>
              </div>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </section>

        {/* MetaMask wallet */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">MetaMask Wallet</h2>
          </div>

          {walletErr && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{walletErr}</p>}
          {walletMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">{walletMsg}</p>}

          {user.walletAddress ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="text-sm font-mono text-indigo-600">
                  {user.walletAddress.slice(0, 8)}…{user.walletAddress.slice(-6)}
                </span>
                <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Linked</span>
              </div>
              {user.email && (
                <button onClick={unlinkWallet}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                  <Unlink className="w-3.5 h-3.5" /> Unlink wallet
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No wallet linked. Connect MetaMask to enable wallet sign-in.</p>
              {!walletAddr ? (
                <button onClick={connectWallet}
                  className="flex items-center gap-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-sm py-2.5 px-4 rounded-xl transition-colors">
                  🦊 Connect MetaMask
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                    Connected: <span className="font-mono text-indigo-600">{walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}</span>
                  </div>
                  <button onClick={linkWallet} disabled={linkingWallet}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors">
                    <Link2 className="w-4 h-4" />
                    {linkingWallet ? "Waiting for signature…" : "Link this wallet"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Intelligence key */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Block67 Intelligence</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Block67 uses its own blockchain-specialized intelligence model for contract generation.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 font-mono text-xs text-gray-500 flex items-center justify-between">
            <span>ANTHROPIC_API_KEY=sk-ant-••••••••••••</span>
            <span className="text-gray-400">Set in .env.local</span>
          </div>
        </section>

        {/* Custom domain */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom Domain</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Connect a custom domain to any of your published projects.
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 font-mono text-xs text-gray-500">
            yourproject.block67.app → <span className="text-gray-700">your-domain.com</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Custom domain support coming soon.</p>
        </section>
      </div>
    </PageLayout>
  );
}
