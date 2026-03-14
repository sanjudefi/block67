import Link from "next/link";

const FEATURES = [
  {
    icon: "⚡",
    title: "Deploy in Minutes",
    desc: "Pick a template, fill in the parameters, and deploy your smart contract with one MetaMask click. No Solidity knowledge needed.",
  },
  {
    icon: "🎨",
    title: "Auto-Generated Dashboards",
    desc: "Every deployed contract gets a live dashboard with metrics, read/write interactions, and deployment history.",
  },
  {
    icon: "🌐",
    title: "Free Subdomain Instantly",
    desc: "Share your project at yourapp.block67.app the moment it deploys. Connect a custom domain anytime.",
  },
];

const TEMPLATES = [
  { name: "ERC-20 Token",   tag: "TOKEN",        desc: "Launch your own fungible token" },
  { name: "ERC-721 NFT",    tag: "NFT",          desc: "Create NFT collections with metadata" },
  { name: "DAO Governance", tag: "DAO",          desc: "On-chain voting and proposals" },
  { name: "Landing Page",   tag: "LANDING_PAGE", desc: "Web3 landing with wallet connect" },
];

const STEPS = [
  { n: "01", title: "Pick a template",    desc: "Browse our marketplace of production-ready contracts." },
  { n: "02", title: "Customize params",   desc: "Fill in name, symbol, supply, or any contract parameter." },
  { n: "03", title: "Deploy via MetaMask",desc: "One click, sign the transaction — contract is live on-chain." },
  { n: "04", title: "Share your app",     desc: "Your dashboard is live at slug.block67.app immediately." },
];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-800/40 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now live · Deploy on Base, Ethereum, Polygon &amp; more
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Build Blockchain Apps<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">
              Without the Complexity
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Browse production-ready smart contract templates, customize the parameters,
            deploy with MetaMask, and get an instant dashboard — no blockchain expertise required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
            >
              Start Building Free →
            </Link>
            <Link
              href="/templates"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
            >
              Browse Templates
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-xs mx-auto">
            {[{ n: "12", label: "Chains" }, { n: "50+", label: "Templates" }, { n: "Free", label: "Subdomain" }].map(
              (s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white">{s.n}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Everything you need to ship</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Templates preview ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-white">Popular Templates</h2>
            <Link href="/templates" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((t) => (
              <Link
                key={t.name}
                href="/templates"
                className="bg-gray-900 border border-gray-800 hover:border-indigo-700/60 rounded-xl p-5 transition-all group"
              >
                <div className="text-xs font-medium text-indigo-400 mb-2 tracking-wide">{t.tag}</div>
                <h3 className="text-white font-semibold mb-1.5 group-hover:text-indigo-300 transition-colors">{t.name}</h3>
                <p className="text-gray-500 text-xs">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900/40 border-y border-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-black text-gray-800 mb-3">{s.n}</div>
                <h3 className="text-white font-semibold mb-1.5">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-5">Ready to deploy your first contract?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Join builders shipping blockchain apps on block67. Free forever for open projects.
          </p>
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>
            block<span className="text-indigo-500">67</span>.app — Build blockchain apps, fast.
          </span>
          <div className="flex gap-6">
            <Link href="/templates" className="hover:text-gray-300 transition-colors">Templates</Link>
            <Link href="/login"     className="hover:text-gray-300 transition-colors">Sign In</Link>
            <Link href="/signup"    className="hover:text-gray-300 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
