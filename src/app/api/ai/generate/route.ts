// POST /api/ai/generate
// Takes user prompt + current template config → returns updated config + explanation
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    // Demo mode — return smart mock responses
    return handleDemoMode(req);
  }

  const { prompt, templateId, config } = await req.json();
  if (!prompt || !templateId) {
    return NextResponse.json({ error: "prompt and templateId required" }, { status: 400 });
  }

  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Build param schema for Claude
  const paramSchema = template.params.map((p) => `  - ${p.key} (${p.type}): ${p.label}. Current: "${config[p.key] ?? p.defaultValue}"`).join("\n");

  const systemPrompt = `You are a blockchain app configuration assistant for block67.app.
You help users configure their blockchain application templates by updating config fields based on natural language prompts.

The user is working on a "${template.name}" template (${template.category}).
Template description: ${template.description}

Available configuration fields:
${paramSchema}

IMPORTANT RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation outside JSON
2. The JSON must have exactly two keys: "config" and "message"
3. "config" is an object with ONLY the fields that should be CHANGED (partial update)
4. "message" is a friendly 1-2 sentence explanation of what you changed
5. Keep field values as strings
6. For boolean fields use "true" or "false" as strings
7. For color fields use hex format like "#ff6b35"
8. Only update fields relevant to the user's request
9. Keep values sensible for a blockchain application`;

  const userMessage = `User prompt: "${prompt}"

Current config:
${JSON.stringify(config, null, 2)}

Update the config based on the user's request. Return JSON only.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    // Parse JSON response
    let parsed: { config: Record<string, string>; message: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return NextResponse.json({
      config: parsed.config ?? {},
      message: parsed.message ?? "Config updated.",
    });
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}

// ── Demo mode (no API key) ────────────────────────────────────────────────────

async function handleDemoMode(req: NextRequest) {
  const { prompt, templateId, config } = await req.json();

  // Simple keyword matching for demo
  const p = (prompt as string).toLowerCase();
  const updates: Record<string, string> = {};

  // Color keywords
  if (p.includes("purple") || p.includes("violet")) updates.accentColor = "#8b5cf6";
  else if (p.includes("blue") || p.includes("navy")) updates.accentColor = "#3b82f6";
  else if (p.includes("green") || p.includes("emerald")) updates.accentColor = "#10b981";
  else if (p.includes("orange") || p.includes("fire")) updates.accentColor = "#f97316";
  else if (p.includes("red")) updates.accentColor = "#ef4444";
  else if (p.includes("pink") || p.includes("rose")) updates.accentColor = "#ec4899";
  else if (p.includes("yellow") || p.includes("gold")) updates.accentColor = "#eab308";

  // Template-specific keywords
  if (templateId === "erc20-token" || templateId === "meme-token") {
    const nameMatch = p.match(/(?:name|call it|called|token)\s+['"]?([a-z]+(?:\s[a-z]+)?)/i);
    if (nameMatch) updates.tokenName = nameMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());

    const symMatch = p.match(/symbol\s+['"]?([a-z]{2,6})/i);
    if (symMatch) updates.symbol = symMatch[1].toUpperCase();

    const supplyMatch = p.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(billion|million|trillion|b|m|t)\b/i);
    if (supplyMatch) {
      const n = parseFloat(supplyMatch[1].replace(/,/g, ""));
      const unit = supplyMatch[2].toLowerCase();
      const multiplier = unit === "t" || unit === "trillion" ? 1e12
        : unit === "b" || unit === "billion" ? 1e9 : 1e6;
      updates.totalSupply = Math.round(n * multiplier).toString();
    }

    if (p.includes("mintable") || p.includes("mint")) updates.mintable = "true";
    if (p.includes("burnable") || p.includes("burn")) updates.burnable = "true";
  }

  if (templateId === "nft-collection") {
    const priceMatch = p.match(/(\d+(?:\.\d+)?)\s*eth/i);
    if (priceMatch) updates.mintPrice = priceMatch[1];

    const supplyMatch = p.match(/(\d+(?:,\d+)*)\s*(?:nft|supply|total)/i);
    if (supplyMatch) updates.maxSupply = supplyMatch[1].replace(/,/g, "");

    const royaltyMatch = p.match(/(\d+(?:\.\d+)?)\s*%\s*royalt/i);
    if (royaltyMatch) updates.royaltyPct = royaltyMatch[1];
  }

  if (templateId === "staking-dashboard") {
    const apyMatch = p.match(/(\d+(?:\.\d+)?)\s*%?\s*apy/i);
    if (apyMatch) updates.apy = apyMatch[1];

    const lockMatch = p.match(/(\d+)\s*(?:-\s*)?day/i);
    if (lockMatch) updates.lockPeriod = lockMatch[1];
  }

  if (templateId === "dao-governance") {
    const quorumMatch = p.match(/(\d+(?:\.\d+)?)\s*%?\s*quorum/i);
    if (quorumMatch) updates.quorumPct = quorumMatch[1];

    const periodMatch = p.match(/(\d+)\s*(?:-\s*)?day/i);
    if (periodMatch) updates.votingPeriodDays = periodMatch[1];
  }

  // Name extraction across templates
  const quotedName = p.match(/['"]([^'"]{2,30})['"]/);
  if (quotedName) {
    if (config.tokenName !== undefined) updates.tokenName = quotedName[1];
    if (config.collectionName !== undefined) updates.collectionName = quotedName[1];
    if (config.daoName !== undefined) updates.daoName = quotedName[1];
  }

  // Description
  const descMatch = p.match(/description\s+(?:to\s+)?['"]?(.{10,100})/i);
  if (descMatch) updates.description = descMatch[1].trim();

  const message = Object.keys(updates).length > 0
    ? `Updated ${Object.keys(updates).join(", ")} based on your request. The live preview has been updated.`
    : "I understood your request! To enable full AI generation, add your ANTHROPIC_API_KEY to the environment. For now, try specific keywords like colors (purple, orange), numbers, or put names in quotes.";

  return NextResponse.json({ config: updates, message });
}
