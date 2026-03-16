// POST /api/compile
// Compiles Solidity source using solc-js and returns ABI + Bytecode + Errors
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// solc is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc = require("solc");

interface SolcError {
  severity: "error" | "warning" | "info";
  formattedMessage: string;
  message: string;
  sourceLocation?: { file: string; start: number; end: number };
}

interface SolcContract {
  abi: unknown[];
  evm: {
    bytecode: { object: string; linkReferences?: Record<string, unknown> };
    deployedBytecode: { object: string };
  };
}

interface SolcOutput {
  errors?: SolcError[];
  contracts?: Record<string, Record<string, SolcContract>>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source: string = body.source;
    const filename: string = body.filename ?? "Contract.sol";

    if (!source || typeof source !== "string") {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    // Standard JSON input for solc
    const input = {
      language: "Solidity",
      sources: {
        [filename]: { content: source },
      },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
          },
        },
      },
    };

    const rawOutput: string = solc.compile(JSON.stringify(input));
    const output: SolcOutput = JSON.parse(rawOutput);

    const errors   = (output.errors ?? []).filter((e) => e.severity === "error");
    const warnings = (output.errors ?? []).filter((e) => e.severity === "warning");

    // Build formatted error/warning messages
    const errorMsgs   = errors.map((e) => e.formattedMessage ?? e.message);
    const warningMsgs = warnings.map((e) => e.formattedMessage ?? e.message);

    if (errors.length > 0 && !output.contracts) {
      return NextResponse.json({
        success: false,
        errors: errorMsgs,
        warnings: warningMsgs,
        solcVersion: solc.version() as string,
      });
    }

    // Extract contracts: { ContractName: { abi, bytecode } }
    const contracts: Record<string, { abi: unknown[]; bytecode: string; deployedBytecode: string }> = {};

    for (const [, fileContracts] of Object.entries(output.contracts ?? {})) {
      for (const [name, contract] of Object.entries(fileContracts)) {
        contracts[name] = {
          abi:               contract.abi,
          bytecode:          "0x" + contract.evm.bytecode.object,
          deployedBytecode:  "0x" + contract.evm.deployedBytecode.object,
        };
      }
    }

    return NextResponse.json({
      success:    true,
      contracts,
      errors:     errorMsgs,   // non-fatal errors still shown
      warnings:   warningMsgs,
      solcVersion: solc.version() as string,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
