// Public marketing layout — nav + children
import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800/60 px-6 py-4 sticky top-0 bg-gray-950/80 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            block<span className="text-indigo-500">67</span>
            <span className="text-gray-600">.app</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/templates" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Templates
            </Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
