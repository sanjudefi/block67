// block67 — Built-in template registry
// Each template defines params, default config, prompts, and contract ABI

export type TemplateId =
  | "erc20-token"
  | "nft-collection"
  | "dao-governance"
  | "staking-dashboard"
  | "meme-token";

export interface TemplateParam {
  key: string;
  label: string;
  type: "text" | "number" | "address" | "boolean" | "color" | "select";
  required: boolean;
  defaultValue: string;
  placeholder?: string;
  description?: string;
  options?: string[]; // for select type
}

export interface BuiltinTemplate {
  id: TemplateId;
  name: string;
  category: "TOKEN" | "NFT" | "DAO" | "DEFI" | "LANDING_PAGE";
  tagline: string;
  description: string;
  icon: string;
  gradient: string;        // Tailwind gradient classes for card
  accentColor: string;     // hex for preview tinting
  params: TemplateParam[];
  defaultConfig: Record<string, string>;
  suggestedPrompts: string[];
  features: string[];
  chain: string;
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "erc20-token",
    name: "ERC-20 Token",
    category: "TOKEN",
    tagline: "Launch your own cryptocurrency",
    description:
      "Deploy a production-ready ERC-20 token with custom name, symbol, total supply, minting controls, and a beautiful landing page.",
    icon: "🪙",
    gradient: "from-indigo-500 to-purple-600",
    accentColor: "#6366f1",
    params: [
      { key: "tokenName",    label: "Token Name",       type: "text",   required: true,  defaultValue: "MyToken",         placeholder: "e.g. Ethereum" },
      { key: "symbol",       label: "Symbol",           type: "text",   required: true,  defaultValue: "MTK",             placeholder: "e.g. ETH" },
      { key: "totalSupply",  label: "Total Supply",     type: "number", required: true,  defaultValue: "1000000000",      placeholder: "1,000,000,000" },
      { key: "description",  label: "Token Description", type: "text",  required: false, defaultValue: "The next generation of decentralized finance.", placeholder: "Describe your token" },
      { key: "website",      label: "Website URL",      type: "text",   required: false, defaultValue: "",                placeholder: "https://yourtoken.com" },
      { key: "accentColor",  label: "Brand Color",      type: "color",  required: false, defaultValue: "#6366f1" },
      { key: "mintable",     label: "Mintable",         type: "boolean",required: false, defaultValue: "false" },
      { key: "burnable",     label: "Burnable",         type: "boolean",required: false, defaultValue: "false" },
    ],
    defaultConfig: {
      tokenName: "MyToken",
      symbol: "MTK",
      totalSupply: "1000000000",
      description: "The next generation of decentralized finance.",
      website: "",
      accentColor: "#6366f1",
      mintable: "false",
      burnable: "false",
    },
    suggestedPrompts: [
      "Make the token name 'CryptoGold' with symbol CGD and 500M supply",
      "Change brand color to orange and make it mintable",
      "Add a description about a gaming ecosystem",
      "Make it a deflationary token with burn on transfer",
    ],
    features: ["ERC-20 Standard", "Custom Supply", "Mint / Burn", "Transfer Events", "Free Subdomain"],
    chain: "Ethereum / Base / Polygon",
  },
  {
    id: "nft-collection",
    name: "NFT Collection",
    category: "NFT",
    tagline: "Launch an NFT collection with minting",
    description:
      "Deploy an ERC-721 NFT collection with whitelist minting, reveal mechanics, royalties, and a fully integrated mint page.",
    icon: "🖼️",
    gradient: "from-pink-500 to-rose-600",
    accentColor: "#ec4899",
    params: [
      { key: "collectionName", label: "Collection Name",  type: "text",   required: true,  defaultValue: "My NFT Collection", placeholder: "e.g. CryptoPunks" },
      { key: "symbol",         label: "Symbol",           type: "text",   required: true,  defaultValue: "MNFT",              placeholder: "e.g. PUNK" },
      { key: "description",    label: "Description",      type: "text",   required: false, defaultValue: "A unique collection of digital art on the blockchain.", placeholder: "Describe your collection" },
      { key: "maxSupply",      label: "Max Supply",       type: "number", required: true,  defaultValue: "10000",             placeholder: "10,000" },
      { key: "mintPrice",      label: "Mint Price (ETH)", type: "number", required: true,  defaultValue: "0.05",              placeholder: "0.05" },
      { key: "royaltyPct",     label: "Royalties (%)",    type: "number", required: false, defaultValue: "5",                 placeholder: "5" },
      { key: "accentColor",    label: "Brand Color",      type: "color",  required: false, defaultValue: "#ec4899" },
      { key: "revealable",     label: "Revealable",       type: "boolean",required: false, defaultValue: "true" },
    ],
    defaultConfig: {
      collectionName: "My NFT Collection",
      symbol: "MNFT",
      description: "A unique collection of digital art on the blockchain.",
      maxSupply: "10000",
      mintPrice: "0.05",
      royaltyPct: "5",
      accentColor: "#ec4899",
      revealable: "true",
    },
    suggestedPrompts: [
      "Change collection name to 'Space Apes' with max supply 5000",
      "Set mint price to 0.08 ETH and royalties to 7.5%",
      "Make it a free mint with 10,000 supply",
      "Add a description about pixel art characters",
    ],
    features: ["ERC-721A", "Whitelist Merkle", "Reveal Mechanic", "EIP-2981 Royalties", "Mint Page"],
    chain: "Ethereum / Base",
  },
  {
    id: "dao-governance",
    name: "DAO Governance",
    category: "DAO",
    tagline: "Build a decentralized autonomous organization",
    description:
      "Launch a full DAO with on-chain proposals, token-weighted voting, a treasury, and a governance dashboard.",
    icon: "🏛️",
    gradient: "from-emerald-500 to-teal-600",
    accentColor: "#10b981",
    params: [
      { key: "daoName",           label: "DAO Name",              type: "text",   required: true,  defaultValue: "My DAO",          placeholder: "e.g. BuilderDAO" },
      { key: "tokenName",         label: "Governance Token",      type: "text",   required: true,  defaultValue: "GOV",             placeholder: "e.g. COMP" },
      { key: "description",       label: "Mission Statement",     type: "text",   required: false, defaultValue: "A community-governed protocol for the future.", placeholder: "What is your DAO's mission?" },
      { key: "quorumPct",         label: "Quorum (%)",            type: "number", required: false, defaultValue: "4",               placeholder: "4" },
      { key: "votingPeriodDays",  label: "Voting Period (days)",  type: "number", required: false, defaultValue: "7",               placeholder: "7" },
      { key: "timelockDays",      label: "Timelock (days)",       type: "number", required: false, defaultValue: "2",               placeholder: "2" },
      { key: "accentColor",       label: "Brand Color",           type: "color",  required: false, defaultValue: "#10b981" },
    ],
    defaultConfig: {
      daoName: "My DAO",
      tokenName: "GOV",
      description: "A community-governed protocol for the future.",
      quorumPct: "4",
      votingPeriodDays: "7",
      timelockDays: "2",
      accentColor: "#10b981",
    },
    suggestedPrompts: [
      "Rename to 'BuilderDAO' with 5% quorum and 3-day voting",
      "Set voting period to 5 days and add a DeFi protocol mission",
      "Change color to purple and set governance token to BDAO",
      "Add a description about funding open-source development",
    ],
    features: ["On-chain Proposals", "Token Voting", "Timelock", "Treasury", "Governance Dashboard"],
    chain: "Ethereum / Polygon",
  },
  {
    id: "staking-dashboard",
    name: "Staking Dashboard",
    category: "DEFI",
    tagline: "Stake tokens and earn rewards",
    description:
      "Deploy a staking contract with configurable APY, lock periods, and a beautiful real-time dashboard showing positions and rewards.",
    icon: "⚡",
    gradient: "from-amber-500 to-orange-600",
    accentColor: "#f59e0b",
    params: [
      { key: "tokenName",    label: "Token Name",          type: "text",   required: true,  defaultValue: "MyToken",   placeholder: "e.g. USDC" },
      { key: "symbol",       label: "Symbol",              type: "text",   required: true,  defaultValue: "MTK",       placeholder: "e.g. USDC" },
      { key: "apy",          label: "Base APY (%)",        type: "number", required: true,  defaultValue: "12",        placeholder: "12" },
      { key: "lockPeriod",   label: "Lock Period (days)",  type: "number", required: false, defaultValue: "30",        placeholder: "30" },
      { key: "minStake",     label: "Min Stake",           type: "number", required: false, defaultValue: "100",       placeholder: "100" },
      { key: "description",  label: "Protocol Description",type: "text",   required: false, defaultValue: "Earn passive yield on your tokens.", placeholder: "Describe your protocol" },
      { key: "accentColor",  label: "Brand Color",         type: "color",  required: false, defaultValue: "#f59e0b" },
    ],
    defaultConfig: {
      tokenName: "MyToken",
      symbol: "MTK",
      apy: "12",
      lockPeriod: "30",
      minStake: "100",
      description: "Earn passive yield on your tokens.",
      accentColor: "#f59e0b",
    },
    suggestedPrompts: [
      "Set APY to 20% with a 60-day lock period",
      "Change token to USDC with 8% APY and no lock",
      "Make it a flexible staking with daily rewards",
      "Add a description about DeFi yield optimization",
    ],
    features: ["Fixed / Flexible APY", "Lock Periods", "Auto-Compound", "Reward Claims", "Live Dashboard"],
    chain: "Ethereum / Base / BSC",
  },
  {
    id: "meme-token",
    name: "Meme Token",
    category: "TOKEN",
    tagline: "Launch the next viral meme coin",
    description:
      "Deploy a meme token with anti-bot mechanics, liquidity lock, and a fun landing page with animated elements.",
    icon: "🚀",
    gradient: "from-yellow-400 to-orange-500",
    accentColor: "#eab308",
    params: [
      { key: "tokenName",    label: "Token Name",       type: "text",   required: true,  defaultValue: "DogeMoon",        placeholder: "e.g. PepeCoin" },
      { key: "symbol",       label: "Symbol",           type: "text",   required: true,  defaultValue: "DGMN",            placeholder: "e.g. PEPE" },
      { key: "totalSupply",  label: "Total Supply",     type: "number", required: true,  defaultValue: "420000000000000", placeholder: "420 Trillion" },
      { key: "description",  label: "Meme Vibe",        type: "text",   required: false, defaultValue: "Going to the moon 🚀 Community-driven. 100% SAFU.", placeholder: "What's the vibe?" },
      { key: "taxPct",       label: "Tax on Transfer (%)",type: "number",required: false, defaultValue: "2",              placeholder: "2" },
      { key: "accentColor",  label: "Brand Color",      type: "color",  required: false, defaultValue: "#eab308" },
      { key: "emoji",        label: "Token Emoji",      type: "text",   required: false, defaultValue: "🚀",              placeholder: "🌙" },
    ],
    defaultConfig: {
      tokenName: "DogeMoon",
      symbol: "DGMN",
      totalSupply: "420000000000000",
      description: "Going to the moon 🚀 Community-driven. 100% SAFU.",
      taxPct: "2",
      accentColor: "#eab308",
      emoji: "🚀",
    },
    suggestedPrompts: [
      "Make it PepeCoin with 1 quadrillion supply and green color",
      "Add 5% tax on buy/sell and an anti-whale mechanism",
      "Change vibe to 'WEN LAMBO 🏎️ diamond hands only'",
      "Make it a Shiba Inu inspired token called ShibaMars",
    ],
    features: ["Anti-Bot", "Tax Mechanism", "Liquidity Lock", "Renounced Owner", "Viral Landing Page"],
    chain: "Ethereum / BSC / Base",
  },
];

export function getTemplate(id: TemplateId): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultConfig(id: TemplateId): Record<string, string> {
  return getTemplate(id)?.defaultConfig ?? {};
}
