// POST /api/compile
// Real Solidity compiler using solc-js + Block67 Virtual File System
// Resolves @openzeppelin and block67 library imports automatically
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { findImports } from "@/lib/contracts/vfs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc = require("solc");

interface SolcError {
  severity: "error" | "warning" | "info";
  formattedMessage: string;
  message: string;
}

interface SolcContract {
  abi: unknown[];
  evm: {
    bytecode:          { object: string };
    deployedBytecode:  { object: string };
  };
}

interface SolcOutput {
  errors?:    SolcError[];
  contracts?: Record<string, Record<string, SolcContract>>;
}

export async function POST(req: NextRequest) {
  try {
    const body                       = await req.json();
    const source:   string           = body.source;
    const filename: string           = body.filename ?? "Contract.sol";

    if (!source || typeof source !== "string") {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    const input = {
      language: "Solidity",
      sources:  { [filename]: { content: source } },
      settings: {
        optimizer:       { enabled: true, runs: 200 },
        outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] } },
      },
    };

    // Compile with VFS — resolves ALL @openzeppelin + block67 imports
    const rawOutput: string  = solc.compile(JSON.stringify(input), { import: findImports });
    const output:    SolcOutput = JSON.parse(rawOutput);

    const errors   = (output.errors ?? []).filter((e) => e.severity === "error");
    const warnings = (output.errors ?? []).filter((e) => e.severity === "warning");
    const errorMsgs   = errors.map((e) => e.formattedMessage ?? e.message);
    const warningMsgs = warnings.map((e) => e.formattedMessage ?? e.message);

    if (errors.length > 0 && !output.contracts) {
      return NextResponse.json({
        success:    false,
        errors:     errorMsgs,
        warnings:   warningMsgs,
        solcVersion: solc.version() as string,
      });
    }

    // Collect all compiled contracts
    const contracts: Record<string, { abi: unknown[]; bytecode: string; deployedBytecode: string }> = {};
    for (const [, fileContracts] of Object.entries(output.contracts ?? {})) {
      for (const [name, contract] of Object.entries(fileContracts)) {
        contracts[name] = {
          abi:              contract.abi,
          bytecode:         "0x" + contract.evm.bytecode.object,
          deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
        };
      }
    }

    return NextResponse.json({
      success:     true,
      contracts,
      errors:      errorMsgs,
      warnings:    warningMsgs,
      solcVersion: solc.version() as string,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
