"use client";

import { PageLayout } from "@/components/PageLayout";
import { Shield, Globe, Key, User } from "lucide-react";

interface UserData {
  name?: string | null;
  email?: string | null;
  role?: string;
}

export function SettingsClient({ user }: { user: UserData }) {
  return (
    <PageLayout user={user}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-500 mb-8 text-sm">Manage your account and preferences.</p>

        {/* Account */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Email", value: user.email ?? "—" },
              { label: "Name",  value: user.name  ?? "—" },
              { label: "Role",  value: user.role  ?? "USER" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-medium ${label === "Role" ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs" : "text-gray-900"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Intelligence key */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Block67 Intelligence</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Block67 uses its own blockchain-specialized intelligence model for contract generation. Add your API key to unlock the full feature set.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 font-mono text-xs text-gray-500 flex items-center justify-between">
            <span>ANTHROPIC_API_KEY=sk-ant-••••••••••••</span>
            <span className="text-gray-400">Set in .env.local</span>
          </div>
        </section>

        {/* Custom domain */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom Domain</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Connect a custom domain to any of your published projects.
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 font-mono text-xs text-gray-500">
            yourproject.block67.app → <span className="text-gray-700">your-domain.com</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Custom domain support coming soon.</p>
        </section>
      </div>
    </PageLayout>
  );
}
