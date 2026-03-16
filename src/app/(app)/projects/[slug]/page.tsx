"use client";
// Builder — Architecture-first blockchain app builder
// Route: /projects/:slug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SOLIDITY_VERSIONS, DEFAULT_SOLIDITY_VERSION } from "@/lib/solidity/versions";
import {
  ArrowLeft, Zap, Globe, Rocket, Save, Check, X,
  Monitor, Tablet, Smartphone, Settings2, ChevronDown,
  Send, Mic, RefreshCw, Eye, Sliders, CircuitBoard,
  CheckCircle2, Loader2, Layers, Terminal,
  ChevronRight, MessageSquare, Copy, ExternalLink, FolderDown,
} from "lucide-react";
import { TemplatePreview } from "@/lib/templates/previews";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";
import { CONTRACT_ARCHITECTURES } from "@/lib/templates/contracts";
import type { ContractNode, ContractModule } from "@/lib/templates/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

type BuilderTab = "architecture" | "configure" | "compile" | "deploy" | "frontend";
type ViewMode   = "desktop" | "tablet" | "mobile";

interface PlanSection { heading: string; items: string[] }
interface ModuleSuggestion {
  contractId: string;
  moduleId: string;
  contractName: string;
  moduleName: string;
  description: string;
}
interface ChatMessage {
  id: string; role: "user" | "assistant";
  text: string; plan?: PlanSection[];
  moduleSuggestions?: ModuleSuggestion[];
  ts: Date;
}
interface Project {
  id: string; name: string; slug: string; status: string;
  paramValues: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePlan(text: string): { plan: PlanSection[]; remainder: string } {
  const sections: PlanSection[] = [];
  const lines = text.split("\n");
  let cur: PlanSection | null = null;
  const rem: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const hm = t.match(/^\*\*(.+?):?\*\*:?$/);
    if (hm) { if (cur) sections.push(cur); cur = { heading: hm[1], items: [] }; }
    else if (t.startsWith("• ") || t.startsWith("- ")) {
      if (!cur) cur = { heading: "", items: [] };
      cur.items.push(t.slice(2));
    } else { if (cur) { sections.push(cur); cur = null; } rem.push(t); }
  }
  if (cur) sections.push(cur);
  return { plan: sections, remainder: rem.join(" ") };
}


const DID_YOU_KNOW = [
  "Deploy to Ethereum, Base, Polygon and 12 other EVM chains",
  "Your contract ABI is saved automatically after deployment",
  "You can publish your app at yourproject.block67.app for free",
  "Contracts are deployed directly from your wallet — no custody",
];

// ── Contract Card (in graph) ──────────────────────────────────────────────────

function ContractCard({
  contract, isSelected, onClick, enabledCount,
}: {
  contract: ContractNode; isSelected: boolean; onClick: () => void; enabledCount: number;
}) {
  const total = contract.modules.length;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-36 rounded-xl p-3.5 text-left transition-all border-2 hover:shadow-md"
      style={isSelected
        ? { borderColor: contract.color, background: contract.color + "12", boxShadow: `0 0 0 3px ${contract.color}22` }
        : { borderColor: "#e5e7eb", background: "#fff" }
      }
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-black mb-2"
        style={{ background: contract.color }}
      >
        {contract.name.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-xs font-bold text-gray-900 leading-tight mb-0.5 truncate">{contract.name}</p>
      <p className="text-[10px] text-gray-400 mb-2">{contract.standard}</p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${(enabledCount / total) * 100}%`, background: contract.color }}
          />
        </div>
        <span className="text-[9px] text-gray-400 tabular-nums">{enabledCount}/{total}</span>
      </div>
    </button>
  );
}

// ── Module Card ───────────────────────────────────────────────────────────────

function ModuleCard({
  contractId, module, enabled, onToggle, config, onConfigChange,
}: {
  contractId: string;
  module: ContractModule;
  enabled: boolean;
  onToggle: () => void;
  config: Record<string, string>;
  onConfigChange: (key: string, val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        enabled ? "border-gray-200 shadow-sm" : "border-gray-100 opacity-55"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg w-7 text-center flex-shrink-0">{module.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900">{module.name}</p>
            {module.immutable && (
              <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold tracking-wide">CORE</span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-snug">{module.description}</p>
        </div>
        {/* Config expand button */}
        {module.configKey && enabled && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 text-[10px] text-gray-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-0.5"
          >
            <Settings2 className="w-3 h-3" />
            {expanded ? "↑" : "Config"}
          </button>
        )}
        {/* Toggle */}
        <button
          onClick={onToggle}
          disabled={module.immutable}
          title={module.immutable ? "Core module — cannot be disabled" : enabled ? "Disable module" : "Enable module"}
          className={`flex-shrink-0 relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
            module.immutable ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${enabled ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: enabled ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {/* Config input */}
      {expanded && module.configKey && enabled && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-50">
          <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-medium">
            {module.configKey}
          </label>
          <input
            type="text"
            value={config[module.configKey] ?? ""}
            onChange={(e) => onConfigChange(module.configKey!, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ── Module Suggestion Card (in chat) ─────────────────────────────────────────

function ModuleSuggestionCard({
  suggestion, onEnable, onDismiss,
}: {
  suggestion: ModuleSuggestion;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-indigo-500 text-sm">💡</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-indigo-700 mb-0.5">Module Suggestion</p>
          <p className="text-[12px] font-semibold text-gray-900">{suggestion.moduleName}</p>
          <p className="text-[11px] text-gray-500">{suggestion.contractName} · {suggestion.description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEnable}
          className="flex-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg transition-colors"
        >
          Enable Module ✓
        </button>
        <button
          onClick={onDismiss}
          className="text-[11px] text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BuilderPage({ params }: { params: { slug: string } }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // ── ethers.js wallet state (no wagmi on this page) ──────────────────────
  const [ethAddress,  setEthAddress]  = useState<string>("");
  const [ethChainId,  setEthChainId]  = useState<number | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploying,   setDeploying]   = useState(false);
  const [deployTxHash,      setDeployTxHash]      = useState<string>("");
  const [deployedAddress,   setDeployedAddress]   = useState<string>("");
  const [constructorArgs,   setConstructorArgs]   = useState<Record<string, string>>({});

  const isConnected = !!ethAddress;
  const SEPOLIA_CHAIN_ID = 11155111;

  // Listen for MetaMask account / chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handleAccounts = (accounts: string[]) => setEthAddress(accounts[0] ?? "");
    const handleChain    = (chainId: string)    => setEthChainId(parseInt(chainId, 16));
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged",    handleChain);
    // Check if already connected
    window.ethereum.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs[0]) {
        setEthAddress(accs[0]);
        window.ethereum.request({ method: "eth_chainId" }).then((c: string) =>
          setEthChainId(parseInt(c, 16))
        );
      }
    });
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged",    handleChain);
    };
  }, []);

  const [project, setProject]       = useState<Project | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [config, setConfig]         = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<TemplateId>("erc20-token");

  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [buildingRight, setBuildingRight] = useState(false);

  const [tab, setTab]               = useState<BuilderTab>("architecture");
  const [viewMode, setViewMode]     = useState<ViewMode>("desktop");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [publishModal, setPublishModal]     = useState(false);
  const [editSlug, setEditSlug]             = useState("");
  const [slugStatus, setSlugStatus]         = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [slugError, setSlugError]           = useState("");
  const [slugSuggestion, setSlugSuggestion] = useState("");
  const [savingSlug, setSavingSlug]         = useState(false);
  const [copied, setCopied]                 = useState(false);

  const [previewFlash, setPreviewFlash] = useState(false);
  const [updateToast, setUpdateToast]   = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Architecture state
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});

  // Compile state
  const [compiling, setCompiling]     = useState(false);
  const [compileLogs, setCompileLogs] = useState<string[]>([]);
  const [compiled, setCompiled]       = useState(false);
  const [solidityVersion, setSolidityVersion] = useState<string>(DEFAULT_SOLIDITY_VERSION);
  const [soliditySource, setSoliditySource]   = useState("");
  const [compileResult, setCompileResult]     = useState<{
    contracts: Record<string, { abi: unknown[]; bytecode: string }>;
    solcVersion: string;
  } | null>(null);
  const [selectedDeployContract, setSelectedDeployContract] = useState<string>("");

  // Upgradeable proxy state
  const [upgradeableEnabled, setUpgradeableEnabled] = useState(false);
  const [proxyPattern, setProxyPattern]             = useState<"uups" | "transparent" | "beacon">("uups");

  // Download state
  const [downloadModal, setDownloadModal] = useState(false);
  const [downloading, setDownloading]     = useState(false);
  const [downloadCfg, setDownloadCfg]     = useState({
    projectName:     "",
    framework:       "hardhat" as "hardhat" | "foundry" | "truffle",
    network:         "sepolia",
    solidityVersion: "0.8.20",
    packageManager:  "npm" as "npm" | "yarn",
    includeTests:    "yes",
  });

  // Dismissed module suggestions (by messageId:suggestionIdx)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const [didYouKnow] = useState(() => DID_YOU_KNOW[Math.floor(Math.random() * DID_YOU_KNOW.length)]);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const nameRef      = useRef<HTMLInputElement>(null);

  // Load project
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.projects ?? []).find((p: Project) => p.slug === params.slug);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setProject(found);
        setProjectName(found.name);
        const pv = found.paramValues as Record<string, string>;
        setConfig(pv);
        const tid = (pv._templateKey ?? "erc20-token") as TemplateId;
        setTemplateId(tid);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.slug]);

  // Initialize module states when template loads
  useEffect(() => {
    if (!templateId) return;
    const arch = CONTRACT_ARCHITECTURES[templateId];
    if (!arch) return;
    const states: Record<string, boolean> = {};
    arch.contracts.forEach((c) => {
      c.modules.forEach((m) => {
        const key = `${c.id}:${m.id}`;
        // Honour config-linked toggles if already set
        if (m.configKey && config[m.configKey] !== undefined) {
          states[key] = config[m.configKey] === "true" || m.defaultEnabled;
        } else {
          states[key] = m.defaultEnabled;
        }
      });
    });
    setModuleStates(states);
    setSelectedContractId(arch.contracts[0]?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Auto-fire initial prompt
  useEffect(() => {
    if (!project || loading) return;
    const p = searchParams.get("prompt");
    if (p && messages.length === 0) sendMessage(p, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, loading]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating]);

  const template    = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
  const architecture = CONTRACT_ARCHITECTURES[templateId];
  const selectedContract = architecture?.contracts.find((c) => c.id === selectedContractId) ?? null;

  function enabledCountFor(contract: ContractNode) {
    return contract.modules.filter((m) => moduleStates[`${contract.id}:${m.id}`] ?? m.defaultEnabled).length;
  }

  function toggleModule(contractId: string, moduleId: string, immutable?: boolean) {
    if (immutable) return;
    const key = `${contractId}:${moduleId}`;
    setModuleStates((prev) => ({ ...prev, [key]: !prev[key] }));
    setCompiled(false); // need recompile
  }

  function flashPreview(msg: string) {
    setPreviewFlash(true);
    setUpdateToast(msg);
    setTimeout(() => setPreviewFlash(false), 600);
    setTimeout(() => setUpdateToast(null), 2500);
  }

  const saveProject = useCallback(async (newConfig?: Record<string, string>, newName?: string) => {
    if (!project) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramValues: newConfig ?? config, ...(newName ? { name: newName } : {}) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }, [project, config]);

  async function sendMessage(text?: string, isInitial = false) {
    const msg = (text ?? input).trim();
    if (!msg || generating) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: msg, ts: new Date() }]);
    if (!text) setInput("");
    setGenerating(true);
    if (isInitial) setBuildingRight(true);

    try {
      const res  = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: msg, templateId, config }),
      });
      const data = await res.json();

      const hasConfigChanges = data.config && Object.keys(data.config).length > 0;
      let newConfig = config;

      if (hasConfigChanges) {
        newConfig = { ...config, ...data.config };
        setConfig(newConfig);
        // Stay on current tab — don't auto-jump to frontend
        setTimeout(() => flashPreview(data.message ?? "Config updated"), 100);
        if (project) {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paramValues: newConfig }),
          });
        }
      }

      const rawText = data.message ?? "Config updated. Review architecture, then compile.";
      const moduleSuggestions: ModuleSuggestion[] = data.moduleSuggestions ?? [];

      const { plan, remainder } = isInitial
        ? parsePlan(`I'll build your **${template?.name ?? "blockchain app"}**. Here's my plan:\n\n**Smart Contracts:**\n${
            architecture?.contracts.map((c) => `• ${c.name} (${c.standard})`).join("\n") ?? "• Contract configured"
          }\n\n**Configuration:**\n${
            Object.entries(data.config ?? {}).slice(0, 3).map(([k, v]) => `• ${k}: ${v}`).join("\n") || "• Default config applied"
          }\n\n**Next Steps:**\n• Review contract architecture below\n• Enable / disable modules per contract\n• Compile & deploy when ready\n\n${rawText}`)
        : { plan: [], remainder: rawText };

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: remainder, plan, moduleSuggestions, ts: new Date() },
      ]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Something went wrong. Please try again.", ts: new Date() }]);
    } finally {
      setGenerating(false);
      setBuildingRight(false);
      inputRef.current?.focus();
    }
  }

  async function handleCompile() {
    if (!project) return;
    setCompiling(true);
    setCompiled(false);
    setCompileLogs([]);
    setCompileResult(null);
    const logs: string[] = [];
    const addLog = (line: string) => { logs.push(line); setCompileLogs([...logs]); };

    try {
      addLog(`▶ Fetching Solidity source (pragma ^${solidityVersion}${upgradeableEnabled ? ` · ${proxyPattern.toUpperCase()} upgradeable` : ""})…`);
      const upgradeParams = upgradeableEnabled ? `&upgradeable=true&proxyPattern=${proxyPattern}` : "";
      const srcRes = await fetch(`/api/projects/${project.id}/source?version=${solidityVersion}${upgradeParams}`);
      if (!srcRes.ok) throw new Error("Failed to fetch source");
      const { source, filename } = await srcRes.json() as { source: string; filename: string };
      setSoliditySource(source);
      addLog(`✓ Source loaded: ${filename}${upgradeableEnabled ? " (upgradeable)" : ""}`);

      addLog(`▶ Compiling with solc ${solidityVersion}…`);
      const compRes = await fetch("/api/compile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ source, filename }),
      });
      const result = await compRes.json() as {
        success: boolean;
        contracts?: Record<string, { abi: unknown[]; bytecode: string }>;
        errors?: string[];
        warnings?: string[];
        solcVersion?: string;
        error?: string;
      };

      if (!compRes.ok || result.error) throw new Error(result.error ?? "Compilation request failed");

      // Show warnings
      for (const w of result.warnings ?? []) addLog(`⚠ ${w.split("\n")[0]}`);

      if (!result.success || !result.contracts) {
        for (const e of result.errors ?? []) addLog(`✗ ${e.split("\n").slice(0, 2).join(" | ")}`);
        addLog(`✗ Compilation failed · ${(result.errors ?? []).length} error(s)`);
        setCompiling(false);
        return;
      }

      const names = Object.keys(result.contracts);
      for (const name of names) {
        const c = result.contracts[name];
        const byteLen = Math.round((c.bytecode.length - 2) / 2);
        addLog(`✓ ${name} · ABI: ${(c.abi as unknown[]).length} items · Bytecode: ${byteLen} bytes`);
      }

      addLog(`✓ Build successful · ${names.length} contract(s) · 0 errors · ${(result.warnings ?? []).length} warning(s)`);
      addLog(`  solc ${result.solcVersion}`);

      setCompileResult({ contracts: result.contracts, solcVersion: result.solcVersion ?? "" });
      setSelectedDeployContract(names[0] ?? "");
      setCompiled(true);
    } catch (err: unknown) {
      addLog(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCompiling(false);
    }
  }

  // ── Slug editor helpers ───────────────────────────────────────────────────
  function openPublishModal() {
    setEditSlug(project?.slug ?? "");
    setSlugStatus("idle");
    setSlugError("");
    setSlugSuggestion("");
    setPublishModal(true);
  }

  async function checkSlug(value: string) {
    if (!project) return;
    const v = value.toLowerCase().trim();
    if (!v || v === project.slug) { setSlugStatus("idle"); setSlugError(""); return; }
    setSlugStatus("checking");
    try {
      const res  = await fetch(`/api/projects/slugs?slug=${encodeURIComponent(v)}&excludeId=${project.id}`);
      const data = await res.json() as { available: boolean; error?: string; suggestion?: string };
      if (data.available) {
        setSlugStatus("available");
        setSlugError("");
        setSlugSuggestion("");
      } else {
        setSlugStatus("taken");
        setSlugError(data.error ?? "Subdomain is already taken");
        setSlugSuggestion(data.suggestion ?? "");
      }
    } catch {
      setSlugStatus("error");
      setSlugError("Could not check availability");
    }
  }

  async function saveSlug() {
    if (!project || slugStatus === "taken" || slugStatus === "error") return;
    const newSlug = editSlug.toLowerCase().trim();
    if (!newSlug || newSlug === project.slug) return;
    setSavingSlug(true);
    const res  = await fetch(`/api/projects/${project.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slug: newSlug }),
    });
    const data = await res.json() as { project?: { slug: string }; error?: string };
    setSavingSlug(false);
    if (data.project) {
      setProject((p) => p ? { ...p, slug: data.project!.slug } : p);
      setEditSlug(data.project.slug);
      setSlugStatus("idle");
    } else {
      setSlugStatus("taken");
      setSlugError(data.error ?? "Could not update subdomain");
    }
  }

  async function publishProject() {
    if (!project) return;
    // Save slug first if it changed
    const newSlug = editSlug.toLowerCase().trim();
    const body: Record<string, string> = { status: "ACTIVE" };
    if (newSlug && newSlug !== project.slug && slugStatus === "available") {
      body.slug = newSlug;
    }
    const res  = await fetch(`/api/projects/${project.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json() as { project?: { status: string; slug: string } };
    setProject((p) => p ? { ...p, status: "ACTIVE", ...(data.project?.slug ? { slug: data.project.slug } : {}) } : p);
    setPublishModal(false);
  }

  function copyLiveUrl() {
    if (!project) return;
    navigator.clipboard.writeText(`https://${project.slug}.block67.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    if (!project) return;
    setDownloading(true);
    try {
      const opts = {
        ...downloadCfg,
        projectName: downloadCfg.projectName || projectName,
        includeTests: downloadCfg.includeTests === "yes",
      };
      const res = await fetch(`/api/projects/${project.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${(downloadCfg.projectName || projectName).toLowerCase().replace(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  const VIEW_W: Record<ViewMode, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

  if (loading) return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    </div>
  );

  if (notFound) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-3">
      <p className="text-gray-800 font-semibold">Project not found</p>
      <button onClick={() => router.push("/dashboard")} className="text-indigo-600 text-sm hover:underline">← Back to home</button>
    </div>
  );

  // Tab definitions
  const TABS: { id: BuilderTab; icon: React.FC<{className?: string}>; label: string; sub: string }[] = [
    { id: "architecture", icon: Layers,        label: "Architecture", sub: "Contracts & modules" },
    { id: "configure",    icon: Sliders,        label: "Configure",   sub: "App parameters" },
    { id: "compile",      icon: Terminal,       label: "Compile",     sub: "Build contracts" },
    { id: "deploy",       icon: CircuitBoard,   label: "Deploy",      sub: "Launch on-chain" },
    { id: "frontend",     icon: Eye,            label: "Frontend",    sub: "Live preview" },
  ];

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="h-11 border-b border-gray-100 flex items-center px-4 gap-3 flex-shrink-0 bg-white z-30">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          {editingName ? (
            <input
              ref={nameRef}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (projectName.trim() && projectName !== project?.name) {
                  await saveProject(undefined, projectName.trim());
                  setProject((p) => p ? { ...p, name: projectName.trim() } : p);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") nameRef.current?.blur();
                if (e.key === "Escape") { setProjectName(project?.name ?? ""); setEditingName(false); }
              }}
              className="text-sm font-semibold text-gray-900 bg-gray-100 border border-indigo-400 rounded-md px-2 py-0.5 outline-none max-w-[160px]"
              autoFocus
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-gray-900 hover:text-gray-600 max-w-[180px] truncate">
              {projectName}
            </button>
          )}
          <span className="text-gray-200 text-sm">·</span>
          <span className="text-xs text-gray-400 hidden sm:block">{template?.name ?? "Project"}</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => saveProject()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {saved   ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Saved</span></>
           : saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
           : <><Save className="w-3.5 h-3.5" />Save</>}
        </button>

        <button
          onClick={() => setDownloadModal(true)}
          className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FolderDown className="w-3.5 h-3.5" />
          Download
        </button>

        {/* Block67 Intelligence toggle — mobile only */}
        <button
          onClick={() => setMobileChatOpen(true)}
          className="sm:hidden flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Block67
        </button>

        {project?.status === "ACTIVE" ? (
          /* ── Live URL badge — top-right after publish ────────────────── */
          <div className="flex items-center gap-1.5">
            <a
              href={`https://${project.slug}.block67.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors max-w-[200px] truncate"
            >
              <Globe className="w-3 h-3 flex-shrink-0" />
              {project.slug}.block67.app
            </a>
            <button
              onClick={copyLiveUrl}
              title="Copy live URL"
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
            </span>
          </div>
        ) : (
          <button
            onClick={openPublishModal}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-indigo-600 text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> Publish
          </button>
        )}
      </header>

      {/* ── Tab strip ────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white flex-shrink-0 px-2 z-20 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {TABS.map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setMobileChatOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all group flex-shrink-0 ${
                tab === id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${tab === id ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`} />
              <div className="text-left hidden sm:block">
                <div className={`text-sm font-semibold leading-tight ${tab === id ? "text-indigo-700" : "text-gray-700"}`}>{label}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{sub}</div>
              </div>
              <span className="sm:hidden text-xs font-semibold">{label}</span>
              {/* Compiled badge on compile tab */}
              {id === "compile" && compiled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              )}
            </button>
          ))}

          {/* View controls — frontend tab only */}
          {tab === "frontend" && (
            <>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 self-center bg-gray-100 rounded-lg p-0.5 mr-2">
                {(["desktop", "tablet", "mobile"] as ViewMode[]).map((m) => {
                  const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
                  const Ic = icons[m];
                  return (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                    >
                      <Ic className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Mobile backdrop */}
        {mobileChatOpen && (
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileChatOpen(false)}
          />
        )}

        {/* ── Left: Block67 Intelligence panel ──────────────────────────── */}
        <div className={[
          "flex-shrink-0 border-r border-gray-100 bg-white flex flex-col",
          // Desktop: always-visible side panel
          "sm:w-[320px] xl:w-[360px] sm:relative sm:z-auto sm:translate-y-0 sm:rounded-none sm:shadow-none sm:h-auto",
          // Mobile: bottom sheet overlay
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out",
          mobileChatOpen ? "translate-y-0" : "translate-y-full sm:translate-y-0",
        ].join(" ")} style={{ height: mobileChatOpen ? "80vh" : undefined }}>

          {/* Mobile header bar */}
          <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Block67 Intelligence</span>
            </div>
            <button
              onClick={() => setMobileChatOpen(false)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Welcome */}
            {messages.length === 0 && !generating && (
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">Block67 Intelligence</span>
                  <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                    ● Ready
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Describe the changes you want — token name, supply, features — and your <strong className="text-gray-700">{template?.name ?? "project"}</strong> contract will update instantly.
                </p>
                <div className="space-y-2">
                  {(template?.suggestedPrompts ?? []).slice(0, 4).map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="w-full text-left text-xs text-gray-600 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-3.5 py-2.5 transition-all leading-relaxed"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                {msg.role === "assistant" ? (
                  <div>
                    {(idx === 0 || messages[idx - 1]?.role === "user") && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Block67 Intelligence</span>
                      </div>
                    )}
                    {/* Structured plan */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div className="text-sm text-gray-700 space-y-3 mb-2">
                        {msg.plan.map((sec, i) => (
                          <div key={i}>
                            {sec.heading && <p className="font-bold text-gray-900 text-[13px] mb-1">{sec.heading}:</p>}
                            {sec.items.map((item, j) => (
                              <div key={j} className="flex items-start gap-2 mb-0.5">
                                <span className="text-gray-300 mt-0.5 text-xs">•</span>
                                <span className="text-gray-600 text-[12px] leading-relaxed">{item}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text && <p className="text-[12px] text-gray-600 leading-relaxed">{msg.text}</p>}

                    {/* Module suggestions */}
                    {(msg.moduleSuggestions ?? []).map((sug, si) => {
                      const key = `${msg.id}:${si}`;
                      if (dismissedSuggestions.has(key)) return null;
                      return (
                        <ModuleSuggestionCard
                          key={key}
                          suggestion={sug}
                          onEnable={() => {
                            setModuleStates((prev) => ({ ...prev, [`${sug.contractId}:${sug.moduleId}`]: true }));
                            setDismissedSuggestions((s) => new Set(s).add(key));
                            setSelectedContractId(sug.contractId);
                            setTab("architecture");
                            setCompiled(false);
                          }}
                          onDismiss={() => setDismissedSuggestions((s) => new Set(s).add(key))}
                        />
                      );
                    })}

                    <p className="text-[10px] text-gray-300 mt-1.5">{msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] bg-gray-100 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                      <p className="text-[13px] text-gray-800">{msg.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {generating && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">Block67 Intelligence</span>
                  <span className="text-[10px] text-indigo-500 animate-pulse">Thinking…</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 120, 240].map((d) => (
                    <span key={d} className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick config accordion */}
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-700 py-1.5 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Settings2 className="w-3 h-3" /> Edit config directly
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showConfigPanel ? "rotate-180" : ""}`} />
            </button>
            {showConfigPanel && template && (
              <div className="space-y-2 pb-2 max-h-52 overflow-y-auto">
                {template.params.filter((p) => p.type !== "select").map((param) => (
                  <div key={param.key}>
                    <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">{param.label}</label>
                    {param.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config[param.key] === "true"}
                          onChange={(e) => { const nc = { ...config, [param.key]: e.target.checked ? "true" : "false" }; setConfig(nc); flashPreview("Config updated"); }}
                          className="rounded" />
                        <span className="text-xs text-gray-500">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : param.type === "color" ? (
                      <div className="flex items-center gap-2">
                        <input type="color" value={config[param.key] || "#6366f1"}
                          onChange={(e) => { const nc = { ...config, [param.key]: e.target.value }; setConfig(nc); flashPreview("Color updated"); }}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <span className="text-[11px] text-gray-400 font-mono">{config[param.key]}</span>
                      </div>
                    ) : (
                      <input type="text" value={config[param.key] ?? ""} placeholder={param.placeholder}
                        onChange={(e) => { const nc = { ...config, [param.key]: e.target.value }; setConfig(nc); }}
                        onBlur={() => flashPreview("Preview updated")}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 placeholder-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input box */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-colors px-3 py-2.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                placeholder="Describe what to change…"
                disabled={generating}
                className="flex-1 bg-transparent text-[13px] text-gray-800 outline-none resize-none placeholder-gray-400 disabled:opacity-40 max-h-20"
                style={{ lineHeight: "1.5" }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || generating}
                  className="w-7 h-7 flex items-center justify-center bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 text-white rounded-lg transition-colors"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <button
                onClick={() => { setConfig(template?.defaultConfig ?? {}); flashPreview("Reset to defaults"); }}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
              <span className="text-[10px] text-gray-300">↵ Enter to send</span>
            </div>
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">

          {/* Update toast */}
          {updateToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {updateToast}
            </div>
          )}

          {/* ── Architecture tab ─────────────────────────────────────── */}
          {tab === "architecture" && architecture && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Contract Graph */}
              <div className="bg-white border-b border-gray-100 px-5 py-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Contract Architecture</h2>
                    <p className="text-xs text-gray-400">{template?.name} · {architecture.contracts.length} contract{architecture.contracts.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => { setTab("compile"); setMobileChatOpen(false); }}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" /> Compile →
                  </button>
                </div>

                {/* Contract cards row */}
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {architecture.contracts.map((contract, i) => (
                    <div key={contract.id} className="flex items-center gap-2 flex-shrink-0">
                      <ContractCard
                        contract={contract}
                        isSelected={selectedContractId === contract.id}
                        onClick={() => setSelectedContractId(contract.id)}
                        enabledCount={enabledCountFor(contract)}
                      />
                      {/* Arrow to next */}
                      {contract.connects.length > 0 && (
                        <div className="flex items-center gap-0.5 text-gray-300 flex-shrink-0">
                          <div className="w-6 h-px bg-gray-200" />
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contract sub-tabs */}
              <div className="border-b border-gray-100 bg-white flex items-center px-4 gap-0.5 flex-shrink-0 overflow-x-auto">
                {architecture.contracts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractId(c.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      selectedContractId === c.id
                        ? "border-b-2 text-gray-900"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    }`}
                    style={selectedContractId === c.id ? { borderColor: c.color, color: c.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: selectedContractId === c.id ? c.color : "#d1d5db" }}
                    />
                    {c.name}
                    <span className="text-[9px] font-normal text-gray-400 ml-0.5">
                      {enabledCountFor(c)}/{c.modules.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Module list */}
              <div className="flex-1 overflow-y-auto p-5">
                {selectedContract ? (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{selectedContract.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {selectedContract.standard} · {enabledCountFor(selectedContract)} of {selectedContract.modules.length} modules active
                        </p>
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-black"
                        style={{ background: selectedContract.color }}
                      >
                        {selectedContract.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedContract.modules.map((mod) => (
                        <ModuleCard
                          key={mod.id}
                          contractId={selectedContract.id}
                          module={mod}
                          enabled={moduleStates[`${selectedContract.id}:${mod.id}`] ?? mod.defaultEnabled}
                          onToggle={() => toggleModule(selectedContract.id, mod.id, mod.immutable)}
                          config={config}
                          onConfigChange={(key, val) => {
                            setConfig((c) => ({ ...c, [key]: val }));
                            flashPreview("Config updated");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Select a contract above to view its modules
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Configure tab ────────────────────────────────────────── */}
          {tab === "configure" && template && (
            <div className="flex-1 overflow-auto p-6 bg-white">
              <div className="max-w-lg">
                <div className={`flex items-center gap-3 bg-gradient-to-r ${template.gradient} rounded-xl p-4 mb-6 text-white`}>
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <p className="font-bold">{template.name}</p>
                    <p className="text-white/70 text-xs">{template.tagline}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {template.params.map((param) => (
                    <div key={param.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {param.label}
                        {param.required && <span className="text-red-400 ml-1 font-normal text-xs">required</span>}
                      </label>
                      {param.type === "color" ? (
                        <div className="flex items-center gap-3">
                          <input type="color" value={config[param.key] || "#6366f1"}
                            onChange={(e) => { setConfig({ ...config, [param.key]: e.target.value }); flashPreview("Color updated"); }}
                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
                          <span className="text-sm text-gray-500 font-mono">{config[param.key]}</span>
                        </div>
                      ) : param.type === "boolean" ? (
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={config[param.key] === "true"}
                            onChange={(e) => { setConfig({ ...config, [param.key]: e.target.checked ? "true" : "false" }); flashPreview("Updated"); }}
                            className="w-4 h-4 rounded" />
                          <span className="text-sm text-gray-600">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                        </label>
                      ) : param.type === "select" ? (
                        <select
                          value={config[param.key] ?? param.defaultValue}
                          onChange={(e) => { setConfig({ ...config, [param.key]: e.target.value }); flashPreview("Theme updated"); }}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all"
                        >
                          {param.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={config[param.key] ?? ""} placeholder={param.placeholder}
                          onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                          onBlur={() => flashPreview("Preview updated")}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-gray-900 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
                {/* ── Upgradeable Proxy Panel ─────────────────────────── */}
                <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => { setUpgradeableEnabled((v) => !v); setCompiled(false); setCompileResult(null); setSoliditySource(""); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-4 rounded-full transition-colors flex items-center ${upgradeableEnabled ? "bg-indigo-600" : "bg-gray-300"}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${upgradeableEnabled ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Upgradeable Contract</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${upgradeableEnabled ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                      {upgradeableEnabled ? "Enabled" : "Off"}
                    </span>
                  </button>

                  {upgradeableEnabled && (
                    <div className="px-4 py-4 space-y-4 bg-white">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Generates an upgradeable contract with <code className="bg-gray-100 px-1 rounded">initialize()</code> instead
                        of a constructor, plus a ready-to-deploy proxy contract.
                      </p>

                      {/* Proxy pattern selector */}
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Proxy Pattern</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(["uups", "transparent", "beacon"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => { setProxyPattern(p); setCompiled(false); setCompileResult(null); setSoliditySource(""); }}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                                proxyPattern === p
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                              }`}
                            >
                              {p === "uups" ? "UUPS" : p === "transparent" ? "Transparent" : "Beacon"}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                          {proxyPattern === "uups"
                            ? "UUPS — upgrade logic in implementation · gas-efficient · recommended for new projects"
                            : proxyPattern === "transparent"
                            ? "Transparent — ProxyAdmin separates admin from user calls · classic OpenZeppelin pattern"
                            : "Beacon — one upgrade propagates to ALL proxy instances simultaneously · ideal for NFT factories"
                          }
                        </p>
                      </div>

                      {/* Key differences */}
                      <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800 space-y-1 font-mono leading-relaxed">
                        <p className="font-bold text-indigo-900 font-sans mb-1.5">Generated contract differences:</p>
                        <p>• <span className="line-through text-indigo-400">constructor()</span> → <span className="text-emerald-700 font-semibold">initialize()</span></p>
                        <p>• Inherits <span className="text-indigo-600">Initializable</span> (prevents double-init)</p>
                        <p>• <span className="text-indigo-600">_authorizeUpgrade()</span> = onlyOwner</p>
                        <p>• <span className="text-indigo-600">_disableInitializers()</span> in constructor stub</p>
                        <p>• Proxy contract included in output</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { saveProject(); setTab("frontend"); }}
                  className="w-full mt-6 bg-gray-900 hover:bg-indigo-600 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Save & Preview
                </button>
              </div>
            </div>
          )}

          {/* ── Compile tab ──────────────────────────────────────────── */}
          {tab === "compile" && (
            <div className="flex-1 overflow-auto p-6 bg-white">
              <div className="max-w-2xl space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Compile Contracts</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Real solc compiler · ABI + Bytecode</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Solidity version selector — latest → oldest */}
                    <div className="relative">
                      <select
                        value={solidityVersion}
                        onChange={(e) => { setSolidityVersion(e.target.value); setCompiled(false); setCompileResult(null); setSoliditySource(""); }}
                        className="appearance-none pl-3 pr-7 py-2 text-xs font-mono border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        {SOLIDITY_VERSIONS.map((v) => (
                          <option key={v} value={v}>solidity ^{v}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => setDownloadModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-xl transition-colors"
                    >
                      <FolderDown className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={handleCompile}
                      disabled={compiling}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {compiling ? "Compiling…" : "Compile"}
                    </button>
                  </div>
                </div>

                {/* Solidity source preview */}
                {soliditySource && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solidity Source</p>
                      <button onClick={() => navigator.clipboard.writeText(soliditySource)}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 transition-colors">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <pre className="bg-gray-950 rounded-xl p-4 font-mono text-[11px] text-emerald-300 max-h-64 overflow-auto border border-gray-800 whitespace-pre-wrap leading-relaxed">
                      {soliditySource}
                    </pre>
                  </div>
                )}

                {/* Compiler console */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Compiler Output</p>
                  <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs min-h-40 max-h-72 overflow-y-auto border border-gray-800">
                    {compileLogs.length === 0 ? (
                      <p className="text-gray-600">{"// Select a version and click Compile"}</p>
                    ) : (
                      compileLogs.map((log, i) => (
                        <div key={i} className={`leading-relaxed ${
                          log.startsWith("✓") ? "text-emerald-400" :
                          log.startsWith("✗") ? "text-red-400"    :
                          log.startsWith("▶") ? "text-indigo-400" :
                          log.startsWith("⚠") ? "text-yellow-400" :
                          log.startsWith("  ") ? "text-gray-500"  :
                          "text-gray-400"
                        }`}>{log}</div>
                      ))
                    )}
                    {compiling && <div className="text-gray-600 animate-pulse mt-1">▌</div>}
                  </div>
                </div>

                {/* ABI + Bytecode (shown after successful compile) */}
                {compiled && compileResult && !compiling && (
                  <div className="space-y-4">
                    {/* Contract selector if multiple */}
                    {Object.keys(compileResult.contracts).length > 1 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-gray-500">Contract:</p>
                        {Object.keys(compileResult.contracts).map((name) => (
                          <button key={name} onClick={() => setSelectedDeployContract(name)}
                            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                              selectedDeployContract === name
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}>
                            {name}
                          </button>
                        ))}
                      </div>
                    )}

                    {compileResult.contracts[selectedDeployContract] && (
                      <>
                        {/* ABI */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              ABI · {(compileResult.contracts[selectedDeployContract].abi as unknown[]).length} items
                            </p>
                            <button onClick={() => navigator.clipboard.writeText(
                              JSON.stringify(compileResult.contracts[selectedDeployContract].abi, null, 2)
                            )} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 transition-colors">
                              <Copy className="w-3 h-3" /> Copy ABI
                            </button>
                          </div>
                          <pre className="bg-gray-950 rounded-xl p-4 font-mono text-[11px] text-cyan-300 max-h-48 overflow-auto border border-gray-800 whitespace-pre">
                            {JSON.stringify(compileResult.contracts[selectedDeployContract].abi, null, 2)}
                          </pre>
                        </div>

                        {/* Bytecode */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Bytecode · {Math.round((compileResult.contracts[selectedDeployContract].bytecode.length - 2) / 2)} bytes
                            </p>
                            <button onClick={() => navigator.clipboard.writeText(
                              compileResult.contracts[selectedDeployContract].bytecode
                            )} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 transition-colors">
                              <Copy className="w-3 h-3" /> Copy Bytecode
                            </button>
                          </div>
                          <div className="bg-gray-950 rounded-xl p-4 font-mono text-[11px] text-yellow-300 border border-gray-800 overflow-hidden">
                            <p className="truncate">{compileResult.contracts[selectedDeployContract].bytecode}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Success banner → Deploy */}
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Build successful · {Object.keys(compileResult.contracts).length} contract(s) ready
                      </div>
                      <button onClick={() => setTab("deploy")}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                        Deploy →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Deploy tab ───────────────────────────────────────────── */}
          {tab === "deploy" && (
            <div className="flex-1 overflow-auto p-6 bg-white">
              <div className="max-w-md space-y-4">

                {/* Must compile first */}
                {!compiled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-amber-500 text-sm">⚠️</span>
                    <p className="text-sm text-amber-700">
                      Compile first to get ABI + Bytecode.{" "}
                      <button onClick={() => setTab("compile")} className="underline font-semibold">Go to Compile →</button>
                    </p>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <CircuitBoard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Deploy Smart Contract</h2>
                    <p className="text-xs text-gray-400">Powered by ethers.js · MetaMask</p>
                  </div>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center">
                  {[
                    { label: "Connect Wallet",    done: isConnected },
                    { label: "Switch to Sepolia", done: isConnected && ethChainId === SEPOLIA_CHAIN_ID },
                    { label: "Deploy",            done: !!deployedAddress },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                        step.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {step.done ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className="text-[10px] text-gray-500 ml-1 flex-1 truncate">{step.label}</span>
                      {i < 2 && <div className="w-4 h-px bg-gray-200 mx-1 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* ── STEP 1: Connect Wallet (ethers.js) ── */}
                <div className={`border rounded-2xl overflow-hidden ${isConnected ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white shadow-sm"}`}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {isConnected ? "Wallet Connected" : "Step 1 · Connect Wallet"}
                      </p>
                      {isConnected && (
                        <p className="text-sm font-mono text-emerald-700 mt-0.5">
                          {ethAddress.slice(0, 6)}…{ethAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                    {isConnected ? (
                      <button onClick={() => { setEthAddress(""); setEthChainId(null); setDeployedAddress(""); setDeployTxHash(""); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setDeployError(null);
                          if (!window.ethereum) { setDeployError("MetaMask not found. Install it and refresh."); return; }
                          try {
                            const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
                            setEthAddress(accounts[0]);
                            const chainId: string = await window.ethereum.request({ method: "eth_chainId" });
                            setEthChainId(parseInt(chainId, 16));
                          } catch (err: unknown) {
                            setDeployError(err instanceof Error ? err.message : "Connection rejected.");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        🦊 Connect MetaMask
                      </button>
                    )}
                  </div>
                </div>

                {/* ── STEP 2: Switch to Sepolia ── */}
                {isConnected && (
                  <div className={`border rounded-2xl overflow-hidden ${ethChainId === SEPOLIA_CHAIN_ID ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white shadow-sm"}`}>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {ethChainId === SEPOLIA_CHAIN_ID ? "Network: Sepolia ✓" : "Step 2 · Switch Network"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ethChainId === SEPOLIA_CHAIN_ID
                            ? "Chain ID 11155111 · Ready for deployment"
                            : `Current chain ID: ${ethChainId ?? "unknown"}`}
                        </p>
                      </div>
                      {ethChainId !== SEPOLIA_CHAIN_ID && (
                        <button
                          onClick={async () => {
                            setDeployError(null);
                            try {
                              await window.ethereum.request({
                                method: "wallet_switchEthereumChain",
                                params: [{ chainId: "0xaa36a7" }], // Sepolia
                              });
                            } catch (err: unknown) {
                              const msg = err instanceof Error ? err.message : String(err);
                              if (msg.includes("4902")) {
                                // Chain not added yet — add it
                                await window.ethereum.request({
                                  method: "wallet_addEthereumChain",
                                  params: [{
                                    chainId: "0xaa36a7",
                                    chainName: "Sepolia Testnet",
                                    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                                    rpcUrls: ["https://rpc.sepolia.org"],
                                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                                  }],
                                });
                              } else {
                                setDeployError(msg);
                              }
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-colors"
                        >
                          Switch to Sepolia
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Error banner ── */}
                {deployError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm mt-0.5">✗</span>
                    <p className="text-xs text-red-700">{deployError}</p>
                  </div>
                )}

                {/* ── Contract selector + Constructor args ── */}
                {compiled && compileResult && isConnected && ethChainId === SEPOLIA_CHAIN_ID && (
                  <div className="space-y-3">
                    {/* Select contract to deploy */}
                    {Object.keys(compileResult.contracts).length > 1 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contract</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.keys(compileResult.contracts).map((name) => (
                            <button key={name} onClick={() => { setSelectedDeployContract(name); setConstructorArgs({}); }}
                              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                                selectedDeployContract === name ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}>
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constructor arguments from ABI */}
                    {(() => {
                      const abi = compileResult.contracts[selectedDeployContract]?.abi as { type: string; inputs?: { name: string; type: string }[] }[] | undefined;
                      const ctor = abi?.find((x) => x.type === "constructor");
                      const inputs = ctor?.inputs ?? [];
                      return inputs.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Constructor Arguments</p>
                          {inputs.map((inp) => (
                            <div key={inp.name} className="mb-2">
                              <label className="block text-[11px] text-gray-400 mb-1">
                                {inp.name} <span className="text-gray-300">({inp.type})</span>
                              </label>
                              <input
                                type="text"
                                placeholder={inp.type === "address" ? "0x…" : inp.type}
                                value={constructorArgs[inp.name] ?? ""}
                                onChange={(e) => setConstructorArgs((p) => ({ ...p, [inp.name]: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 placeholder-gray-300 focus:outline-none focus:border-indigo-400 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Deploy button */}
                    <button
                      disabled={deploying || !compileResult.contracts[selectedDeployContract]}
                      onClick={async () => {
                        setDeployError(null);
                        setDeployTxHash("");
                        setDeployedAddress("");
                        setDeploying(true);
                        try {
                          const { ethers } = await import("ethers");
                          const provider = new ethers.BrowserProvider(window.ethereum);
                          const signer   = await provider.getSigner();
                          const c        = compileResult.contracts[selectedDeployContract];
                          const abi      = c.abi as { type: string; inputs?: { name: string; type: string }[] }[];
                          const ctor     = abi.find((x) => x.type === "constructor");
                          const args     = (ctor?.inputs ?? []).map((inp) => {
                            const val = constructorArgs[inp.name] ?? "";
                            if (inp.type === "address" && !val) return ethAddress; // default to deployer
                            return val;
                          });
                          const factory  = new ethers.ContractFactory(abi, c.bytecode, signer);
                          const contract = await factory.deploy(...args);
                          setDeployTxHash(contract.deploymentTransaction()?.hash ?? "");
                          await contract.waitForDeployment();
                          const addr = await contract.getAddress();
                          setDeployedAddress(addr);
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : String(err);
                          if (msg.includes("user rejected") || msg.includes("denied"))
                            setDeployError("Transaction rejected in MetaMask.");
                          else
                            setDeployError(msg.slice(0, 200));
                        } finally {
                          setDeploying(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      {deploying ? "Deploying…" : `Deploy ${selectedDeployContract || "Contract"}`}
                    </button>
                  </div>
                )}

                {/* ── Deployment result ── */}
                {deployedAddress && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-5 h-5" /> Contract Deployed!
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Contract Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-gray-900 break-all">{deployedAddress}</p>
                        <button onClick={() => navigator.clipboard.writeText(deployedAddress)}
                          className="flex-shrink-0"><Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" /></button>
                      </div>
                    </div>
                    {deployTxHash && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Tx Hash</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-gray-500 truncate">{deployTxHash}</p>
                          <a href={`https://sepolia.etherscan.io/tx/${deployTxHash}`} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0"><ExternalLink className="w-3.5 h-3.5 text-indigo-500 hover:text-indigo-700" /></a>
                        </div>
                      </div>
                    )}
                    <a href={`https://sepolia.etherscan.io/address/${deployedAddress}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                      View on Sepolia Etherscan <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Not compiled yet + not connected */}
                {!compiled && !isConnected && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">Complete Compile first, then connect your wallet to deploy.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Frontend tab (live preview) ──────────────────────────── */}
          {tab === "frontend" && (
            buildingRight ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 bg-white">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 ring-1 ring-gray-200">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center animate-pulse">
                    <Zap className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Building your idea…</h2>
                <p className="text-sm text-gray-400 mb-5">Configuring your blockchain app</p>
                <div className="w-56 h-1 bg-gray-200 rounded-full overflow-hidden mb-8">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ animation: "progress 1.8s ease-in-out infinite" }} />
                </div>
                <p className="text-xs text-gray-400 mb-1">Did you know?</p>
                <p className="text-sm text-gray-500 text-center max-w-xs">{didYouKnow}</p>
                <style>{`@keyframes progress{0%{width:0;margin-left:0}50%{width:100%;margin-left:0}100%{width:0;margin-left:100%}}`}</style>
              </div>
            ) : (
              <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-50">
                <div
                  className={`bg-white rounded-xl overflow-hidden shadow-lg ring-1 transition-all duration-300 ${
                    previewFlash ? "ring-indigo-400 shadow-indigo-200" : "ring-gray-200"
                  }`}
                  style={{
                    width: VIEW_W[viewMode],
                    minHeight: "560px",
                    maxWidth: "100%",
                    height: viewMode === "mobile" ? "780px" : undefined,
                  }}
                >
                  <TemplatePreview templateId={templateId} config={config} />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Download Project modal ───────────────────────────────────── */}
      {downloadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Download Project</h3>
                <p className="text-xs text-gray-400 mt-0.5">Generate a complete smart contract project ZIP</p>
              </div>
              <button onClick={() => setDownloadModal(false)} className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={downloadCfg.projectName}
                  onChange={(e) => setDownloadCfg((d) => ({ ...d, projectName: e.target.value }))}
                  placeholder={projectName}
                  className="w-full border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                />
              </div>

              {/* Framework + Network */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Framework</label>
                  <select
                    value={downloadCfg.framework}
                    onChange={(e) => setDownloadCfg((d) => ({ ...d, framework: e.target.value as "hardhat"|"foundry"|"truffle" }))}
                    className="w-full border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3 py-2.5 outline-none bg-white"
                  >
                    <option value="hardhat">Hardhat</option>
                    <option value="foundry">Foundry</option>
                    <option value="truffle">Truffle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Network</label>
                  <select
                    value={downloadCfg.network}
                    onChange={(e) => setDownloadCfg((d) => ({ ...d, network: e.target.value }))}
                    className="w-full border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3 py-2.5 outline-none bg-white"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="sepolia">Sepolia (Testnet)</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="localhost">Localhost</option>
                  </select>
                </div>
              </div>

              {/* Solidity Version + Package Manager */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Solidity Version</label>
                  <select
                    value={downloadCfg.solidityVersion}
                    onChange={(e) => setDownloadCfg((d) => ({ ...d, solidityVersion: e.target.value }))}
                    className="w-full border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3 py-2.5 outline-none bg-white"
                  >
                    {SOLIDITY_VERSIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Package Manager</label>
                  <select
                    value={downloadCfg.packageManager}
                    onChange={(e) => setDownloadCfg((d) => ({ ...d, packageManager: e.target.value as "npm"|"yarn" }))}
                    className="w-full border border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-xl px-3 py-2.5 outline-none bg-white"
                  >
                    <option value="npm">npm</option>
                    <option value="yarn">yarn</option>
                  </select>
                </div>
              </div>

              {/* Include Tests */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Include Tests</label>
                <div className="flex gap-2">
                  {["yes", "no"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setDownloadCfg((d) => ({ ...d, includeTests: v }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        downloadCfg.includeTests === v
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {v === "yes" ? "Yes, include tests" : "No tests"}
                    </button>
                  ))}
                </div>
              </div>

              {/* What's included */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700 mb-1.5">ZIP will include:</p>
                {[
                  `${architecture?.contracts.length ?? 0} Solidity contracts`,
                  `${downloadCfg.framework} config + deploy script`,
                  downloadCfg.includeTests === "yes" ? "Test file templates" : null,
                  ".env.example + .gitignore",
                  "README with setup instructions",
                  "config/block67.config.json",
                ].filter(Boolean).map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {item}
                  </div>
                ))}
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {downloading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating ZIP…</>
                  : <><Terminal className="w-4 h-4" /> Generate &amp; Download</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish modal ─────────────────────────────────────────────── */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Publish to Subdomain</h3>
              </div>
              <button onClick={() => setPublishModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Subdomain editor */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Your subdomain
                  <span className="ml-1 text-gray-400 font-normal">(min. 8 characters)</span>
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-400 transition-colors">
                  <span className="text-xs text-gray-400 whitespace-nowrap select-none">block67.app /</span>
                  <input
                    value={editSlug}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setEditSlug(v);
                      setSlugStatus("idle");
                    }}
                    onBlur={() => checkSlug(editSlug)}
                    className="flex-1 bg-transparent text-sm font-mono text-gray-900 outline-none min-w-0"
                    placeholder="my-project"
                    maxLength={48}
                    spellCheck={false}
                  />
                  {/* Status indicator */}
                  {slugStatus === "checking" && (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />
                  )}
                  {slugStatus === "available" && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  )}
                  {slugStatus === "taken" && (
                    <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  )}
                </div>

                {/* Validation feedback */}
                {slugStatus === "available" && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Available
                  </p>
                )}
                {slugStatus === "taken" && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-red-600">{slugError}</p>
                    {slugSuggestion && (
                      <button
                        onClick={() => { setEditSlug(slugSuggestion); setSlugStatus("idle"); }}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Use &quot;{slugSuggestion}&quot; instead
                      </button>
                    )}
                  </div>
                )}
                {slugStatus === "error" && (
                  <p className="text-xs text-red-600 mt-1.5">{slugError}</p>
                )}
                {editSlug.length > 0 && editSlug.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    {8 - editSlug.length} more character{8 - editSlug.length !== 1 ? "s" : ""} needed
                  </p>
                )}
              </div>

              {/* Live URL preview */}
              <div className="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                <p className="text-[11px] text-indigo-400 uppercase tracking-wider mb-1 font-semibold">Live URL after publish</p>
                <p className="text-indigo-700 font-mono text-sm font-bold break-all">
                  https://{(editSlug || project?.slug)}.block67.app
                </p>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Your project will be publicly accessible at the URL above. You can change the subdomain
                any time from this dialog.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPublishModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={publishProject}
                  disabled={slugStatus === "taken" || slugStatus === "error" || slugStatus === "checking" || (editSlug.length > 0 && editSlug.length < 8)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" /> Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
