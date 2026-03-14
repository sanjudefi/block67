// block67.app — Shared TypeScript types

export type UserRole = "USER" | "ADMIN";
export type ProjectStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TemplateCategory = "TOKEN" | "NFT" | "DAO" | "LANDING_PAGE" | "DEFI" | "OTHER";
export type TemplateStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type DeploymentStatus = "PENDING" | "DEPLOYING" | "SUCCESS" | "FAILED";
export type NetworkType = "MAINNET" | "TESTNET";

// ─── Template parameter schema (stored in template.parameters) ───────────────
export interface TemplateParam {
  key: string;
  label: string;
  type: "string" | "number" | "address" | "boolean" | "url";
  required: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  description?: string;
}

// ─── Frontend widget config (stored in template.frontendConfig) ──────────────
export interface DashboardWidget {
  id: string;
  type: "metric" | "chart" | "table" | "action_button";
  title: string;
  contractMethod?: string; // ABI method name to call
  abiFragment?: string;    // JSON fragment for single call
}

// ─── Deployment constructor args ─────────────────────────────────────────────
export interface ConstructorArg {
  name: string;
  type: string;
  value: string;
}
