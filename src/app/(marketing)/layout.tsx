import Link from "next/link";
import { Zap } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="h-14 border-b border-white/10 px-6 sticky top-0 bg-[#0f1117]/95 backdrop-blur-sm z-50 flex items-center">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">
              block<span className="text-indigo-400">67</span>
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#usecases"   className="text-sm text-gray-400 hover:text-white transition-colors">Use Cases</a>
            <a href="#howitworks" className="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
            <a href="#features"   className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
              Sign In
            </Link>
            <Link href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
              Start Building →
            </Link>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
