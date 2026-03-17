"use client";
// DomainModal — connect a custom domain to a project (Premium only)

import { useState, useEffect } from "react";
import { Globe, X, Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";

interface DomainConfig {
  id:         string;
  domain:     string;
  txtRecord:  string;
  verified:   boolean;
  verifiedAt: string | null;
}

interface Props {
  projectId:   string;
  projectName: string;
  projectSlug: string;
  onClose:     () => void;
  onUpgrade:   () => void;   // called if user isn't premium
}

export function DomainModal({ projectId, projectName, projectSlug, onClose, onUpgrade }: Props) {
  const [config,   setConfig]   = useState<DomainConfig | null>(null);
  const [domain,   setDomain]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);
  const [needsPro, setNeedsPro] = useState(false);

  useEffect(() => {
    fetch(`/api/domains/${projectId}`)
      .then(r => r.json())
      .then(d => { setConfig(d.config); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  async function saveDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setError(""); setSaving(true);
    const res = await fetch("/api/domains", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ projectId, domain: domain.trim() }),
    });
    const data = await res.json() as { config?: DomainConfig; error?: string; upgrade?: boolean };
    setSaving(false);
    if (!res.ok) {
      if (data.upgrade) { setNeedsPro(true); return; }
      setError(data.error ?? "Failed to save");
      return;
    }
    setConfig(data.config ?? null);
    setDomain("");
  }

  async function removeDomain() {
    if (!confirm("Remove domain connection?")) return;
    await fetch(`/api/domains/${projectId}`, { method: "DELETE" });
    setConfig(null);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Upgrade gate ──────────────────────────────────────────────────────────
  if (needsPro) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <Globe className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Premium Feature</h2>
          <p className="text-gray-500 text-sm mb-6">
            Connecting custom domains requires a Premium account. Upgrade to connect up to 6 domains directly to your projects.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl">Cancel</button>
            <button onClick={() => { onClose(); onUpgrade(); }}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Connect Custom Domain</h2>
              <p className="text-xs text-gray-400">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : config ? (
            /* Existing domain config */
            <>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{config.domain}</p>
                  <p className={`text-xs mt-0.5 ${config.verified ? "text-emerald-600" : "text-amber-600"}`}>
                    {config.verified ? "✓ Verified" : "⏳ Pending DNS verification"}
                  </p>
                </div>
                <button onClick={removeDomain} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* DNS setup instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">DNS Setup Instructions</p>

                {/* Step 1: CNAME */}
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-2">Step 1 — Add CNAME record</p>
                  <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-1.5 font-mono text-xs text-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold">CNAME</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Name</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">@</span>
                        <button onClick={() => copy("@", "name")} className="text-blue-400 hover:text-blue-600">
                          {copied === "name" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Value</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{projectSlug}.block67.app</span>
                        <button onClick={() => copy(`${projectSlug}.block67.app`, "cname")} className="text-blue-400 hover:text-blue-600">
                          {copied === "cname" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: TXT verification */}
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-2">Step 2 — Add TXT verification record</p>
                  <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-1.5 font-mono text-xs text-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold">TXT</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Name</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold break-all">_block67-verify.{config.domain}</span>
                        <button onClick={() => copy(`_block67-verify.${config.domain}`, "txtname")} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                          {copied === "txtname" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-500">Value</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold break-all">{config.txtRecord}</span>
                        <button onClick={() => copy(config.txtRecord, "txtval")} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                          {copied === "txtval" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-blue-600">DNS changes can take up to 48 hours to propagate.</p>
              </div>

              <a href={`https://dnschecker.org/#CNAME/${config.domain}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700">
                <ExternalLink className="w-3.5 h-3.5" /> Check DNS propagation
              </a>
            </>
          ) : (
            /* Enter new domain */
            <form onSubmit={saveDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your domain</label>
                <input
                  type="text" value={domain} onChange={e => setDomain(e.target.value)}
                  placeholder="mytoken.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Example: <span className="font-mono">mytoken.com</span> or <span className="font-mono">app.mytoken.com</span>
                </p>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-2">After connecting you'll need to:</p>
                <p>1. Add a <span className="font-mono bg-white px-1 py-0.5 rounded">CNAME</span> record pointing to <span className="font-mono bg-white px-1 py-0.5 rounded">{projectSlug}.block67.app</span></p>
                <p>2. Add a <span className="font-mono bg-white px-1 py-0.5 rounded">TXT</span> record for domain verification</p>
              </div>

              <button type="submit" disabled={saving || !domain.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {saving ? "Connecting…" : "Connect Domain"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
