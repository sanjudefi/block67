import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="h-14 border-b border-gray-100 px-6 sticky top-0 bg-white/95 backdrop-blur-sm z-50 flex items-center">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="text-lg font-bold text-gray-900 flex items-center gap-1">
            block<span className="text-indigo-600">67</span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#product"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Product</a>
            <a href="#usecases"  className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Use Cases</a>
            <a href="#plans"     className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Plans</a>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            <Link href="/login"  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
