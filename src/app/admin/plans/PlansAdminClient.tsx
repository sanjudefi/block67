"use client";
// Admin Plans Management UI

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";

interface Plan {
  id:                    string;
  slug:                  string;
  name:                  string;
  priceMonthly:          number;
  totalPrice:            number;
  billingNote:           string | null;
  projectLimit:          number;
  domainLimit:           number;
  frontendChangesPerDay: number;
  contractChangesPerDay: number;
  paymentAddress:        string | null;
  paymentAmountEth:      string | null;
  testnetsEnabled:       boolean;
  isActive:              boolean;
  sortOrder:             number;
  features:              string[];
}

const EMPTY: Omit<Plan, "id"> = {
  slug: "", name: "", priceMonthly: 0, totalPrice: 0, billingNote: "",
  projectLimit: 3, domainLimit: 0, frontendChangesPerDay: 10, contractChangesPerDay: 2,
  paymentAddress: "", paymentAmountEth: "",
  testnetsEnabled: false, isActive: true, sortOrder: 0, features: [],
};

export function PlansAdminClient() {
  const [plans,     setPlans]     = useState<Plan[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Plan | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [form,      setForm]      = useState<Omit<Plan, "id">>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [featInput, setFeatInput] = useState("");

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    const res  = await fetch("/api/admin/plans");
    const data = await res.json() as { plans: Plan[] };
    setPlans(data.plans ?? []);
    setLoading(false);
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFeatInput("");
    setError("");
    setCreating(true);
  }

  function startEdit(p: Plan) {
    setCreating(false);
    setEditing(p);
    setForm({ ...p });
    setFeatInput("");
    setError("");
  }

  function cancelForm() { setCreating(false); setEditing(null); setError(""); }

  function addFeature() {
    const f = featInput.trim();
    if (!f) return;
    setForm(prev => ({ ...prev, features: [...prev.features, f] }));
    setFeatInput("");
  }

  function removeFeature(i: number) {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    setError(""); setSaving(true);
    const url    = editing ? `/api/admin/plans/${editing.id}` : "/api/admin/plans";
    const method = editing ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json() as { error?: string };
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    cancelForm();
    loadPlans();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    loadPlans();
  }

  async function toggleTestnet(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testnetsEnabled: !p.testnetsEnabled }),
    });
    loadPlans();
  }

  async function toggleActive(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    loadPlans();
  }

  const f = (v: string) => ({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
  void f;

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-gray-400 text-sm mt-1">Manage subscription plans, limits, and payment settings.</p>
        </div>
        <button onClick={startCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-bold mb-5">{editing ? "Edit Plan" : "Create Plan"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: "Slug",               key: "slug",                  type: "text",   placeholder: "premium" },
              { label: "Name",               key: "name",                  type: "text",   placeholder: "Premium" },
              { label: "Price / month ($)",  key: "priceMonthly",          type: "number", placeholder: "9.99" },
              { label: "Total price ($)",    key: "totalPrice",            type: "number", placeholder: "99.99" },
              { label: "Billing note",       key: "billingNote",           type: "text",   placeholder: "11 months + 2 free" },
              { label: "Projects limit",     key: "projectLimit",          type: "number", placeholder: "6" },
              { label: "Domains limit",      key: "domainLimit",           type: "number", placeholder: "6" },
              { label: "Frontend changes/day", key: "frontendChangesPerDay", type: "number", placeholder: "50" },
              { label: "Contract changes/day", key: "contractChangesPerDay", type: "number", placeholder: "10" },
              { label: "Payment address (ETH)", key: "paymentAddress",     type: "text",   placeholder: "0x..." },
              { label: "Payment amount (ETH)", key: "paymentAmountEth",    type: "text",   placeholder: "0.033" },
              { label: "Sort order",         key: "sortOrder",             type: "number", placeholder: "1" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type={type} value={String((form as Record<string, unknown>)[key] ?? "")}
                  placeholder={placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.testnetsEnabled}
                onChange={e => setForm(prev => ({ ...prev, testnetsEnabled: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500" />
              <span className="text-sm text-gray-300">Testnet payments enabled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500" />
              <span className="text-sm text-gray-300">Active (visible to users)</span>
            </label>
          </div>

          {/* Features */}
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Features (bullet points)</label>
            <div className="space-y-1.5 mb-2">
              {form.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300 flex-1">{feat}</span>
                  <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={featInput} onChange={e => setFeatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())}
                placeholder="Add a feature…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              <button onClick={addFeature}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
                Add
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={cancelForm}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </div>
      )}

      {/* Plans table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No plans yet</p>
          <p className="text-sm">Click "New Plan" to create your first plan. Default plans (Free, Premium, Enterprise) will be auto-created when users visit the upgrade page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <div key={p.id}
              className={`bg-gray-900 border rounded-2xl p-5 transition-all ${p.isActive ? "border-gray-700" : "border-gray-800 opacity-60"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-white">{p.name}</h3>
                    <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">{p.slug}</span>
                    {!p.isActive && <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                  <p className="text-2xl font-bold text-indigo-400">
                    ${p.totalPrice.toFixed(2)}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      {p.billingNote ?? `$${p.priceMonthly.toFixed(2)}/mo`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(p)}
                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-950 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {p.slug !== "free" && (
                    <button onClick={() => deletePlan(p.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-gray-500 mb-0.5">Projects</p>
                  <p className="font-bold text-white">{p.projectLimit}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-gray-500 mb-0.5">Domains</p>
                  <p className="font-bold text-white">{p.domainLimit}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-gray-500 mb-0.5">Frontend/day</p>
                  <p className="font-bold text-white">{p.frontendChangesPerDay}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-gray-500 mb-0.5">Contract/day</p>
                  <p className="font-bold text-white">{p.contractChangesPerDay}</p>
                </div>
              </div>

              {p.paymentAddress && (
                <p className="text-xs text-gray-500 font-mono mb-2 truncate">
                  💳 {p.paymentAddress}  ·  {p.paymentAmountEth} ETH
                </p>
              )}

              <div className="flex items-center gap-4">
                <button onClick={() => toggleTestnet(p)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 transition-colors">
                  {p.testnetsEnabled
                    ? <><ToggleRight className="w-4 h-4 text-amber-400" /> <span className="text-amber-400">Testnet ON</span></>
                    : <><ToggleLeft className="w-4 h-4" /> Testnet OFF</>
                  }
                </button>
                <button onClick={() => toggleActive(p)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors">
                  {p.isActive
                    ? <><ToggleRight className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Active</span></>
                    : <><ToggleLeft className="w-4 h-4" /> Inactive</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
