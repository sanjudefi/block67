// Last 15 stable Solidity versions — newest first
export const SOLIDITY_VERSIONS = [
  "0.8.34",
  "0.8.28",
  "0.8.27",
  "0.8.26",
  "0.8.25",
  "0.8.24",
  "0.8.23",
  "0.8.22",
  "0.8.21",
  "0.8.20",
  "0.8.19",
  "0.8.18",
  "0.8.17",
  "0.8.16",
  "0.8.15",
] as const;

export type SolidityVersion = typeof SOLIDITY_VERSIONS[number];
export const DEFAULT_SOLIDITY_VERSION: SolidityVersion = "0.8.20";
