import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="h-14 border-b border-gray-200 px-6 sticky top-0 bg-white/95 backdrop-blur-sm z-50 flex items-center">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/block_67-logo.png"
              alt="block67"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-base font-bold text-gray-900">
              block<span className="text-indigo-600">67</span>
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#usecases"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Use Cases</a>
            <a href="#howitworks" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
            <a href="#features"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
            <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Contact</Link>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors">
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

      <Footer />
    </div>
  );
}
