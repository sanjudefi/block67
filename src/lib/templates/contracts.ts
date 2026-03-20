// block67 — Contract architecture definitions per template
// Each template maps to a set of ContractNodes with modules inside

import type { TemplateId } from "./index";

export interface ContractModule {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  configKey?: string;   // links to a template config param
  icon: string;
  immutable?: boolean;  // core module — cannot be disabled
}

export interface ContractNode {
  id: string;
  name: string;
  standard: string;   // e.g. "ERC-20", "ERC-721A"
  color: string;      // hex accent
  modules: ContractModule[];
  connects: string[]; // ids of contracts this node points to
}

export interface TemplateArchitecture {
  contracts: ContractNode[];
}

export const CONTRACT_ARCHITECTURES: Record<TemplateId, TemplateArchitecture> = {
  "erc20-token": {
    contracts: [
      {
        id: "erc20",
        name: "ERC20Token",
        standard: "ERC-20",
        color: "#6366f1",
        connects: [],
        modules: [
          { id: "info",     name: "Token Info",  description: "Name, symbol and decimals",       defaultEnabled: true,  icon: "🪙", immutable: true },
          { id: "transfer", name: "Transfer",     description: "ERC-20 transfer & allowance",     defaultEnabled: true,  icon: "↔️", immutable: true },
          { id: "mint",     name: "Mintable",     description: "Owner can mint new tokens",       defaultEnabled: false, icon: "⚡", configKey: "mintable" },
          { id: "burn",     name: "Burnable",     description: "Holders can burn tokens",         defaultEnabled: false, icon: "🔥", configKey: "burnable" },
          { id: "ownable",  name: "Ownership",    description: "Ownable + renounce support",     defaultEnabled: true,  icon: "🔐", immutable: true },
          { id: "events",   name: "Events",       description: "Transfer & Approval events",      defaultEnabled: true,  icon: "📡", immutable: true },
          { id: "snapshot", name: "Snapshots",    description: "Balance snapshots for governance", defaultEnabled: false, icon: "📸" },
          { id: "permit",   name: "EIP-2612",     description: "Gasless approvals via signature", defaultEnabled: false, icon: "✍️" },
        ],
      },
    ],
  },

  "nft-collection": {
    contracts: [
      {
        id: "erc721",
        name: "ERC721Token",
        standard: "ERC-721A",
        color: "#ec4899",
        connects: ["mint_mgr"],
        modules: [
          { id: "metadata",  name: "Metadata",    description: "IPFS & on-chain metadata",        defaultEnabled: true,  icon: "📄", immutable: true },
          { id: "transfer",  name: "Transfer",    description: "Safe & batch transfers",           defaultEnabled: true,  icon: "↔️", immutable: true },
          { id: "approve",   name: "Approval",    description: "Operator approvals",              defaultEnabled: true,  icon: "✅", immutable: true },
          { id: "reveal",    name: "Reveal",      description: "Delayed reveal mechanic",         defaultEnabled: true,  icon: "👁️", configKey: "revealable" },
          { id: "soulbound", name: "Soulbound",   description: "Non-transferable tokens",         defaultEnabled: false, icon: "⛓️" },
          { id: "enumerable",name: "Enumerable",  description: "On-chain token enumeration",      defaultEnabled: false, icon: "🔢" },
        ],
      },
      {
        id: "mint_mgr",
        name: "MintManager",
        standard: "Custom",
        color: "#f97316",
        connects: ["royalty"],
        modules: [
          { id: "whitelist", name: "Whitelist",   description: "Merkle tree allowlist",           defaultEnabled: true,  icon: "📋" },
          { id: "price",     name: "Mint Price",  description: "Price per NFT in ETH",            defaultEnabled: true,  icon: "💰", immutable: true, configKey: "mintPrice" },
          { id: "supply",    name: "Max Supply",  description: "Total collection size",           defaultEnabled: true,  icon: "📊", immutable: true, configKey: "maxSupply" },
          { id: "public",    name: "Public Mint", description: "Open minting phase",              defaultEnabled: true,  icon: "🌍" },
          { id: "airdrop",   name: "Airdrop",     description: "Owner batch-mint to wallets",     defaultEnabled: false, icon: "🎁" },
          { id: "freemint",  name: "Free Mint",   description: "Zero-cost minting option",        defaultEnabled: false, icon: "🆓" },
        ],
      },
      {
        id: "royalty",
        name: "RoyaltyManager",
        standard: "EIP-2981",
        color: "#8b5cf6",
        connects: [],
        modules: [
          { id: "eip2981",   name: "EIP-2981",    description: "On-chain royalty standard",       defaultEnabled: true,  icon: "⚖️", immutable: true },
          { id: "pct",       name: "Royalty %",   description: "Percentage of each sale",         defaultEnabled: true,  icon: "💹", immutable: true, configKey: "royaltyPct" },
          { id: "recipient", name: "Recipient",   description: "Wallet receiving royalties",      defaultEnabled: true,  icon: "👛", immutable: true },
          { id: "split",     name: "Rev Split",   description: "Split royalties to team",         defaultEnabled: false, icon: "✂️" },
        ],
      },
    ],
  },

  "dao-governance": {
    contracts: [
      {
        id: "gov_token",
        name: "GovernanceToken",
        standard: "ERC-20Votes",
        color: "#10b981",
        connects: ["governor"],
        modules: [
          { id: "erc20votes", name: "ERC20Votes", description: "Voting power tracking",          defaultEnabled: true,  icon: "🗳️", immutable: true },
          { id: "delegate",   name: "Delegation", description: "Delegate voting power",          defaultEnabled: true,  icon: "👥", immutable: true },
          { id: "snapshot",   name: "Snapshots",  description: "Block-level vote snapshots",     defaultEnabled: true,  icon: "📸", immutable: true },
          { id: "flash",      name: "Flash Loan Guard", description: "Prevent flash loan attacks", defaultEnabled: false, icon: "🛡️" },
        ],
      },
      {
        id: "governor",
        name: "Governor",
        standard: "OZ Governor",
        color: "#3b82f6",
        connects: ["timelock"],
        modules: [
          { id: "proposals",  name: "Proposals",  description: "Create & manage proposals",      defaultEnabled: true,  icon: "📜", immutable: true },
          { id: "voting",     name: "Voting",     description: "Cast & tally votes",             defaultEnabled: true,  icon: "✅", immutable: true },
          { id: "quorum",     name: "Quorum",     description: "Minimum participation",          defaultEnabled: true,  icon: "⚖️", immutable: true, configKey: "quorumPct" },
          { id: "period",     name: "Vote Period",description: "Days for voting window",          defaultEnabled: true,  icon: "⏱️", immutable: true, configKey: "votingPeriodDays" },
          { id: "veto",       name: "Veto Power", description: "Guardian veto mechanism",        defaultEnabled: false, icon: "🛡️" },
          { id: "quadratic",  name: "Quadratic",  description: "Quadratic voting weights",       defaultEnabled: false, icon: "📐" },
        ],
      },
      {
        id: "timelock",
        name: "TimelockController",
        standard: "OZ Timelock",
        color: "#f59e0b",
        connects: ["treasury"],
        modules: [
          { id: "queue",    name: "Queue",        description: "Queue approved proposals",       defaultEnabled: true,  icon: "📥", immutable: true },
          { id: "execute",  name: "Execute",      description: "Execute after delay",            defaultEnabled: true,  icon: "⚡", immutable: true },
          { id: "delay",    name: "Delay",        description: "Timelock period in days",        defaultEnabled: true,  icon: "⏳", immutable: true, configKey: "timelockDays" },
          { id: "cancel",   name: "Cancel",       description: "Cancel queued operations",       defaultEnabled: true,  icon: "❌" },
        ],
      },
      {
        id: "treasury",
        name: "Treasury",
        standard: "Custom",
        color: "#6366f1",
        connects: [],
        modules: [
          { id: "eth",       name: "ETH Storage", description: "Hold and distribute ETH",       defaultEnabled: true,  icon: "Ξ" },
          { id: "erc20",     name: "Token Storage",description: "Hold ERC-20 tokens",           defaultEnabled: true,  icon: "🪙" },
          { id: "multisig",  name: "Multi-Sig",   description: "Require multiple signers",      defaultEnabled: false, icon: "🔒" },
          { id: "streaming", name: "Streaming",   description: "Stream payments over time",     defaultEnabled: false, icon: "🌊" },
        ],
      },
    ],
  },

  "staking-dashboard": {
    contracts: [
      {
        id: "staking_pool",
        name: "StakingPool",
        standard: "Custom",
        color: "#f59e0b",
        connects: ["reward_vault"],
        modules: [
          { id: "stake",     name: "Stake",       description: "Deposit tokens to earn",         defaultEnabled: true,  icon: "⬆️", immutable: true },
          { id: "unstake",   name: "Unstake",     description: "Withdraw with cooldown",         defaultEnabled: true,  icon: "⬇️", immutable: true },
          { id: "lock",      name: "Lock Period", description: "Minimum stake duration",         defaultEnabled: true,  icon: "🔒", configKey: "lockPeriod" },
          { id: "min_stake", name: "Min Stake",   description: "Minimum deposit amount",         defaultEnabled: true,  icon: "📊", configKey: "minStake" },
          { id: "emergency", name: "Emergency",   description: "Emergency withdraw bypass",      defaultEnabled: false, icon: "🚨" },
          { id: "whitelist", name: "Whitelist",   description: "Restrict who can stake",         defaultEnabled: false, icon: "📋" },
        ],
      },
      {
        id: "reward_vault",
        name: "RewardVault",
        standard: "Custom",
        color: "#10b981",
        connects: [],
        modules: [
          { id: "apy",       name: "APY Engine",  description: "Annual yield calculation",       defaultEnabled: true,  icon: "⚡", immutable: true, configKey: "apy" },
          { id: "distribute",name: "Distribute",  description: "Send rewards to stakers",        defaultEnabled: true,  icon: "📤", immutable: true },
          { id: "claim",     name: "Claim",       description: "Manual reward claims",           defaultEnabled: true,  icon: "💰", immutable: true },
          { id: "compound",  name: "Auto-Compound",description: "Reinvest rewards automatically", defaultEnabled: false, icon: "🔄" },
          { id: "boost",     name: "Boost Tiers", description: "Higher APY for bigger stakes",   defaultEnabled: false, icon: "🚀" },
          { id: "nft_boost", name: "NFT Boost",   description: "NFT holders earn bonus APY",     defaultEnabled: false, icon: "🖼️" },
        ],
      },
    ],
  },

  "meme-token": {
    contracts: [
      {
        id: "meme_token",
        name: "MemeToken",
        standard: "ERC-20",
        color: "#eab308",
        connects: ["tax_mgr"],
        modules: [
          { id: "info",     name: "Token Info",   description: "Name, symbol, total supply",      defaultEnabled: true,  icon: "🚀", immutable: true },
          { id: "antibot",  name: "Anti-Bot",     description: "Block bots at launch",            defaultEnabled: true,  icon: "🛡️" },
          { id: "whale",    name: "Anti-Whale",   description: "Max wallet percentage limit",     defaultEnabled: false, icon: "🐋" },
          { id: "blacklist",name: "Blacklist",    description: "Block malicious wallets",         defaultEnabled: false, icon: "🚫" },
          { id: "hook",     name: "Transfer Hook",description: "Tax deducted on every transfer",  defaultEnabled: true,  icon: "⚡", immutable: true },
        ],
      },
      {
        id: "tax_mgr",
        name: "TaxManager",
        standard: "Custom",
        color: "#f97316",
        connects: ["liq_mgr"],
        modules: [
          { id: "buy_tax",  name: "Buy Tax",      description: "% deducted on buys",             defaultEnabled: true,  icon: "📈", configKey: "taxPct" },
          { id: "sell_tax", name: "Sell Tax",     description: "% deducted on sells",            defaultEnabled: true,  icon: "📉", configKey: "taxPct" },
          { id: "distribute",name:"Distribution", description: "Split tax to holders & LP",      defaultEnabled: true,  icon: "💸" },
          { id: "reflections",name:"Reflections", description: "Passive rewards for all holders", defaultEnabled: false, icon: "✨" },
        ],
      },
      {
        id: "liq_mgr",
        name: "LiquidityManager",
        standard: "Custom",
        color: "#8b5cf6",
        connects: [],
        modules: [
          { id: "lp_lock",  name: "LP Lock",      description: "Lock liquidity for 2 years",     defaultEnabled: true,  icon: "🔒", immutable: true },
          { id: "renounce", name: "Renounce",     description: "Renounce ownership on launch",   defaultEnabled: false, icon: "🔓" },
          { id: "auto_liq", name: "Auto-Liquidity",description: "Auto-add to LP on sell",        defaultEnabled: false, icon: "💧" },
          { id: "buyback",  name: "Buyback",      description: "Auto buyback & burn tokens",     defaultEnabled: false, icon: "🔥" },
        ],
      },
    ],
  },

  // ── New viral templates ──────────────────────────────────────────────────────

  "pump-token": {
    contracts: [
      {
        id: "pump",
        name: "PumpToken",
        standard: "Custom",
        color: "#22c55e",
        connects: ["curve"],
        modules: [
          { id: "erc20",    name: "ERC-20 Base",   description: "Name, symbol, balances",           defaultEnabled: true,  icon: "🪙", immutable: true },
          { id: "buy",      name: "Buy()",          description: "Buy tokens by sending ETH",        defaultEnabled: true,  icon: "📈", immutable: true },
          { id: "sell",     name: "Sell()",         description: "Sell tokens back for ETH",         defaultEnabled: true,  icon: "📉", immutable: true },
          { id: "events",   name: "Price Events",   description: "Emit price on every trade",        defaultEnabled: true,  icon: "📡", immutable: true },
        ],
      },
      {
        id: "curve",
        name: "BondingCurve",
        standard: "Custom",
        color: "#10b981",
        connects: [],
        modules: [
          { id: "linear",   name: "Linear Curve",  description: "Price rises linearly with supply", defaultEnabled: true,  icon: "📊", immutable: true },
          { id: "slippage", name: "Slippage Guard", description: "Max 5% slippage per trade",        defaultEnabled: true,  icon: "🛡️" },
          { id: "maxbuy",   name: "Max Buy",        description: "Cap single purchase size",         defaultEnabled: false, icon: "🐋" },
        ],
      },
    ],
  },

  "nft-mint": {
    contracts: [
      {
        id: "open_edition",
        name: "OpenEditionNFT",
        standard: "ERC-721",
        color: "#8b5cf6",
        connects: [],
        modules: [
          { id: "metadata", name: "Metadata",      description: "Name, symbol, base URI",           defaultEnabled: true,  icon: "📄", immutable: true },
          { id: "mint",     name: "Public Mint",   description: "Anyone can mint for ETH",          defaultEnabled: true,  icon: "🎨", immutable: true, configKey: "mintPrice" },
          { id: "supply",   name: "Max Supply",    description: "Hard cap on total minted",         defaultEnabled: true,  icon: "📊", immutable: true, configKey: "maxSupply" },
          { id: "withdraw", name: "Withdraw",      description: "Owner withdraws mint proceeds",    defaultEnabled: true,  icon: "💰", immutable: true },
          { id: "pause",    name: "Pause/Resume",  description: "Owner can pause minting",          defaultEnabled: true,  icon: "⏸️" },
          { id: "batch",    name: "Batch Mint",    description: "Mint up to 10 at once",            defaultEnabled: true,  icon: "⚡" },
        ],
      },
    ],
  },

  "token-gated": {
    contracts: [
      {
        id: "gate",
        name: "TokenGatedAccess",
        standard: "Custom",
        color: "#6366f1",
        connects: [],
        modules: [
          { id: "verify",   name: "Balance Check", description: "Check token balance on-chain",    defaultEnabled: true,  icon: "✅", immutable: true, configKey: "minBalance" },
          { id: "erc20gate",name: "ERC-20 Gate",   description: "Gate using any ERC-20 token",     defaultEnabled: true,  icon: "🪙" },
          { id: "nftgate",  name: "NFT Gate",      description: "Gate using ERC-721 ownership",    defaultEnabled: false, icon: "🖼️" },
          { id: "events",   name: "Access Events", description: "Emit granted/denied on-chain",    defaultEnabled: true,  icon: "📡", immutable: true },
          { id: "update",   name: "Update Config", description: "Owner can change gate settings",  defaultEnabled: true,  icon: "⚙️" },
        ],
      },
    ],
  },

  "click-to-earn": {
    contracts: [
      {
        id: "game",
        name: "ClickToEarn",
        standard: "Custom",
        color: "#06b6d4",
        connects: ["rewards"],
        modules: [
          { id: "click",    name: "Click()",       description: "Record click and add reward",      defaultEnabled: true,  icon: "👆", immutable: true },
          { id: "cooldown", name: "Cooldown",      description: "Seconds between clicks",           defaultEnabled: true,  icon: "⏱️", configKey: "cooldown" },
          { id: "daily",    name: "Daily Limit",   description: "Max ETH claimable per day",        defaultEnabled: true,  icon: "📅", configKey: "dailyLimit" },
          { id: "claim",    name: "Claim()",       description: "Withdraw earned ETH",              defaultEnabled: true,  icon: "💸", immutable: true },
        ],
      },
      {
        id: "rewards",
        name: "RewardPool",
        standard: "Custom",
        color: "#0891b2",
        connects: [],
        modules: [
          { id: "deposit",  name: "Deposit",       description: "Owner funds the reward pool",      defaultEnabled: true,  icon: "🏦", immutable: true },
          { id: "leaderboard",name:"Leaderboard",  description: "Track top clickers on-chain",      defaultEnabled: false, icon: "🏆" },
          { id: "referral", name: "Referral",      description: "Earn extra for referrals",         defaultEnabled: false, icon: "👥" },
        ],
      },
    ],
  },
  "airdrop-campaign": {
    contracts: [
      { id: "token", name: "AirdropToken", standard: "ERC-20", color: "#8b5cf6", connects: [], modules: [
        { id: "airdrop", name: "Airdrop()", description: "Batch airdrop to wallets", defaultEnabled: true, icon: "🪂", immutable: true },
        { id: "claim",   name: "Claim()",   description: "Self-claim airdrop",       defaultEnabled: true, icon: "🎁", immutable: true },
      ]},
    ],
  },
  "token-presale": {
    contracts: [
      { id: "presale", name: "TokenPresale", standard: "Custom", color: "#f59e0b", connects: [], modules: [
        { id: "buy",      name: "Buy()",      description: "Purchase tokens with ETH", defaultEnabled: true, icon: "💰", immutable: true },
        { id: "withdraw", name: "Withdraw()", description: "Owner withdraw raised ETH", defaultEnabled: true, icon: "🏦", immutable: true },
      ]},
    ],
  },
  "token-faucet": {
    contracts: [
      { id: "faucet", name: "TokenFaucet", standard: "Custom", color: "#06b6d4", connects: [], modules: [
        { id: "drip",    name: "Drip()",    description: "Claim tokens from faucet", defaultEnabled: true, icon: "🚰", immutable: true },
        { id: "refill",  name: "Refill()",  description: "Owner refill faucet",      defaultEnabled: true, icon: "🪣", immutable: true },
      ]},
    ],
  },
  "referral-rewards": {
    contracts: [
      { id: "referral", name: "ReferralRewards", standard: "Custom", color: "#10b981", connects: [], modules: [
        { id: "register", name: "Register()", description: "Register referral code",    defaultEnabled: true, icon: "🔗", immutable: true },
        { id: "claim",    name: "Claim()",    description: "Claim referral earnings",   defaultEnabled: true, icon: "💸", immutable: true },
      ]},
    ],
  },
  "reward-game": {
    contracts: [
      { id: "game", name: "RewardGame", standard: "Custom", color: "#f43f5e", connects: [], modules: [
        { id: "play",  name: "Play()",  description: "Submit game action",    defaultEnabled: true, icon: "🎮", immutable: true },
        { id: "claim", name: "Claim()", description: "Claim game rewards",    defaultEnabled: true, icon: "🏆", immutable: true },
      ]},
    ],
  },
};

export function getArchitecture(id: TemplateId): TemplateArchitecture | undefined {
  return CONTRACT_ARCHITECTURES[id];
}
