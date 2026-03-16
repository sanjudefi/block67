/**
 * Block67 Component Library — Virtual File System Index
 *
 * 50 production-ready Solidity modules across 8 categories.
 * Used by the VFS to resolve "block67/..." imports during compilation.
 *
 * Categories:
 *   tokens/        — 8 modules  (ERC-20 variants)
 *   nft/           — 8 modules  (ERC-721 / 1155 variants)
 *   dao/           — 6 modules  (governance, voting, treasury)
 *   defi/          — 8 modules  (staking, AMM, vesting, oracles)
 *   security/      — 5 modules  (access, multisig, pause, reentrancy)
 *   payments/      — 5 modules  (splitter, escrow, subscriptions)
 *   marketplace/   — 5 modules  (listing, auctions, offers, fees)
 *   infrastructure/— 5 modules  (factory, proxy, multisig wallet, events)
 *
 * Total: 50 modules
 */

import { TOKENS }         from "./tokens";
import { NFT }            from "./nft";
import { DAO }            from "./dao";
import { DEFI }           from "./defi";
import { SECURITY }       from "./security";
import { PAYMENTS }       from "./payments";
import { MARKETPLACE }    from "./marketplace";
import { INFRASTRUCTURE } from "./infrastructure";

export const LIBRARY_VFS: Record<string, string> = {
  ...TOKENS,
  ...NFT,
  ...DAO,
  ...DEFI,
  ...SECURITY,
  ...PAYMENTS,
  ...MARKETPLACE,
  ...INFRASTRUCTURE,
};

// ── AI Assembly Map ───────────────────────────────────────────────────────────
// Maps template categories to the library paths the AI should import.
// The AI uses this to assemble complete contract systems from modules.

export const AI_MODULE_MAP = {
  "erc20-token": {
    standard:    ["block67/tokens/ERC20Base.sol"],
    mintable:    ["block67/tokens/ERC20Mintable.sol"],
    burnable:    ["block67/tokens/ERC20BurnableToken.sol"],
    capped:      ["block67/tokens/ERC20CappedToken.sol"],
    governance:  ["block67/tokens/ERC20VotesToken.sol"],
    taxable:     ["block67/tokens/ERC20Taxable.sol"],
    vesting:     ["block67/tokens/ERC20Vesting.sol"],
    permit:      ["block67/tokens/ERC20PermitToken.sol"],
  },
  "nft-collection": {
    standard:    ["block67/nft/ERC721Base.sol"],
    mintable:    ["block67/nft/ERC721Mintable.sol"],
    enumerable:  ["block67/nft/ERC721Enumerable.sol"],
    uristorage:  ["block67/nft/ERC721URIStorage.sol"],
    royalty:     ["block67/nft/ERC721Royalty.sol"],
    soulbound:   ["block67/nft/ERC721Soulbound.sol"],
    multi:       ["block67/nft/ERC1155Base.sol"],
    airdrop:     ["block67/nft/NFTAirdrop.sol"],
  },
  "dao-governance": {
    token:       ["block67/dao/GovernanceToken.sol"],
    governor:    ["block67/dao/DAOGovernor.sol"],
    timelock:    ["block67/dao/DAOTimelockController.sol"],
    proposals:   ["block67/dao/ProposalManager.sol"],
    voting:      ["block67/dao/VotingPower.sol"],
    treasury:    ["block67/dao/DAOTreasury.sol"],
  },
  "staking-dashboard": {
    staking:     ["block67/defi/StakingPool.sol"],
    farm:        ["block67/defi/YieldFarm.sol"],
    vesting:     ["block67/defi/TokenVesting.sol"],
    locker:      ["block67/defi/TokenLocker.sol"],
    rewards:     ["block67/defi/RewardDistributor.sol"],
    fees:        ["block67/defi/FeeCollector.sol"],
  },
  "marketplace": {
    listing:     ["block67/marketplace/NFTMarketplace.sol"],
    auction:     ["block67/marketplace/AuctionHouse.sol"],
    bids:        ["block67/marketplace/BidManager.sol"],
    offers:      ["block67/marketplace/OfferManager.sol"],
    fees:        ["block67/marketplace/MarketplaceFees.sol"],
  },
} as const;

// ── Library Stats ─────────────────────────────────────────────────────────────
export const LIBRARY_STATS = {
  totalContracts: Object.keys(LIBRARY_VFS).length,
  categories: {
    tokens:         Object.keys(TOKENS).length,
    nft:            Object.keys(NFT).length,
    dao:            Object.keys(DAO).length,
    defi:           Object.keys(DEFI).length,
    security:       Object.keys(SECURITY).length,
    payments:       Object.keys(PAYMENTS).length,
    marketplace:    Object.keys(MARKETPLACE).length,
    infrastructure: Object.keys(INFRASTRUCTURE).length,
  },
};
