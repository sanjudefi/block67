export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-gray-400 mb-8 text-sm">Manage your account and preferences.</p>

      {/* Account info */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-200">{session?.user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-gray-200">{session?.user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-200">{session?.user?.role ?? "USER"}</span>
          </div>
        </div>
      </section>

      {/* Custom domain — placeholder */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Custom Domain</h2>
        <p className="text-gray-500 text-sm mb-4">
          Connect a custom domain to your project from the project settings page.
        </p>
        <div className="bg-gray-800/60 rounded-xl px-4 py-3 text-xs text-gray-500 font-mono">
          yourproject.block67.app → your-domain.com
        </div>
      </section>
    </div>
  );
}
