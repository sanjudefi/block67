"use client";

import { AppShell } from "@/components/AppShell";
import { Shield, Globe, Key } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string;
}

export function SettingsClient({ user }: { user: User }) {
  return (
    <AppShell user={user}>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-400 mb-8 text-sm">Manage your account and preferences.</p>

        {/* Account info */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Account</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-200">{user.email ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-200">{user.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Role</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-600/30">
                {user.role ?? "USER"}
              </span>
            </div>
          </div>
        </section>

        {/* API Key */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">AI Configuration</h2>
          </div>
          <p className="text-gray-500 text-sm mb-3">
            block67 uses Claude AI for code generation. Add your Anthropic API key to enable full AI features.
          </p>
          <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-500 font-mono flex items-center justify-between">
            <span>ANTHROPIC_API_KEY=sk-ant-••••••••••••••••</span>
            <span className="text-gray-600">Set in .env.local</span>
          </div>
        </section>

        {/* Custom domain */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Custom Domain</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Connect a custom domain to your published project.
          </p>
          <div className="bg-gray-800/60 rounded-xl px-4 py-3 text-xs text-gray-500 font-mono">
            yourproject.block67.app → <span className="text-gray-400">your-domain.com</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">Custom domain support coming soon.</p>
        </section>
      </div>
    </AppShell>
  );
}
