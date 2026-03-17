"use client";
// DomainModal — Vercel-backed custom domain connection (Premium only)
// Flow: enter domain → Vercel API registers it → show CNAME DNS instructions
//       → poll /api/domains/status every 5s → show Pending → Verified

import { useState, useEffect, useRef } from "react";
import {
  Globe, X, Check, Copy, ExternalLink, Loader2, Trash2,
  AlertTriangle, RefreshCw, CircleCheck,
} from "lucide-react";

interface DomainConfig {
  id:          string;
  domain:      string;
  txtRecord:   string;
  verified:    boolean;
  verifiedAt:  string | null;
}

interface VercelStatus {
  verified:      boolean;
  misconfigured: boolean;
  cname:         string;
  dbVerified:    boolean;
  verifiedAt:    string | null;
}

interface Props {
  projectId:   string;
  projectName: string;
  projectSlug: string;
  onClose:     () => void;
  onUpgrade:   () => void;
}

export function DomainModal({ projectId, projectName, projectSlug, onClose, onUpgrade }: Props) {
  const [config,   setConfig]   = useState<DomainConfig | null>(null);
  const [domain,   setDomain]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);
  const [needsPro, setNeedsPro] = useState(false);
  const [status,   setStatus]   = useState<VercelStatus | null>(null);
  const [polling,  setPolling]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing config
  useEffect(() => {
    fetch(`/api/domains/${projectId}`)
      .then(r => r.json())
      .then(d => { setConfig(d.config); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  // Start polling once we have a domain saved
  useEffect(() => {
    if (!config?.domain) { stopPolling(); return; }
    if (config.verified)  { stopPolling(); return; }
    startPolling(config.domain);
    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.domain, config?.verified]);

  function startPolling(d: string) {
    if (pollRef.current) return; // already polling
    setPolling(true);
    checkStatus(d); // immediate first check
    pollRef.current = setInterval(() => checkStatus(d), 5000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  }

  async function checkStatus(d: string) {
    try {
      const res  = await fetch(`/api/domains/status?domain=${encodeURIComponent(d)}`);
      const data = await res.json() as VercelStatus;
      setStatus(data);
      if (data.verified || data.dbVerified) {
        setConfig(prev => prev ? { ...prev, verified: true } : prev);
        stopPolling();
      }
    } catch { /* ignore poll errors */ }
  }

  async function saveDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setError(""); setSaving(true);

    const res  = await fetch("/api/domains/add", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ projectId, domain: domain.trim() }),
    });
    const data = await res.json() as { config?: DomainConfig; error?: string; upgrade?: boolean; vercelError?: string };
    setSaving(false);

    if (!res.ok) {
      if (data.upgrade) { setNeedsPro(true); return; }
      setError(data.error ?? "Failed to save");
      return;
    }

    if (data.vercelError) {
      setError(`Domain saved — but Vercel registration issue: ${data.vercelError}. Manually add the domain in Vercel dashboard.`);
    }

    setConfig(data.config ?? null);
    setDomain("");
  }

  async function removeDomain() {
    if (!confirm("Remove domain connection?")) return;
    stopPolling();
    await fetch(`/api/domains/${projectId}`, { method: "DELETE" });
    setConfig(null);
    setStatus(null);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Upgrade gate ─────────────────────────────────────────────────────────────
  if (needsPro) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <Globe className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Premium Feature</h2>
          <p className="text-gray-500 text-sm mb-6">
            Connecting custom domains requires a Premium account. Upgrade to connect up to 6 domains directly.
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
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
            /* ── Existing domain: show status + DNS instructions ── */
            <>
              {/* Domain + status header */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{config.domain}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {config.verified || status?.verified || status?.dbVerified ? (
                      <>
                        <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">Verified — domain is live!</span>
                      </>
                    ) : polling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        <span className="text-xs text-amber-600">Checking DNS…</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600">Pending DNS setup</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!config.verified && (
                    <button onClick={() => checkStatus(config.domain)}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Check status now">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={removeDomain} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Misconfigured warning */}
              {status?.misconfigured && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    DNS misconfigured. Make sure your CNAME points to <span className="font-mono font-bold">cname.vercel-dns.com</span> and no conflicting A/AAAA records exist.
                  </p>
                </div>
              )}

              {/* DNS Instructions */}
              {!(config.verified || status?.verified) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">DNS Setup — Add these records at your domain registrar</p>

                  {/* CNAME */}
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-2">CNAME record (required)</p>
                    <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
                      {[
                        { label: "Type",  value: "CNAME",                 key: "type"  },
                        { label: "Name",  value: "@",                     key: "name"  },
                        { label: "Value", value: "cname.vercel-dns.com",  key: "cname" },
                        { label: "TTL",   value: "Auto / 3600",           key: null    },
                      ].map(({ label, value, key }) => (
                        <div key={label} className="flex items-center justify-between px-3 py-2 border-b border-blue-50 last:border-0">
                          <span className="text-[11px] text-gray-400 w-12">{label}</span>
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            <span className="text-xs font-mono font-semibold text-gray-800">{value}</span>
                            {key && (
                              <button onClick={() => copy(value, key)} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                                {copied === key ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-blue-500 mt-1.5">
                      If you use a subdomain (e.g. <span className="font-mono">app.mytoken.com</span>), set Name to <span className="font-mono">app</span> instead of <span className="font-mono">@</span>.
                    </p>
                  </div>

                  <p className="text-[10px] text-blue-600">DNS propagation can take up to 48 hours. We check automatically every 5 seconds.</p>
                </div>
              )}

              {/* Verified state */}
              {(config.verified || status?.verified || status?.dbVerified) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 text-center">
                  <CircleCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-800 text-sm">Domain is live!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Visitors to <span className="font-mono font-bold">{config.domain}</span> will see your project.
                  </p>
                  <a href={`https://${config.domain}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mt-2 font-medium">
                    Visit site <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <a href={`https://dnschecker.org/#CNAME/${config.domain}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700">
                <ExternalLink className="w-3.5 h-3.5" /> Check DNS propagation on dnschecker.org
              </a>
            </>
          ) : (
            /* ── Enter new domain ── */
            <form onSubmit={saveDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your domain</label>
                <input
                  type="text" value={domain} onChange={e => setDomain(e.target.value)}
                  placeholder="mytoken.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Examples: <span className="font-mono">mytoken.com</span> or <span className="font-mono">app.mytoken.com</span>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
                <p className="font-semibold text-gray-700">After connecting you'll need to:</p>
                <p>1. Add a <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">CNAME</span> record pointing to <span className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">cname.vercel-dns.com</span></p>
                <p>2. Wait for DNS propagation (up to 48h, usually minutes)</p>
                <p>3. Domain goes live automatically once verified ✓</p>
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
