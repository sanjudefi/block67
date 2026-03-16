/**
 * Generates a unique, memorable project name like "violet-phoenix-dao"
 * Uses a color + animal/creature + project-type suffix pattern.
 */

const COLORS = [
  "amber", "azure", "cobalt", "coral", "crimson", "emerald",
  "golden", "indigo", "jade", "magenta", "obsidian", "onyx",
  "opal", "pearl", "ruby", "sapphire", "scarlet", "silver",
  "teal", "turquoise", "violet", "zinc",
];

const CREATURES = [
  "bear", "cobra", "condor", "crane", "dragon", "eagle",
  "falcon", "fox", "hawk", "jaguar", "kestrel", "lynx",
  "manta", "narwhal", "orca", "panther", "phoenix", "raven",
  "shark", "tiger", "viper", "wolf",
];

/** Suffix appended per template to give the name context. */
const TEMPLATE_SUFFIX: Record<string, string> = {
  "erc20-token":       "token",
  "meme-token":        "coin",
  "nft-collection":    "nft",
  "dao-governance":    "dao",
  "staking-dashboard": "vault",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a creative project name.
 * @param templateId - The template being used (drives the suffix).
 * @returns e.g. "violet-phoenix-dao"
 */
export function generateProjectName(templateId: string): string {
  const color    = pick(COLORS);
  const creature = pick(CREATURES);
  const suffix   = TEMPLATE_SUFFIX[templateId] ?? "project";
  return `${color}-${creature}-${suffix}`;
}
