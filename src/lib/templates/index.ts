// block67 — Built-in template registry
// Each template defines params, default config, prompts, and contract ABI

export type TemplateId =
  | "erc20-token"
  | "nft-collection"
  | "dao-governance"
  | "staking-dashboard"
  | "meme-token"
  | "pump-token"
  | "nft-mint"
  | "token-gated"
  | "click-to-earn"
  | "airdrop-campaign"
  | "token-presale"
  | "token-faucet"
  | "referral-rewards"
  | "reward-game";

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
  category: "TOKEN" | "NFT" | "DAO" | "DEFI" | "LANDING_PAGE" | "OTHER";
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
      { key: "theme",        label: "Theme",            type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
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
      theme: "dark",
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
      { key: "theme",          label: "Theme",            type: "select", required: false, defaultValue: "light", options: ["light", "dark"] },
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
      theme: "light",
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
      { key: "theme",             label: "Theme",                 type: "select", required: false, defaultValue: "light", options: ["light", "dark"] },
    ],
    defaultConfig: {
      daoName: "My DAO",
      tokenName: "GOV",
      description: "A community-governed protocol for the future.",
      quorumPct: "4",
      votingPeriodDays: "7",
      timelockDays: "2",
      accentColor: "#10b981",
      theme: "light",
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
      { key: "theme",        label: "Theme",               type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
    ],
    defaultConfig: {
      tokenName: "MyToken",
      symbol: "MTK",
      apy: "12",
      lockPeriod: "30",
      minStake: "100",
      description: "Earn passive yield on your tokens.",
      accentColor: "#f59e0b",
      theme: "dark",
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
      { key: "theme",        label: "Theme",            type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
    ],
    defaultConfig: {
      tokenName: "DogeMoon",
      symbol: "DGMN",
      totalSupply: "420000000000000",
      description: "Going to the moon 🚀 Community-driven. 100% SAFU.",
      taxPct: "2",
      accentColor: "#eab308",
      emoji: "🚀",
      theme: "dark",
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
  // ── New viral templates ────────────────────────────────────────────────────
  {
    id: "pump-token",
    name: "Pump Token",
    category: "TOKEN",
    tagline: "Bonding curve token that pumps with every buy",
    description:
      "Deploy a viral bonding-curve token where price automatically rises with each purchase. Built-in buy/sell UI with live price chart.",
    icon: "📈",
    gradient: "from-green-500 to-emerald-600",
    accentColor: "#22c55e",
    params: [
      { key: "tokenName",    label: "Token Name",        type: "text",   required: true,  defaultValue: "PumpToken",   placeholder: "e.g. MoonPump" },
      { key: "symbol",       label: "Symbol",            type: "text",   required: true,  defaultValue: "PUMP",        placeholder: "e.g. PUMP" },
      { key: "initialPrice", label: "Initial Price (ETH)", type: "number", required: true, defaultValue: "0.000001",   placeholder: "0.000001" },
      { key: "description",  label: "Description",       type: "text",   required: false, defaultValue: "Price goes up with every buy. Be early. Pump it.", placeholder: "Describe your token" },
      { key: "accentColor",  label: "Brand Color",       type: "color",  required: false, defaultValue: "#22c55e" },
      { key: "emoji",        label: "Token Emoji",       type: "text",   required: false, defaultValue: "📈",           placeholder: "🚀" },
      { key: "theme",        label: "Theme",             type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
    ],
    defaultConfig: {
      tokenName: "PumpToken",
      symbol: "PUMP",
      initialPrice: "0.000001",
      description: "Price goes up with every buy. Be early. Pump it.",
      accentColor: "#22c55e",
      emoji: "📈",
      theme: "dark",
    },
    suggestedPrompts: [
      "Change name to MoonPump with symbol MOON",
      "Lower initial price to 0.0000001 ETH for max virality",
      "Add a description about community-driven price discovery",
      "Change brand color to green and add rocket emoji",
    ],
    features: ["Bonding Curve", "Auto Price Rise", "Buy / Sell UI", "Live Price Feed", "Viral Share Page"],
    chain: "Ethereum / Base / BSC",
  },
  {
    id: "nft-mint",
    name: "NFT Mint Page",
    category: "NFT",
    tagline: "Simple open-edition NFT with one-click mint",
    description:
      "Deploy a clean open-edition NFT mint page. No whitelist complexity — just a big mint button, supply counter, and shareable link.",
    icon: "🎨",
    gradient: "from-violet-500 to-purple-600",
    accentColor: "#8b5cf6",
    params: [
      { key: "collectionName", label: "Collection Name",   type: "text",   required: true,  defaultValue: "My NFT Drop", placeholder: "e.g. Pixel Pals" },
      { key: "symbol",         label: "Symbol",            type: "text",   required: true,  defaultValue: "MNFT",        placeholder: "e.g. PPALS" },
      { key: "maxSupply",      label: "Max Supply",        type: "number", required: true,  defaultValue: "1000",        placeholder: "1,000" },
      { key: "mintPrice",      label: "Mint Price (ETH)",  type: "number", required: true,  defaultValue: "0.01",        placeholder: "0.01" },
      { key: "description",    label: "Description",       type: "text",   required: false, defaultValue: "A limited NFT drop. Mint yours before they're gone.", placeholder: "Describe your drop" },
      { key: "accentColor",    label: "Brand Color",       type: "color",  required: false, defaultValue: "#8b5cf6" },
      { key: "theme",          label: "Theme",             type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
    ],
    defaultConfig: {
      collectionName: "My NFT Drop",
      symbol: "MNFT",
      maxSupply: "1000",
      mintPrice: "0.01",
      description: "A limited NFT drop. Mint yours before they're gone.",
      accentColor: "#8b5cf6",
      theme: "dark",
    },
    suggestedPrompts: [
      "Make it a free mint with 5000 supply",
      "Change name to Pixel Pals with 0.005 ETH mint price",
      "Set max supply to 10000 and price to 0.08 ETH",
      "Add a description about generative art characters",
    ],
    features: ["ERC-721", "Public Mint", "Supply Counter", "Mint UI", "Shareable Link"],
    chain: "Ethereum / Base",
  },
  {
    id: "token-gated",
    name: "Token-Gated Access",
    category: "LANDING_PAGE",
    tagline: "Exclusive content unlocked by token ownership",
    description:
      "Create a token-gated page that verifies wallet ownership and reveals exclusive content — Discord links, alpha, downloads — to token holders only.",
    icon: "🔐",
    gradient: "from-slate-600 to-gray-700",
    accentColor: "#6366f1",
    params: [
      { key: "contentTitle",  label: "Page Title",          type: "text",    required: true,  defaultValue: "Members Only", placeholder: "e.g. Alpha Access" },
      { key: "tokenAddress",  label: "Token Contract Addr", type: "address", required: true,  defaultValue: "",              placeholder: "0x..." },
      { key: "minBalance",    label: "Min Token Balance",   type: "number",  required: true,  defaultValue: "1",             placeholder: "1" },
      { key: "accessUrl",     label: "Unlock URL / Content",type: "text",    required: true,  defaultValue: "",              placeholder: "https://discord.gg/..." },
      { key: "description",   label: "Teaser Text",         type: "text",    required: false, defaultValue: "Hold the token to unlock exclusive access.", placeholder: "What's behind the gate?" },
      { key: "accentColor",   label: "Brand Color",         type: "color",   required: false, defaultValue: "#6366f1" },
      { key: "theme",         label: "Theme",               type: "select",  required: false, defaultValue: "dark", options: ["dark", "light"] },
    ],
    defaultConfig: {
      contentTitle: "Members Only",
      tokenAddress: "",
      minBalance: "1",
      accessUrl: "",
      description: "Hold the token to unlock exclusive access.",
      accentColor: "#6366f1",
      theme: "dark",
    },
    suggestedPrompts: [
      "Change title to 'Alpha Holders Lounge'",
      "Set minimum balance to 100 tokens",
      "Add description about exclusive trading signals",
      "Change accent color to gold for premium feel",
    ],
    features: ["Wallet Verify", "Token Balance Check", "Reveal on Unlock", "Any ERC-20 / ERC-721", "Shareable Link"],
    chain: "Ethereum / Base / Polygon",
  },
  {
    id: "click-to-earn",
    name: "Click-to-Earn Game",
    category: "OTHER",
    tagline: "Tap to earn ETH rewards — viral onchain game",
    description:
      "Launch an addictive click-to-earn game where users tap a button to earn ETH rewards. Built-in cooldown, daily limit, and leaderboard.",
    icon: "🎮",
    gradient: "from-cyan-500 to-blue-600",
    accentColor: "#06b6d4",
    params: [
      { key: "gameName",       label: "Game Name",           type: "text",   required: true,  defaultValue: "TapToEarn",  placeholder: "e.g. CryptoClicker" },
      { key: "rewardPerClick", label: "Reward per Click (ETH)", type: "number", required: true, defaultValue: "0.0001",  placeholder: "0.0001" },
      { key: "dailyLimit",     label: "Daily Limit (ETH)",   type: "number", required: true,  defaultValue: "0.01",       placeholder: "0.01" },
      { key: "cooldown",       label: "Cooldown (seconds)",  type: "number", required: false, defaultValue: "3",          placeholder: "3" },
      { key: "description",    label: "Game Description",    type: "text",   required: false, defaultValue: "Tap the button. Earn ETH. Simple as that.", placeholder: "Describe your game" },
      { key: "accentColor",    label: "Brand Color",         type: "color",  required: false, defaultValue: "#06b6d4" },
      { key: "emoji",          label: "Tap Emoji",           type: "text",   required: false, defaultValue: "👆",          placeholder: "🎯" },
      { key: "theme",          label: "Theme",               type: "select", required: false, defaultValue: "dark",  options: ["dark", "light"] },
    ],
    defaultConfig: {
      gameName: "TapToEarn",
      rewardPerClick: "0.0001",
      dailyLimit: "0.01",
      cooldown: "3",
      description: "Tap the button. Earn ETH. Simple as that.",
      accentColor: "#06b6d4",
      emoji: "👆",
      theme: "dark",
    },
    suggestedPrompts: [
      "Rename to CryptoClicker with higher rewards",
      "Set cooldown to 10 seconds and daily limit to 0.05 ETH",
      "Add description about competitive daily leaderboard",
      "Change theme to a neon gaming aesthetic",
    ],
    features: ["Click-to-Earn", "ETH Rewards", "Cooldown Logic", "Daily Limit", "Live Leaderboard"],
    chain: "Ethereum / Base",
  },
];

export function getTemplate(id: TemplateId): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultConfig(id: TemplateId): Record<string, string> {
  return getTemplate(id)?.defaultConfig ?? {};
}
