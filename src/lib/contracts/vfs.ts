/**
 * Block67 Virtual File System
 *
 * Resolves Solidity import paths for the online solc compiler so that
 * compilation NEVER fails due to missing imports.
 *
 * Supported import namespaces:
 *  - @openzeppelin/contracts/...              → node_modules (non-upgradeable)
 *  - @openzeppelin/contracts-upgradeable/...  → node_modules (upgradeable OZ v5)
 *  - block67/tokens/...                       → embedded library constants
 *  - block67/nft/...
 *  - block67/dao/...
 *  - block67/defi/...
 *  - block67/security/...
 *  - block67/payments/...
 *  - block67/marketplace/...
 *  - block67/infrastructure/...
 *  - block67/proxy/...                        → proxy wrappers (Transparent/UUPS/Beacon)
 *  - block67/upgradeable/tokens/...           → upgradeable token templates
 *  - block67/upgradeable/nft/...              → upgradeable NFT templates
 *  - block67/upgradeable/dao/...              → upgradeable DAO templates
 *  - block67/upgradeable/defi/...             → upgradeable DeFi templates
 */
import fs   from "fs";
import path from "path";
import { LIBRARY_VFS } from "./library/index";

// Resolve an import path to its file content (used as solc findImports callback)
export function findImports(importPath: string): { contents: string } | { error: string } {
  // 1. Check our embedded library first
  if (LIBRARY_VFS[importPath]) {
    return { contents: LIBRARY_VFS[importPath] };
  }

  // 2. Resolve @openzeppelin imports from node_modules
  if (importPath.startsWith("@openzeppelin/")) {
    const abs = path.join(process.cwd(), "node_modules", importPath);
    try {
      return { contents: fs.readFileSync(abs, "utf8") };
    } catch {
      return { error: `OpenZeppelin file not found: ${importPath}` };
    }
  }

  // 3. Unknown import
  return { error: `File not found in Block67 VFS: ${importPath}` };
}
