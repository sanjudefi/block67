"use client";
/**
 * Block67 Public dApp Shell
 *
 * Renders a fully interactive Web3 dApp for each deployed project.
 * Each template type gets its own UI — real on-chain reads & writes via ethers.js.
 *
 * Flow:
 *   server page.tsx  →  serializes project + deployment from DB
 *   this file        →  wallet connect + contract interaction
 */

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ExternalLink, Copy, CheckCircle2, AlertCircle,
  Loader2, Zap, RefreshCw, Send, Coins, Image, Vote, TrendingUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeploymentInfo {
  contractAddress: string;
  evmChainId:      number;
  chainName:       string;
  explorerUrl:     string;
  nativeCurrency:  string;
  rpcUrl:          string;
  contractAbi:     object[] | null;
  txHash:          string | null;
}

export interface ProjectData {
  id:          string;
  slug:        string;
  name:        string;
  templateKey: string;
  config:      Record<string, string>;
  deployment:  DeploymentInfo | null;
}

interface WalletState {
  address:   string;
  chainId:   number | null;
  connected: boolean;
}

// ── Fallback ABIs (human-readable fragments for standard block67 contracts) ───

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function owner() view returns (address)",
  "function mint(address to, uint256 amount)",
  "function taxBps() view returns (uint256)",
];

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function MINT_PRICE() view returns (uint256)",
  "function saleActive() view returns (bool)",
  "function publicMint() view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(uint256 quantity) payable",
  "function ownerMint(address to, uint256 qty)",
  "function setSaleActive(bool active)",
  "function setPublicMint(bool active)",
  "function owner() view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

const STAKING_ABI = [
  "function APY_BPS() view returns (uint256)",
  "function LOCK_SECS() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function staked(address) view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function stakedAt(address) view returns (uint256)",
  "function stakeToken() view returns (address)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimReward()",
];

const DAO_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function delegates(address) view returns (address)",
  "function delegate(address delegatee)",
  "function owner() view returns (address)",
  "function mint(address to, uint256 amount)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtUnits(raw: bigint, decimals = 18, precision = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole   = raw / divisor;
  const frac    = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function parseUnits(val: string, decimals = 18): bigint {
  const [w, f = ""] = val.split(".");
  const fracPadded = f.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(w || "0") * (10n ** BigInt(decimals)) + BigInt(fracPadded || "0");
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function NetBadge({ chainName, color = "indigo" }: { chainName: string; color?: string }) {
  const classes: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber:   "bg-amber-100  text-amber-700  border-amber-200",
  };
  return (
    <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${classes[color] ?? classes.indigo}`}>
      {chainName}
    </span>
  );
}

function TxLink({ hash, explorerUrl }: { hash: string; explorerUrl: string }) {
  return (
    <a href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
      View tx <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border mb-4 ${
      ok ? "bg-emerald-50 border-emerald-200 text-emerald-700"
         : "bg-red-50 border-red-200 text-red-700"
    }`}>
      {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-gray-400 hover:text-indigo-600">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Wallet Hook ───────────────────────────────────────────────────────────────

function useWallet(requiredChainId: number, projectSlug: string) {
  const [wallet, setWallet] = useState<WalletState>({ address: "", chainId: null, connected: false });
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const onAccounts = (accs: string[]) => setWallet((w) => ({ ...w, address: accs[0] ?? "", connected: !!accs[0] }));
    const onChain    = (c: string)      => setWallet((w) => ({ ...w, chainId: parseInt(c, 16) }));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged",    onChain);
    window.ethereum.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs[0]) {
        window.ethereum.request({ method: "eth_chainId" }).then((c: string) =>
          setWallet({ address: accs[0], chainId: parseInt(c, 16), connected: true })
        );
      }
    });
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setError("");
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      // Mobile: deep-link into MetaMask's in-app browser where window.ethereum is injected
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.href.replace(/^https?:\/\//, "")}`;
        return;
      }
      setError("MetaMask not found. Install it at metamask.io.");
      return;
    }
    try {
      const accs: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainHex: string = await window.ethereum.request({ method: "eth_chainId" });
      setWallet({ address: accs[0] ?? "", chainId: parseInt(chainHex, 16), connected: !!accs[0] });
      // Record this wallet connection in the DB (fire-and-forget)
      if (accs[0] && projectSlug) {
        fetch(`/api/site/${projectSlug}/connect`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ walletAddress: accs[0] }),
        }).catch(() => {/* non-critical */});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, [projectSlug]);

  const switchChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chain switch failed");
    }
  }, [requiredChainId]);

  const onWrongChain = wallet.connected && wallet.chainId !== null && wallet.chainId !== requiredChainId;

  return { wallet, error, connect, switchChain, onWrongChain };
}

// ── ERC-20 / Meme Token dApp ──────────────────────────────────────────────────

function ERC20DApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
  const isMeme = config._templateKey === "meme-token";
  const abi    = (d.contractAbi as string[] | null) ?? ERC20_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading, setLoading] = useState(true);
  const [info,    setInfo]    = useState({ name: config.tokenName || "Token", symbol: config.symbol || "TKN", supply: "0", decimals: 18, owner: "" });
  const [balance, setBalance] = useState("");
  const [taxBps,  setTaxBps]  = useState<number | null>(null);
  const [toast,   setToast]   = useState({ msg: "", ok: true });
  const [tx,      setTx]      = useState("");
  const [toAddr,  setToAddr]  = useState("");
  const [amount,  setAmount]  = useState("");
  const [mintTo,  setMintTo]  = useState("");
  const [mintAmt, setMintAmt] = useState("");
  const [busy,    setBusy]    = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadInfo = useCallback(async () => {
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [name, symbol, decimals, supply, owner] = await Promise.all([
        contract.name().catch(() => config.tokenName || "Token"),
        contract.symbol().catch(() => config.symbol || "TKN"),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => 0n),
        contract.owner().catch(() => ""),
      ]);
      const tax = isMeme ? await contract.taxBps().catch(() => null) : null;
      setInfo({ name, symbol, supply: fmtUnits(supply, Number(decimals), 2), decimals: Number(decimals), owner });
      if (tax !== null) setTaxBps(Number(tax));
    } catch { /* RPC might fail on unsupported chains */ }
    finally { setLoading(false); }
  }, [d, abi, config, isMeme]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal: bigint = await contract.balanceOf(wallet.address);
      setBalance(fmtUnits(bal, info.decimals));
    } catch { setBalance("—"); }
  }, [wallet, d, abi, info.decimals]);

  useEffect(() => { loadInfo(); }, [loadInfo]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const transfer = async () => {
    if (!toAddr || !amount) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.transfer(toAddr, parseUnits(amount, info.decimals))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Sent ${amount} ${info.symbol} successfully!`, true);
      setToAddr(""); setAmount("");
      loadBalance();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message.slice(0, 100) : "Transfer failed", false);
    } finally { setBusy(false); }
  };

  const mintTokens = async () => {
    if (!mintTo || !mintAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.mint(mintTo, parseUnits(mintAmt, info.decimals))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Minted ${mintAmt} ${info.symbol}!`, true);
      setMintTo(""); setMintAmt("");
      loadInfo(); loadBalance();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message.slice(0, 100) : "Mint failed", false);
    } finally { setBusy(false); }
  };

  const isOwner = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();
  const isMintable = config.mintable === "true" || isMeme;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: config.accentColor || "#6366f1" + "20" }}>
          <Coins className="w-5 h-5" style={{ color: config.accentColor || "#6366f1" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm truncate">{info.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 font-mono">${info.symbol}</span>
            {isMeme && taxBps !== null && <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">{taxBps / 100}% tax</span>}
          </div>
        </div>
        <NetBadge chainName={d.chainName} />
        <WalletConnectBtn wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading contract data…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Total Supply</p>
            <p className="font-bold text-gray-900">{info.supply} <span className="text-gray-400 font-normal text-xs">{info.symbol}</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Contract</p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-gray-600 truncate">{shortenAddress(d.contractAddress)}</span>
              <CopyBtn text={d.contractAddress} />
              <a href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 text-gray-400 hover:text-indigo-600" />
              </a>
            </div>
          </div>
        </div>

        {/* Balance */}
        {wallet.connected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">Your Balance</p>
              <button onClick={loadBalance} className="text-gray-300 hover:text-gray-600"><RefreshCw className="w-3 h-3" /></button>
            </div>
            <p className="text-2xl font-bold text-gray-900">{balance || "—"} <span className="text-base font-normal text-gray-400">{info.symbol}</span></p>
            <p className="text-xs text-gray-400 font-mono mt-1">{shortenAddress(wallet.address)}</p>
          </div>
        )}

        {/* Transfer */}
        {wallet.connected && !onWrongChain && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5"><Send className="w-4 h-4 text-indigo-500" /> Transfer</h3>
            <input value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="Recipient address (0x…)"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 font-mono" />
            <div className="flex gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount (${info.symbol})`}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" />
              <button onClick={transfer} disabled={busy || !toAddr || !amount}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
              </button>
            </div>
          </div>
        )}

        {/* Mint (owner only) */}
        {wallet.connected && !onWrongChain && isOwner && isMintable && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500" /> Mint Tokens <span className="text-[11px] text-indigo-500 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">Owner only</span>
            </h3>
            <input value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="Recipient address"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 font-mono" />
            <div className="flex gap-2">
              <input value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount to mint"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400" />
              <button onClick={mintTokens} disabled={busy || !mintTo || !mintAmt}
                className="px-4 py-2.5 bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Mint
              </button>
            </div>
          </div>
        )}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><TxLink hash={tx} explorerUrl={d.explorerUrl} /></div>}
        {!wallet.connected && <ConnectPrompt connect={connect} />}
        <ContractInfo d={d} />
      </div>
    </div>
  );
}

// ── NFT Mint dApp ─────────────────────────────────────────────────────────────

function NFTDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
  const abi = (d.contractAbi as string[] | null) ?? ERC721_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,    setLoading]    = useState(true);
  const [info,       setInfo]       = useState({ name: config.collectionName || "NFT", symbol: config.symbol || "NFT", maxSupply: 0n, mintPrice: 0n, minted: 0n, saleActive: false, owner: "" });
  const [balance,    setBalance]    = useState(0n);
  const [qty,        setQty]        = useState(1);
  const [toast,      setToast]      = useState({ msg: "", ok: true });
  const [tx,         setTx]         = useState("");
  const [busy,       setBusy]       = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadInfo = useCallback(async () => {
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [name, symbol, maxSupply, mintPrice, owner] = await Promise.all([
        contract.name().catch(() => config.collectionName || "NFT"),
        contract.symbol().catch(() => config.symbol || "NFT"),
        contract.MAX_SUPPLY().catch(() => BigInt(config.maxSupply || "10000")),
        contract.MINT_PRICE().catch(() => { try { return BigInt(Math.round(parseFloat(config.mintPrice || "0.05") * 1e18)); } catch { return 0n; } }),
        contract.owner().catch(() => ""),
      ]);
      const minted  = await contract.totalMinted().catch(() => contract.totalSupply().catch(() => 0n));
      const saleActive = await contract.saleActive().catch(() => contract.publicMint().catch(() => false));
      setInfo({ name, symbol, maxSupply, mintPrice, minted, saleActive, owner });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [d, abi, config]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal = await contract.balanceOf(wallet.address);
      setBalance(bal);
    } catch { /* ignore */ }
  }, [wallet, d, abi]);

  useEffect(() => { loadInfo(); }, [loadInfo]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const mintNFT = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const value      = info.mintPrice * BigInt(qty);
      const receipt    = await (await contract.mint(qty, { value })).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Minted ${qty} NFT${qty > 1 ? "s" : ""}! Check your wallet.`, true);
      loadInfo(); loadBalance();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg.includes("user rejected") ? "Transaction rejected." : msg.slice(0, 100), false);
    } finally { setBusy(false); }
  };

  const toggleSale = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      await (await (contract.setSaleActive ?? contract.setPublicMint)(!info.saleActive)).wait();
      showToast(`Sale ${info.saleActive ? "paused" : "activated"}!`, true);
      loadInfo();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Failed", false); }
    finally { setBusy(false); }
  };

  const pct      = info.maxSupply > 0n ? Number((info.minted * 100n) / info.maxSupply) : 0;
  const ethPrice = fmtUnits(info.mintPrice, 18, 4);
  const totalCost = fmtUnits(info.mintPrice * BigInt(qty), 18, 4);
  const isOwner   = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
          <Image className="w-5 h-5 text-pink-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm truncate">{info.name}</h1>
          <span className="text-xs text-gray-400 font-mono">{info.symbol}</span>
        </div>
        <NetBadge chainName={d.chainName} />
        {info.saleActive
          ? <span className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">● Live</span>
          : <span className="text-[11px] bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">Paused</span>
        }
        <WalletConnectBtn wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Loading collection…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Supply progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-900 text-lg">{info.minted.toString()} <span className="text-gray-400 font-normal text-sm">/ {info.maxSupply.toString()} minted</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{pct}% claimed</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Mint Price</p>
              <p className="font-bold text-gray-900">{ethPrice} {d.nativeCurrency}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Your NFTs */}
        {wallet.connected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Your NFTs</p>
              <p className="text-2xl font-bold text-gray-900">{balance.toString()}</p>
            </div>
            <button onClick={loadBalance} className="text-gray-300 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          </div>
        )}

        {/* Mint card */}
        {wallet.connected && !onWrongChain ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Mint NFT</h3>

            {!info.saleActive && !isOwner && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> Sale is not active yet
              </div>
            )}

            {/* Qty selector */}
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 flex-1">Quantity</p>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 font-bold">−</button>
                <span className="w-6 text-center text-sm font-bold">{qty}</span>
                <button onClick={() => setQty(Math.min(10, qty + 1))} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 font-bold">+</button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total cost</span>
              <span className="font-bold text-gray-900">{totalCost} {d.nativeCurrency}</span>
            </div>

            <button onClick={mintNFT} disabled={busy || !info.saleActive}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {busy ? "Minting…" : `Mint ${qty} NFT${qty > 1 ? "s" : ""}`}
            </button>
          </div>
        ) : !wallet.connected ? (
          <ConnectPrompt connect={connect} />
        ) : null}

        {/* Owner controls */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500" /> Owner Controls
            </h3>
            <button onClick={toggleSale} disabled={busy}
              className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition-colors ${info.saleActive ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100" : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}>
              {info.saleActive ? "⏸ Pause Sale" : "▶ Activate Sale"}
            </button>
          </div>
        )}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><TxLink hash={tx} explorerUrl={d.explorerUrl} /></div>}
        <ContractInfo d={d} />
      </div>
    </div>
  );
}

// ── DAO Governance dApp ───────────────────────────────────────────────────────

function DAODApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
  const abi = (d.contractAbi as string[] | null) ?? DAO_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,  setLoading]  = useState(true);
  const [info,     setInfo]     = useState({ name: config.daoName || "DAO", symbol: config.tokenName || "GOV", supply: "0", owner: "" });
  const [balance,  setBalance]  = useState("0");
  const [delegate, setDelegate] = useState("");
  const [delTo,    setDelTo]    = useState("");
  const [toast,    setToast]    = useState({ msg: "", ok: true });
  const [tx,       setTx]       = useState("");
  const [busy,     setBusy]     = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [name, symbol, supply, owner] = await Promise.all([
          contract.name().catch(() => config.daoName || "DAO Token"),
          contract.symbol().catch(() => config.tokenName || "GOV"),
          contract.totalSupply().catch(() => 0n),
          contract.owner().catch(() => ""),
        ]);
        setInfo({ name, symbol, supply: fmtUnits(supply, 18, 2), owner });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [d, abi, config]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [bal, del] = await Promise.all([
          contract.balanceOf(wallet.address).catch(() => 0n),
          contract.delegates(wallet.address).catch(() => ""),
        ]);
        setBalance(fmtUnits(bal, 18, 2));
        setDelegate(del);
      } catch { /* ignore */ }
    })();
  }, [wallet, d, abi]);

  const doDelegate = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.delegate(delTo || wallet.address)).wait();
      setTx(receipt?.hash ?? "");
      showToast("Delegation updated!", true);
      setDelegate(delTo || wallet.address);
      setDelTo("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Failed", false); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
          <Vote className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm truncate">{info.name}</h1>
          <span className="text-xs text-gray-400 font-mono">{info.symbol} Governance</span>
        </div>
        <NetBadge chainName={d.chainName} color="emerald" />
        <WalletConnectBtn wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Loading DAO…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Token Supply</p>
            <p className="font-bold text-gray-900">{info.supply} <span className="text-gray-400 font-normal text-xs">{info.symbol}</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Quorum</p>
            <p className="font-bold text-gray-900">{config.quorum || "4"}%</p>
          </div>
        </div>

        {wallet.connected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Your Voting Power</p>
                <p className="text-2xl font-bold text-gray-900">{balance} <span className="text-base font-normal text-gray-400">{info.symbol}</span></p>
              </div>
            </div>
            {delegate && <p className="text-xs text-gray-400">Delegated to: <span className="font-mono text-gray-600">{shortenAddress(delegate)}</span></p>}
          </div>
        )}

        {wallet.connected && !onWrongChain && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Delegate Votes</h3>
            <p className="text-xs text-gray-500">Delegate your voting power to yourself or another address to participate in governance.</p>
            <input value={delTo} onChange={(e) => setDelTo(e.target.value)} placeholder={`Leave empty to self-delegate`}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 font-mono" />
            <button onClick={doDelegate} disabled={busy}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Vote className="w-4 h-4" />}
              {busy ? "Delegating…" : "Delegate Votes"}
            </button>
          </div>
        )}

        {!wallet.connected && <ConnectPrompt connect={connect} />}
        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><TxLink hash={tx} explorerUrl={d.explorerUrl} /></div>}
        <ContractInfo d={d} />
      </div>
    </div>
  );
}

// ── Staking dApp ──────────────────────────────────────────────────────────────

function StakingDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
  const abi = (d.contractAbi as string[] | null) ?? STAKING_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,  setLoading]  = useState(true);
  const [info,     setInfo]     = useState({ apyBps: 0, lockSecs: 0, totalStaked: "0" });
  const [position, setPosition] = useState({ staked: "0", earned: "0", stakedAt: 0 });
  const [stakeAmt, setStakeAmt] = useState("");
  const [toast,    setToast]    = useState({ msg: "", ok: true });
  const [tx,       setTx]       = useState("");
  const [busy,     setBusy]     = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [apy, lock, total] = await Promise.all([
          contract.APY_BPS().catch(() => BigInt(Math.round(Number(config.apy || 12) * 100))),
          contract.LOCK_SECS().catch(() => BigInt(Number(config.lockDays || 30) * 86400)),
          contract.totalStaked().catch(() => 0n),
        ]);
        setInfo({ apyBps: Number(apy), lockSecs: Number(lock), totalStaked: fmtUnits(total, 18, 2) });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [d, abi, config]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [staked, earned, stakedAt] = await Promise.all([
          contract.staked(wallet.address).catch(() => 0n),
          contract.earned(wallet.address).catch(() => 0n),
          contract.stakedAt(wallet.address).catch(() => 0n),
        ]);
        setPosition({ staked: fmtUnits(staked, 18, 4), earned: fmtUnits(earned, 18, 6), stakedAt: Number(stakedAt) });
      } catch { /* ignore */ }
    })();
  }, [wallet, d, abi]);

  const lockDays   = Math.round(info.lockSecs / 86400);
  const apy        = (info.apyBps / 100).toFixed(1);
  const unlockDate = position.stakedAt > 0 ? new Date((position.stakedAt + info.lockSecs) * 1000) : null;
  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;

  const doStake = async () => {
    if (!stakeAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      // Note: staking requires prior approval of the stakeToken — handled by the contract itself
      const receipt    = await (await contract.stake(parseUnits(stakeAmt))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Staked ${stakeAmt} tokens!`, true);
      setStakeAmt("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Stake failed", false); }
    finally { setBusy(false); }
  };

  const doClaim = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.claimReward()).wait();
      setTx(receipt?.hash ?? "");
      showToast("Rewards claimed!", true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Claim failed", false); }
    finally { setBusy(false); }
  };

  const doUnstake = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.unstake(parseUnits(position.staked))).wait();
      setTx(receipt?.hash ?? "");
      showToast("Unstaked successfully!", true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Unstake failed", false); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 text-sm truncate">{config.tokenName || "Staking"} Pool</h1>
          <span className="text-xs font-semibold text-emerald-600">{apy}% APY</span>
        </div>
        <NetBadge chainName={d.chainName} color="amber" />
        <WalletConnectBtn wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Loading pool…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">APY</p>
            <p className="font-bold text-emerald-600 text-lg">{apy}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Lock</p>
            <p className="font-bold text-gray-900">{lockDays}d</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">TVL</p>
            <p className="font-bold text-gray-900 text-xs">{info.totalStaked}</p>
          </div>
        </div>

        {wallet.connected && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Your Position</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Staked</p><p className="font-bold text-gray-900">{position.staked}</p></div>
              <div><p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Rewards</p><p className="font-bold text-emerald-600">{position.earned}</p></div>
            </div>
            {unlockDate && <p className="text-xs text-gray-400">Unlocks: {unlockDate.toLocaleDateString()}</p>}
            <div className="flex gap-2 pt-1">
              {parseFloat(position.earned) > 0 && (
                <button onClick={doClaim} disabled={busy}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Claim
                </button>
              )}
              {parseFloat(position.staked) > 0 && isUnlocked && (
                <button onClick={doUnstake} disabled={busy}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  Unstake
                </button>
              )}
            </div>
          </div>
        )}

        {wallet.connected && !onWrongChain && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Stake Tokens</h3>
            <div className="flex gap-2">
              <input value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount to stake"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400" />
              <button onClick={doStake} disabled={busy || !stakeAmt}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Stake
              </button>
            </div>
          </div>
        )}

        {!wallet.connected && <ConnectPrompt connect={connect} />}
        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><TxLink hash={tx} explorerUrl={d.explorerUrl} /></div>}
        <ContractInfo d={d} />
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function WalletConnectBtn({ wallet, connect, onWrongChain, switchChain }: {
  wallet: WalletState; connect: () => void; onWrongChain: boolean; switchChain: () => void;
}) {
  if (!wallet.connected) {
    return (
      <button onClick={connect}
        className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">
        <Wallet className="w-3.5 h-3.5" /> Connect
      </button>
    );
  }
  if (onWrongChain) {
    return (
      <button onClick={switchChain}
        className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors">
        Switch Network
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      {shortenAddress(wallet.address)}
    </div>
  );
}

function ConnectPrompt({ connect }: { connect: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center space-y-3">
      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
        <Wallet className="w-6 h-6 text-indigo-500" />
      </div>
      <h3 className="font-semibold text-gray-900">Connect your wallet</h3>
      <p className="text-sm text-gray-500">Connect MetaMask to interact with this contract.</p>
      <button onClick={connect}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
        <Wallet className="w-4 h-4" /> Connect MetaMask
      </button>
    </div>
  );
}

function ContractInfo({ d }: { d: DeploymentInfo }) {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Contract</p>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-gray-600 flex-1 truncate">{d.contractAddress}</code>
        <CopyBtn text={d.contractAddress} />
        <a href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600" />
        </a>
      </div>
      <p className="text-[11px] text-gray-400">Network: {d.chainName}</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ProjectDApp({ data }: { data: ProjectData }) {
  const { deployment: d, templateKey, config } = data;

  if (!d || !d.contractAddress) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <Zap className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{data.name}</h1>
        <p className="text-gray-500 mb-2">This project hasn&apos;t been deployed to a blockchain yet.</p>
        <p className="text-xs text-gray-400">The contract will appear here once the owner deploys it.</p>
      </div>
    );
  }

  const props = { d, config, projectSlug: data.slug };
  switch (templateKey) {
    case "erc20-token":      return <ERC20DApp    {...props} />;
    case "meme-token":       return <ERC20DApp    {...props} />;
    case "nft-collection":   return <NFTDApp      {...props} />;
    case "dao-governance":   return <DAODApp      {...props} />;
    case "staking-dashboard":return <StakingDApp  {...props} />;
    default:                 return <ERC20DApp    {...props} />;
  }
}
