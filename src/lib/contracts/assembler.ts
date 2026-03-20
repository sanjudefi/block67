/**
 * Block67 Smart Contract Assembler
 *
 * Strategy for how the AI dynamically assembles contracts from the
 * component library so that compilation ALWAYS succeeds.
 *
 * Flow:
 *   1. User describes intent via AI chat
 *   2. AI identifies required modules from AI_MODULE_MAP
 *   3. Assembler generates a Solidity file that imports + inherits the modules
 *   4. VFS resolves all imports (block67/* + @openzeppelin/*)
 *   5. /api/compile returns ABI + Bytecode — zero import errors
 *   6. Deploy tab deploys using ethers.js
 */

import { LIBRARY_VFS, AI_MODULE_MAP } from "./library/index";
import type { TemplateId }            from "@/lib/templates/index";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProxyPattern = "uups" | "transparent" | "beacon";

export interface AssemblySpec {
  templateId:   TemplateId;
  modules:      string[];          // keys from AI_MODULE_MAP[templateId]
  config:       Record<string, string>;
  version?:     string;
  upgradeable?: boolean;           // true → emit upgradeable + proxy wrapper
  proxyPattern?: ProxyPattern;     // default "uups" when upgradeable=true
}

export interface AssembledContract {
  source:    string;
  filename:  string;
  imports:   string[];            // library paths used
  baseContracts: string[];        // Solidity contract names inherited
}

// ── Per-template assemblers ───────────────────────────────────────────────────

function assembleERC20(spec: AssemblySpec): AssembledContract {
  const c       = spec.config;
  const name    = (c.tokenName    || "MyToken").replace(/\s+/g, "");
  const sym     = c.symbol        || "MTK";
  const supply  = c.totalSupply   || "1000000";
  const ver     = spec.version    || "0.8.20";

  const mintable   = spec.modules.includes("mintable")   || c.mintable === "true";
  const burnable   = spec.modules.includes("burnable")   || c.burnable === "true";
  const taxable    = spec.modules.includes("taxable");
  const votes      = spec.modules.includes("governance");
  const pausable   = spec.modules.includes("pausable");
  const hasBlacklist = spec.modules.includes("blacklist");
  const antiwhale  = spec.modules.includes("antiwhale");

  // Unified exclusion mapping — used by both tax and antiwhale
  const hasExcluded = taxable || antiwhale;

  const imports: string[] = [];
  const inherits: string[] = ["ERC20", "Ownable"];

  let importBlock = `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";\nimport "@openzeppelin/contracts/access/Ownable.sol";`;

  if (burnable) {
    importBlock += `\nimport "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";`;
    inherits.push("ERC20Burnable");
    imports.push("block67/tokens/ERC20BurnableToken.sol");
  }
  if (pausable) {
    importBlock += `\nimport "@openzeppelin/contracts/utils/Pausable.sol";`;
    inherits.push("Pausable");
  }
  if (votes) {
    importBlock += `\nimport "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";\nimport "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";`;
    inherits.push("ERC20Permit", "ERC20Votes");
    imports.push("block67/tokens/ERC20VotesToken.sol");
  }

  // ── Storage variables ──────────────────────────────────────────────────────
  let storageBlock = "";

  if (taxable) {
    storageBlock += `
    uint256 public taxBps = ${Number(c.taxPct || 2) * 100};
    address public treasury;`;
  }
  if (hasExcluded) {
    storageBlock += `
    mapping(address => bool) public isExcluded;`;
  }
  if (hasBlacklist) {
    storageBlock += `
    mapping(address => bool) public blacklisted;`;
  }
  if (antiwhale) {
    storageBlock += `
    uint256 public maxTxAmount = ${supply} * 10 ** 18 * 2 / 100; // 2% of initial supply`;
  }

  // ── _update override ───────────────────────────────────────────────────────
  const needsUpdate = pausable || hasBlacklist || antiwhale || taxable || votes;
  const overrideList = votes ? "override(ERC20, ERC20Votes)" : "override";

  let updateBody = "";
  if (pausable)     updateBody += `\n        require(!paused(), "Token: transfers paused");`;
  if (hasBlacklist) updateBody += `\n        require(!blacklisted[from] && !blacklisted[to], "Address is blacklisted");`;
  if (antiwhale)    updateBody += `\n        if (from != address(0) && to != address(0)) {\n            require(isExcluded[from] || amount <= maxTxAmount, "Exceeds max tx amount");\n        }`;
  if (taxable) {
    updateBody += `\n        if (!isExcluded[from] && !isExcluded[to] && taxBps > 0 && from != address(0)) {\n            uint256 tax = (amount * taxBps) / 10_000;\n            super._update(from, treasury, tax);\n            super._update(from, to, amount - tax);\n        } else {\n            super._update(from, to, amount);\n        }`;
  } else {
    updateBody += `\n        super._update(from, to, amount);`;
  }

  const updateFn = needsUpdate ? `
    function _update(address from, address to, uint256 amount) internal ${overrideList} {${updateBody}
    }` : "";

  const noncesOverride = votes ? `
    function nonces(address owner_)
        public view override(ERC20Permit, Nonces) returns (uint256)
    { return super.nonces(owner_); }` : "";

  // ── Owner functions ────────────────────────────────────────────────────────
  let ownerFns = "";

  if (mintable) ownerFns += `
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }`;

  if (pausable) ownerFns += `
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }`;

  if (hasBlacklist) ownerFns += `
    function setBlacklist(address addr, bool blocked) external onlyOwner {
        blacklisted[addr] = blocked;
    }`;

  if (antiwhale) ownerFns += `
    function setMaxTxAmount(uint256 amount) external onlyOwner {
        require(amount >= INITIAL_SUPPLY / 100, "Min 1% of supply");
        maxTxAmount = amount;
    }`;

  if (taxable) ownerFns += `
    function setTax(uint256 bps)      external onlyOwner { require(bps <= 2500, "Max 25%"); taxBps = bps; }
    function setTreasury(address t)   external onlyOwner { require(t != address(0), "Zero addr"); treasury = t; }
    function setExcluded(address a, bool v) external onlyOwner { isExcluded[a] = v; }`;

  // ── Constructor extras ─────────────────────────────────────────────────────
  const constructorExtra = votes ? `\n        ERC20Permit("${name}")` : "";
  const constructorBody  = [
    taxable   ? "        treasury = initialOwner;" : "",
    hasExcluded ? "        isExcluded[initialOwner] = true;" : "",
    "        _mint(initialOwner, INITIAL_SUPPLY);",
  ].filter(Boolean).join("\n");

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

${importBlock}

/// @title ${name}
/// @notice ${c.description || "ERC-20 Token generated by block67.app"}
/// @dev AI-assembled from Block67 Component Library
contract ${name} is ${inherits.join(", ")} {
    uint256 public constant INITIAL_SUPPLY = ${supply} * 10 ** 18;
${storageBlock}
    constructor(address initialOwner)
        ERC20("${c.tokenName || "MyToken"}", "${sym}")${constructorExtra}
        Ownable(initialOwner)
    {
${constructorBody}
    }
${ownerFns}${updateFn}${noncesOverride}
}
`;

  return {
    source,
    filename:  `${name}.sol`,
    imports,
    baseContracts: inherits,
  };
}

function assembleNFT(spec: AssemblySpec): AssembledContract {
  const c      = spec.config;
  const name   = (c.collectionName || "MyNFT").replace(/\s+/g, "");
  const sym    = c.symbol           || "MNFT";
  const supply = c.maxSupply        || "10000";
  const price  = c.mintPrice        || "0.05";
  const ver    = spec.version       || "0.8.20";

  const withRoyalty    = spec.modules.includes("royalty");
  const withSoulbound  = spec.modules.includes("soulbound");
  const withURIStorage = spec.modules.includes("uristorage");

  let importBlock = `import "@openzeppelin/contracts/token/ERC721/ERC721.sol";\nimport "@openzeppelin/contracts/access/Ownable.sol";\nimport "@openzeppelin/contracts/utils/ReentrancyGuard.sol";`;
  const inherits  = ["ERC721", "Ownable", "ReentrancyGuard"];

  if (withRoyalty) {
    importBlock += `\nimport "@openzeppelin/contracts/token/common/ERC2981.sol";`;
    inherits.push("ERC2981");
  }

  const soulboundOverride = withSoulbound ? `
    function _update(address to, uint256 id, address auth)
        internal override returns (address from)
    {
        from = super._update(to, id, auth);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
    }` : "";

  const royaltySupports = withRoyalty ? `
    function supportsInterface(bytes4 id)
        public view override(ERC721, ERC2981) returns (bool)
    { return super.supportsInterface(id); }` : "";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

${importBlock}

/// @title ${name}
/// @notice ${c.description || "NFT Collection generated by block67.app"}
contract ${name} is ${inherits.join(", ")} {
    uint256 public constant MAX_SUPPLY = ${supply};
    uint256 public constant MINT_PRICE = ${price} ether;
    uint256 private _nextId = 1;
    bool    public  saleActive;
    string  private _baseUri;

    error SaleNotActive();
    error MaxSupplyReached();
    error InsufficientPayment();

    constructor(address initialOwner)
        ERC721("${c.collectionName || "MyNFT"}", "${sym}")
        Ownable(initialOwner)
    {${withRoyalty ? `\n        _setDefaultRoyalty(initialOwner, ${Number(c.royaltyPct || 5) * 100});` : ""}}

    function mint(uint256 qty) external payable nonReentrant {
        if (!saleActive)                    revert SaleNotActive();
        if (msg.value < MINT_PRICE * qty)   revert InsufficientPayment();
        if (_nextId + qty - 1 > MAX_SUPPLY) revert MaxSupplyReached();
        for (uint256 i; i < qty; ++i) _safeMint(msg.sender, _nextId++);
    }

    function ownerMint(address to, uint256 qty) external onlyOwner {
        if (_nextId + qty - 1 > MAX_SUPPLY) revert MaxSupplyReached();
        for (uint256 i; i < qty; ++i) _safeMint(to, _nextId++);
    }

    function setSaleActive(bool v) external onlyOwner { saleActive = v; }
    function setBaseURI(string calldata u) external onlyOwner { _baseUri = u; }
    function totalMinted() external view returns (uint256) { return _nextId - 1; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }

    function withdraw() external onlyOwner {
        (bool ok,) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
${soulboundOverride}${royaltySupports}
}
`;

  return {
    source,
    filename:  `${name}.sol`,
    imports:   withRoyalty ? ["block67/nft/ERC721Royalty.sol"] : ["block67/nft/ERC721Mintable.sol"],
    baseContracts: inherits,
  };
}

function assembleStaking(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "Staking").replace(/\s+/g, "");
  const ver  = spec.version || "0.8.20";
  const apy  = Math.round(Number(c.apy || 12) * 100);
  const lock = Number(c.lockDays || 30) * 86400;

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ${name}StakingPool
/// @notice Staking pool — ${c.apy || 12}% APY, ${c.lockDays || 30}-day lock
/// @dev Generated by block67.app
contract ${name}StakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakeToken;
    IERC20 public immutable rewardToken;

    uint256 public rewardRate;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalStaked;
    uint256 public constant APY_BPS    = ${apy};
    uint256 public constant LOCK_SECS  = ${lock};

    mapping(address => uint256) public staked;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakedAt;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(IERC20 stakeToken_, IERC20 rewardToken_, uint256 rewardRate_, address owner_)
        Ownable(owner_)
    {
        stakeToken  = stakeToken_;
        rewardToken = rewardToken_;
        rewardRate  = rewardRate_;
    }

    modifier updateReward(address user) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (user != address(0)) {
            rewards[user] = earned(user);
            userRewardPerTokenPaid[user] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + (rewardRate * (block.timestamp - lastUpdateTime) * 1e18) / totalStaked;
    }

    function earned(address user) public view returns (uint256) {
        return (staked[user] * (rewardPerToken() - userRewardPerTokenPaid[user])) / 1e18 + rewards[user];
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        stakedAt[msg.sender] = block.timestamp;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(staked[msg.sender] >= amount, "Insufficient");
        require(block.timestamp >= stakedAt[msg.sender] + LOCK_SECS, "Still locked");
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    function setRewardRate(uint256 rate) external onlyOwner updateReward(address(0)) { rewardRate = rate; }
    function fundRewards(uint256 amount) external onlyOwner { rewardToken.safeTransferFrom(msg.sender, address(this), amount); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
`;

  return {
    source,
    filename:      `${name}StakingPool.sol`,
    imports:       ["block67/defi/StakingPool.sol"],
    baseContracts: ["Ownable", "ReentrancyGuard", "Pausable"],
  };
}

// ── Upgradeable Assemblers ────────────────────────────────────────────────────

/**
 * Proxy contract import + block comment depending on pattern.
 * Returns { proxyImport, proxyExplainer }
 */
function proxySnippet(pattern: ProxyPattern, implName: string, ver: string) {
  const proxyImport =
    pattern === "transparent"
      ? `import "block67/proxy/TransparentProxy.sol";`
      : pattern === "beacon"
      ? `import "block67/proxy/BeaconProxyFactory.sol";`
      : `import "block67/proxy/UUPSProxy.sol";`;

  const deployComment =
    pattern === "transparent"
      ? `
 * Deploy:
 *   ${implName} impl = new ${implName}();
 *   bytes memory data = abi.encodeCall(impl.initialize, (...));
 *   Block67TransparentProxy proxy = new Block67TransparentProxy(address(impl), owner, data);`
      : pattern === "beacon"
      ? `
 * Deploy:
 *   ${implName} impl = new ${implName}();
 *   Block67BeaconFactory factory = new Block67BeaconFactory(address(impl), owner);
 *   address proxy = factory.deploy(abi.encodeCall(impl.initialize, (...)));`
      : `
 * Deploy (UUPS):
 *   ${implName} impl = new ${implName}();
 *   bytes memory data = abi.encodeCall(impl.initialize, (...));
 *   Block67UUPSProxy proxy = new Block67UUPSProxy(address(impl), data);
 *   // Or with Hardhat: upgrades.deployProxy(factory, [...], { kind: "uups" })`;

  return { proxyImport, deployComment };
}

function assembleUpgradeableERC20(spec: AssemblySpec): AssembledContract {
  const c       = spec.config;
  const name    = (c.tokenName || "MyToken").replace(/\s+/g, "");
  const sym     = c.symbol     || "MTK";
  const supply  = c.totalSupply || "1_000_000";
  const ver     = spec.version  || "0.8.20";
  const pattern: ProxyPattern = (spec.proxyPattern as ProxyPattern) || "uups";
  const votes   = spec.modules.includes("votes") || spec.modules.includes("governance");
  const implFile = votes ? "block67/upgradeable/tokens/ERC20VotesUpgradeable.sol"
                         : "block67/upgradeable/tokens/ERC20UpgradeableToken.sol";
  const implName = votes ? "ERC20VotesUpgradeableToken" : "ERC20UpgradeableToken";

  const { proxyImport, deployComment } = proxySnippet(pattern, implName, ver);
  const proxyContract = pattern === "transparent" ? "Block67TransparentProxy"
                      : pattern === "beacon"      ? "Block67BeaconFactory"
                                                  : "Block67UUPSProxy";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "${implFile}";
${proxyImport}

/**
 * @title ${name}Token (Upgradeable — ${pattern.toUpperCase()} proxy)
 * @notice Upgradeable ERC20 generated by Block67.
 *
 * Key upgradeable differences vs standard ERC20:
 *   - No constructor: state is set via initialize()
 *   - Inherits Initializable (prevents double-init)
 *   - _authorizeUpgrade() restricts who can upgrade
 *   - Storage layout must be preserved between V1 and V2
 * ${deployComment}
 */
contract ${name}Token is ${implName} {
    // Implementation is inherited from ${implName}
    // All logic lives in the upgradeable base contract.
    // Add V1-specific functions below if needed.
}

/**
 * @title ${name}Proxy
 * @notice Ready-to-deploy ${pattern} proxy for ${name}Token.
 *         Call this contract's address with ${name}Token ABI.
 */
contract ${name}Proxy is ${proxyContract} {
${pattern === "transparent"
  ? `    constructor(address initialOwner)
        Block67TransparentProxy(
            address(new ${name}Token()),
            initialOwner,
            abi.encodeCall(${name}Token.initialize, (
                "${c.tokenName || name}",
                "${sym}",
                ${supply} * 10**18,
                initialOwner
            ))
        ) {}`
  : pattern === "beacon"
  ? `    constructor(address initialOwner)
        Block67BeaconFactory(address(new ${name}Token()), initialOwner) {}`
  : `    constructor(address initialOwner)
        Block67UUPSProxy(
            address(new ${name}Token()),
            abi.encodeCall(${name}Token.initialize, (
                "${c.tokenName || name}",
                "${sym}",
                ${supply} * 10**18,
                initialOwner
            ))
        ) {}`
}
}
`;

  return {
    source,
    filename:      `${name}TokenUpgradeable.sol`,
    imports:       [implFile, proxyImport.replace(/import "|";/g, "")],
    baseContracts: [implName, proxyContract],
  };
}

function assembleUpgradeableNFT(spec: AssemblySpec): AssembledContract {
  const c       = spec.config;
  const name    = (c.collectionName || "MyNFT").replace(/\s+/g, "");
  const sym     = c.symbol          || "NFT";
  const royalty = c.royaltyBps      || "500";
  const ver     = spec.version      || "0.8.20";
  const pattern: ProxyPattern = (spec.proxyPattern as ProxyPattern) || "uups";
  const multi   = spec.modules.includes("erc1155");
  const implFile = multi ? "block67/upgradeable/nft/ERC1155UpgradeableNFT.sol"
                         : "block67/upgradeable/nft/ERC721UpgradeableNFT.sol";
  const implName = multi ? "ERC1155UpgradeableNFT" : "ERC721UpgradeableNFT";

  const { proxyImport, deployComment } = proxySnippet(pattern, implName, ver);
  const proxyContract = pattern === "transparent" ? "Block67TransparentProxy"
                      : pattern === "beacon"      ? "Block67BeaconFactory"
                                                  : "Block67UUPSProxy";

  const initArgs = multi
    ? `"${c.collectionName || name}", "${sym}", "ipfs://base/", ${royalty}, initialOwner`
    : `"${c.collectionName || name}", "${sym}", ${royalty}, initialOwner, "ipfs://base/"`;

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "${implFile}";
${proxyImport}

/**
 * @title ${name} (Upgradeable ${multi ? "ERC1155" : "ERC721"} — ${pattern.toUpperCase()} proxy)
 * @notice Upgradeable NFT with EIP-2981 royalties generated by Block67.
 *
 * Key upgradeable differences:
 *   - constructor() → initialize() with Initializable guard
 *   - All __X_init() calls chain through super
 *   - _authorizeUpgrade() = onlyOwner
 *   - Beacon pattern lets one upgrade propagate to ALL collections
 * ${deployComment}
 */
contract ${name} is ${implName} {
    // Extend ${implName} with collection-specific overrides here.
}

/**
 * @title ${name}Proxy
 * @notice ${pattern.toUpperCase()} proxy for ${name}.
 */
contract ${name}Proxy is ${proxyContract} {
${pattern === "beacon"
  ? `    constructor(address initialOwner)
        Block67BeaconFactory(address(new ${name}()), initialOwner) {}`
  : pattern === "transparent"
  ? `    constructor(address initialOwner)
        Block67TransparentProxy(
            address(new ${name}()),
            initialOwner,
            abi.encodeCall(${name}.initialize, (${initArgs}))
        ) {}`
  : `    constructor(address initialOwner)
        Block67UUPSProxy(
            address(new ${name}()),
            abi.encodeCall(${name}.initialize, (${initArgs}))
        ) {}`
}
}
`;

  return {
    source,
    filename:      `${name}Upgradeable.sol`,
    imports:       [implFile],
    baseContracts: [implName, proxyContract],
  };
}

function assembleUpgradeableDAO(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.daoName || "MyDAO").replace(/\s+/g, "");
  const ver  = spec.version || "0.8.20";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "block67/upgradeable/tokens/ERC20VotesUpgradeable.sol";
import "block67/upgradeable/dao/TimelockControllerUpgradeable.sol";
import "block67/upgradeable/dao/UpgradeableDAO.sol";
import "block67/proxy/UUPSProxy.sol";

/**
 * @title ${name} — Complete Upgradeable DAO System (UUPS)
 * @notice Generated by Block67. Deploy in order:
 *
 *   Step 1 — Governance Token (UUPS proxy):
 *     ${name}GovToken impl1 = new ${name}GovToken();
 *     Block67UUPSProxy tokenProxy = new Block67UUPSProxy(
 *         address(impl1),
 *         abi.encodeCall(impl1.initialize, ("${c.daoName || name} Token", "vGOV", owner))
 *     );
 *
 *   Step 2 — Timelock (UUPS proxy):
 *     Block67TimelockController timeLockImpl = new Block67TimelockController();
 *     address[] memory proposers; address[] memory executors = new address[](1);
 *     executors[0] = address(0); // anyone can execute
 *     Block67UUPSProxy timelockProxy = new Block67UUPSProxy(
 *         address(timeLockImpl),
 *         abi.encodeCall(timeLockImpl.initialize, (2 days, proposers, executors, owner))
 *     );
 *
 *   Step 3 — Governor (UUPS proxy):
 *     ${name}Governor govImpl = new ${name}Governor();
 *     Block67UUPSProxy govProxy = new Block67UUPSProxy(
 *         address(govImpl),
 *         abi.encodeCall(govImpl.initialize, (
 *             "${c.daoName || name} Governor",
 *             IVotes(address(tokenProxy)),
 *             TimelockControllerUpgradeable(payable(address(timelockProxy))),
 *             7200, 50400, 1e18, 4, owner
 *         ))
 *     );
 *
 *   Step 4 — Setup roles:
 *     TimelockControllerUpgradeable(payable(address(timelockProxy)))
 *         .grantRole(PROPOSER_ROLE, address(govProxy));
 *     // Revoke deployer TIMELOCK_ADMIN_ROLE for full decentralisation
 */

contract ${name}GovToken is ERC20VotesUpgradeableToken {}

contract ${name}TimelockController is Block67TimelockController {}

contract ${name}Governor is UpgradeableDAO {}
`;

  return {
    source,
    filename:      `${name}DAOSystem.sol`,
    imports:       [
      "block67/upgradeable/tokens/ERC20VotesUpgradeable.sol",
      "block67/upgradeable/dao/TimelockControllerUpgradeable.sol",
      "block67/upgradeable/dao/UpgradeableDAO.sol",
      "block67/proxy/UUPSProxy.sol",
    ],
    baseContracts: ["ERC20VotesUpgradeableToken", "Block67TimelockController", "UpgradeableDAO"],
  };
}

// ── Pump Token (Bonding Curve) ─────────────────────────────────────────────────

function assemblePumpToken(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "PumpToken").replace(/\s+/g, "");
  const sym  = c.symbol     || "PUMP";
  const ver  = spec.version || "0.8.20";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

/**
 * @title ${name} — Bonding Curve Token
 * @notice Generated by Block67. Price rises linearly with supply.
 *         Buy tokens by sending ETH. Sell back at current curve price.
 */
contract ${name} {
    string public name    = "${c.tokenName || "PumpToken"}";
    string public symbol  = "${sym}";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Bonding curve: price = BASE_PRICE + SLOPE * totalSupply / 1e18
    uint256 public constant BASE_PRICE = 0.000001 ether;
    uint256 public constant SLOPE      = 0.0000001 ether;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensBought(address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 newPrice);
    event TokensSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 newPrice);

    constructor() { owner = msg.sender; }

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    function currentPrice() public view returns (uint256) {
        return BASE_PRICE + (SLOPE * totalSupply / 1e18);
    }

    function buy() external payable {
        require(msg.value > 0, "Send ETH to buy");
        uint256 price  = currentPrice();
        uint256 tokens = (msg.value * 1e18) / price;
        require(tokens > 0, "Not enough ETH for 1 token");
        totalSupply              += tokens;
        balanceOf[msg.sender]   += tokens;
        emit Transfer(address(0), msg.sender, tokens);
        emit TokensBought(msg.sender, msg.value, tokens, currentPrice());
    }

    function sell(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be > 0");
        uint256 price  = currentPrice();
        uint256 ethOut = (amount * price) / 1e18;
        require(address(this).balance >= ethOut, "Insufficient liquidity");
        balanceOf[msg.sender] -= amount;
        totalSupply            -= amount;
        emit Transfer(msg.sender, address(0), amount);
        emit TokensSold(msg.sender, amount, ethOut, currentPrice());
        payable(msg.sender).transfer(ethOut);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");
        require(balanceOf[from] >= amount, "Insufficient");
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // Owner can seed liquidity
    function deposit() external payable onlyOwner {}

    receive() external payable { buy(); }
}
`;
  return { source, filename: `${name}.sol`, imports: [], baseContracts: [name] };
}

// ── NFT Open Edition Mint ─────────────────────────────────────────────────────

function assembleNFTMint(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const cName = (c.collectionName || "MyNFTDrop").replace(/\s+/g, "");
  const sym  = c.symbol    || "MNFT";
  const max  = c.maxSupply  || "1000";
  const price = c.mintPrice || "0.01";
  const ver  = spec.version || "0.8.20";
  const priceWei = `${Math.round(parseFloat(price) * 1e18)}`;

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${cName} — Open Edition NFT Mint
 * @notice Generated by Block67. Public mint, no whitelist.
 */
contract ${cName} is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY  = ${max};
    uint256 public constant MINT_PRICE  = ${priceWei};
    uint256 private _nextTokenId = 1;
    bool    public  saleActive   = false;
    string  private _baseTokenURI;

    event Minted(address indexed to, uint256 tokenId);

    constructor(address initialOwner)
        ERC721("${c.collectionName || "MyNFTDrop"}", "${sym}")
        Ownable(initialOwner)
    {}

    function totalMinted() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    function mint(uint256 quantity) external payable {
        require(saleActive,                              "Sale not active");
        require(quantity >= 1 && quantity <= 10,         "Quantity: 1-10");
        require(totalMinted() + quantity <= MAX_SUPPLY,  "Exceeds max supply");
        require(msg.value >= MINT_PRICE * quantity,      "Insufficient payment");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
            emit Minted(msg.sender, tokenId);
        }
    }

    function ownerMint(address to, uint256 qty) external onlyOwner {
        require(totalMinted() + qty <= MAX_SUPPLY, "Exceeds max supply");
        for (uint256 i = 0; i < qty; i++) {
            _safeMint(to, _nextTokenId++);
        }
    }

    function setSaleActive(bool active) external onlyOwner { saleActive = active; }

    function setBaseURI(string calldata uri) external onlyOwner { _baseTokenURI = uri; }

    function _baseURI() internal view override returns (string memory) { return _baseTokenURI; }

    function withdraw() external onlyOwner {
        (bool ok,) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Transfer failed");
    }
}
`;
  return {
    source,
    filename: `${cName}.sol`,
    imports:  ["@openzeppelin/contracts/token/ERC721/ERC721.sol", "@openzeppelin/contracts/access/Ownable.sol"],
    baseContracts: ["ERC721", "Ownable"],
  };
}

// ── Token-Gated Access ────────────────────────────────────────────────────────

function assembleTokenGated(spec: AssemblySpec): AssembledContract {
  const c     = spec.config;
  const name  = (c.contentTitle || "TokenGatedAccess").replace(/[^a-zA-Z0-9]/g, "");
  const minBal = c.minBalance   || "1";
  const ver   = spec.version    || "0.8.20";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${name} — Token-Gated Access
 * @notice Generated by Block67. Verifies token balance on-chain to grant access.
 *         Call hasAccess(userAddress) from your frontend to check eligibility.
 */
contract ${name} is Ownable {
    IERC20  public gateToken;
    uint256 public minBalance;
    string  public accessUrl;
    string  public contentTitle;

    event AccessGranted(address indexed user);
    event AccessDenied(address indexed user);

    constructor(
        address gateToken_,
        uint256 minBalance_,
        string  memory accessUrl_,
        string  memory contentTitle_,
        address initialOwner
    ) Ownable(initialOwner) {
        gateToken    = IERC20(gateToken_);
        minBalance   = minBalance_;
        accessUrl    = accessUrl_;
        contentTitle = contentTitle_;
    }

    function hasAccess(address user) public view returns (bool) {
        return gateToken.balanceOf(user) >= minBalance;
    }

    /// @dev Call this from a wallet tx — emits grant/deny event on-chain.
    function checkAndGetAccess() external returns (string memory) {
        if (hasAccess(msg.sender)) {
            emit AccessGranted(msg.sender);
            return accessUrl;
        }
        emit AccessDenied(msg.sender);
        return "";
    }

    function updateConfig(
        address token_,
        uint256 minBal_,
        string calldata url_
    ) external onlyOwner {
        gateToken  = IERC20(token_);
        minBalance = minBal_;
        accessUrl  = url_;
    }
}
`;

  // Use defaults if no token address provided yet
  const tokenAddr = c.tokenAddress || "0x0000000000000000000000000000000000000000";
  void tokenAddr; void minBal;

  return {
    source,
    filename:      `${name}.sol`,
    imports:       ["@openzeppelin/contracts/token/ERC20/IERC20.sol", "@openzeppelin/contracts/access/Ownable.sol"],
    baseContracts: ["Ownable"],
  };
}

// ── Click-to-Earn ─────────────────────────────────────────────────────────────

function assembleClickToEarn(spec: AssemblySpec): AssembledContract {
  const c       = spec.config;
  const name    = (c.gameName || "ClickToEarn").replace(/[^a-zA-Z0-9]/g, "");
  const reward  = c.rewardPerClick || "0.0001";
  const daily   = c.dailyLimit    || "0.01";
  const cool    = c.cooldown      || "3";
  const ver     = spec.version    || "0.8.20";

  const rewardWei = `${Math.round(parseFloat(reward) * 1e18)}`;
  const dailyWei  = `${Math.round(parseFloat(daily) * 1e18)}`;

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ${name} — Click-to-Earn Game
 * @notice Generated by Block67. Players tap to earn ETH. Owner funds the pool.
 */
contract ${name} is Ownable, ReentrancyGuard {
    uint256 public rewardPerClick = ${rewardWei};
    uint256 public dailyLimit     = ${dailyWei};
    uint256 public cooldown       = ${cool};

    mapping(address => uint256) public lastClickTime;
    mapping(address => uint256) public totalClicks;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public dailyClaimed;
    mapping(address => uint256) public dayStart;

    event Clicked(address indexed user, uint256 reward, uint256 totalClicks);
    event Claimed(address indexed user, uint256 amount);
    event Funded(uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function click() external {
        require(
            block.timestamp >= lastClickTime[msg.sender] + cooldown,
            "Cooldown active"
        );

        // Reset daily counters if new day
        if (block.timestamp >= dayStart[msg.sender] + 1 days) {
            dailyClaimed[msg.sender] = 0;
            dayStart[msg.sender]     = block.timestamp;
        }

        require(
            pendingRewards[msg.sender] + dailyClaimed[msg.sender] + rewardPerClick <= dailyLimit,
            "Daily limit reached"
        );

        lastClickTime[msg.sender]  = block.timestamp;
        totalClicks[msg.sender]   += 1;
        pendingRewards[msg.sender] += rewardPerClick;

        emit Clicked(msg.sender, rewardPerClick, totalClicks[msg.sender]);
    }

    function claim() external nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0,                    "Nothing to claim");
        require(address(this).balance >= amount, "Pool empty — wait for refill");

        pendingRewards[msg.sender]  = 0;
        dailyClaimed[msg.sender]   += amount;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit Claimed(msg.sender, amount);
    }

    function timeUntilNextClick(address user) external view returns (uint256) {
        uint256 next = lastClickTime[user] + cooldown;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    // Owner funds / manages the reward pool
    function deposit() external payable onlyOwner { emit Funded(msg.value); }

    function setRewards(uint256 rewardPerClick_, uint256 dailyLimit_, uint256 cooldown_) external onlyOwner {
        rewardPerClick = rewardPerClick_;
        dailyLimit     = dailyLimit_;
        cooldown       = cooldown_;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient");
        (bool ok,) = payable(owner()).call{value: amount}("");
        require(ok, "Transfer failed");
    }

    receive() external payable { emit Funded(msg.value); }
}
`;
  return {
    source,
    filename:      `${name}.sol`,
    imports:       ["@openzeppelin/contracts/access/Ownable.sol", "@openzeppelin/contracts/utils/ReentrancyGuard.sol"],
    baseContracts: ["Ownable", "ReentrancyGuard"],
  };
}

// ── Airdrop Campaign ──────────────────────────────────────────────────────────

function assembleAirdrop(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "AirdropToken").replace(/\s+/g, "");
  const sym  = c.symbol     || "AIR";
  const supply = c.totalSupply || "1000000000";
  const ver  = spec.version || "0.8.20";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${name} — Airdrop Campaign Token
/// @notice Mintable ERC20 with batch airdrop function
/// @dev Generated by block67.app
contract ${name} is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = ${supply} * 10 ** 18;
    uint256 public perWalletLimit = 1000 * 10 ** 18;
    mapping(address => bool) public hasClaimed;

    event Airdropped(address[] recipients, uint256 amountEach);
    event Claimed(address indexed wallet, uint256 amount);

    constructor(address initialOwner)
        ERC20("${c.tokenName || "AirdropToken"}", "${sym}")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /// @notice Batch airdrop to multiple wallets (owner only)
    function airdrop(address[] calldata recipients, uint256 amountEach) external onlyOwner {
        require(recipients.length <= 500, "Max 500 per tx");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(owner(), recipients[i], amountEach);
        }
        emit Airdropped(recipients, amountEach);
    }

    /// @notice Self-claim airdrop (one per wallet)
    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(balanceOf(owner()) >= perWalletLimit, "Airdrop pool empty");
        hasClaimed[msg.sender] = true;
        _transfer(owner(), msg.sender, perWalletLimit);
        emit Claimed(msg.sender, perWalletLimit);
    }

    function setPerWalletLimit(uint256 amount) external onlyOwner { perWalletLimit = amount; }
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
}
`;
  return { source, filename: `${name}.sol`, imports: [], baseContracts: ["ERC20", "Ownable"] };
}

// ── Token Presale / ICO ────────────────────────────────────────────────────────

function assemblePresale(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "PresaleToken").replace(/\s+/g, "");
  const ver  = spec.version || "0.8.20";
  const rate = c.rate || "1000";      // tokens per ETH
  const hardCap = c.hardCap || "100"; // ETH hard cap

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ${name} Presale
/// @notice Token presale (ICO). Pay ETH, receive tokens at set rate.
/// @dev Generated by block67.app
contract ${name}Presale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20  public immutable saleToken;
    uint256 public rate      = ${rate};                   // tokens per 1 ETH
    uint256 public hardCap   = ${hardCap} ether;
    uint256 public softCap   = ${Math.max(1, Math.floor(Number(hardCap) / 4))} ether;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public totalRaised;
    bool    public finalized;

    mapping(address => uint256) public contributed;
    mapping(address => uint256) public tokensBought;

    event Purchased(address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event Finalized(uint256 totalRaised);
    event Refunded(address indexed buyer, uint256 amount);

    constructor(address token_, address initialOwner, uint256 start_, uint256 duration_)
        Ownable(initialOwner)
    {
        saleToken = IERC20(token_);
        startTime = start_;
        endTime   = start_ + duration_;
    }

    receive() external payable { buy(); }

    function buy() public payable nonReentrant {
        require(block.timestamp >= startTime, "Sale not started");
        require(block.timestamp <= endTime,   "Sale ended");
        require(!finalized,                   "Sale finalized");
        require(msg.value > 0,                "Send ETH");
        require(totalRaised + msg.value <= hardCap, "Hard cap reached");

        uint256 tokens = (msg.value * rate) / 1e18 * 1e18;
        require(saleToken.balanceOf(address(this)) >= tokens, "Not enough tokens in pool");

        contributed[msg.sender]  += msg.value;
        tokensBought[msg.sender] += tokens;
        totalRaised              += msg.value;

        saleToken.safeTransfer(msg.sender, tokens);
        emit Purchased(msg.sender, msg.value, tokens);
    }

    function finalize() external onlyOwner {
        require(block.timestamp > endTime || totalRaised >= hardCap, "Sale ongoing");
        require(!finalized, "Already finalized");
        finalized = true;
        if (totalRaised >= softCap) {
            (bool ok,) = payable(owner()).call{value: address(this).balance}("");
            require(ok, "Withdraw failed");
        }
        emit Finalized(totalRaised);
    }

    function refund() external nonReentrant {
        require(finalized && totalRaised < softCap, "Not refundable");
        uint256 amt = contributed[msg.sender];
        require(amt > 0, "Nothing to refund");
        contributed[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amt}("");
        require(ok, "Refund failed");
        emit Refunded(msg.sender, amt);
    }

    function recoverTokens(uint256 amount) external onlyOwner {
        saleToken.safeTransfer(owner(), amount);
    }

    function setRate(uint256 rate_) external onlyOwner { rate = rate_; }
    function setTimes(uint256 start_, uint256 end_) external onlyOwner { startTime = start_; endTime = end_; }
}
`;
  return { source, filename: `${name}Presale.sol`, imports: [], baseContracts: ["Ownable", "ReentrancyGuard"] };
}

// ── Token Faucet ───────────────────────────────────────────────────────────────

function assembleFaucet(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "FaucetToken").replace(/\s+/g, "");
  const ver  = spec.version || "0.8.20";
  const amount = c.claimAmount || "100";
  const cooldown = Number(c.cooldownHours || "24") * 3600;

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${name} Faucet
/// @notice Distribute free tokens — one claim per wallet every ${c.cooldownHours || "24"} hours
/// @dev Generated by block67.app
contract ${name}Faucet is Ownable {
    using SafeERC20 for IERC20;

    IERC20  public immutable token;
    uint256 public claimAmount = ${amount} * 10 ** 18;
    uint256 public cooldown    = ${cooldown};

    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed user, uint256 amount);
    event Funded(uint256 amount);

    constructor(address token_, address initialOwner) Ownable(initialOwner) {
        token = IERC20(token_);
    }

    function claim() external {
        require(
            block.timestamp >= lastClaim[msg.sender] + cooldown,
            "Cooldown active — come back later"
        );
        require(token.balanceOf(address(this)) >= claimAmount, "Faucet empty");
        lastClaim[msg.sender] = block.timestamp;
        token.safeTransfer(msg.sender, claimAmount);
        emit Claimed(msg.sender, claimAmount);
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (block.timestamp >= lastClaim[user] + cooldown) return 0;
        return lastClaim[user] + cooldown - block.timestamp;
    }

    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(amount);
    }

    function setClaimAmount(uint256 amount) external onlyOwner { claimAmount = amount; }
    function setCooldown(uint256 seconds_) external onlyOwner { cooldown = seconds_; }

    function drain() external onlyOwner {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}
`;
  return { source, filename: `${name}Faucet.sol`, imports: [], baseContracts: ["Ownable"] };
}

// ── Referral Rewards ───────────────────────────────────────────────────────────

function assembleReferral(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.tokenName || "ReferralRewards").replace(/\s+/g, "");
  const ver  = spec.version || "0.8.20";
  const reward = c.rewardPerReferral || "10";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ${name} Referral System
/// @notice Invite users and earn token rewards. Track on-chain.
/// @dev Generated by block67.app
contract ${name}Referral is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20  public immutable rewardToken;
    uint256 public rewardPerReferral = ${reward} * 10 ** 18;
    uint256 public maxReferrals      = 100;

    mapping(address => address) public referredBy;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public pendingRewards;
    mapping(address => bool)    public registered;

    event Registered(address indexed user, address indexed referrer);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address token_, address initialOwner) Ownable(initialOwner) {
        rewardToken = IERC20(token_);
        registered[initialOwner] = true;
    }

    function register(address referrer) external {
        require(!registered[msg.sender],       "Already registered");
        require(registered[referrer],          "Unknown referrer");
        require(referrer != msg.sender,        "Cannot refer yourself");
        require(referralCount[referrer] < maxReferrals, "Referrer at max");

        registered[msg.sender]       = true;
        referredBy[msg.sender]       = referrer;
        referralCount[referrer]     += 1;
        pendingRewards[referrer]    += rewardPerReferral;

        emit Registered(msg.sender, referrer);
    }

    function claimRewards() external nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards pending");
        require(rewardToken.balanceOf(address(this)) >= amount, "Pool empty");

        pendingRewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }

    function fundPool(uint256 amount) external {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setRewardPerReferral(uint256 amount) external onlyOwner { rewardPerReferral = amount; }
    function setMaxReferrals(uint256 max) external onlyOwner { maxReferrals = max; }
}
`;
  return { source, filename: `${name}Referral.sol`, imports: [], baseContracts: ["Ownable", "ReentrancyGuard"] };
}

// ── Reward Game (Spin / Scratch) ───────────────────────────────────────────────

function assembleRewardGame(spec: AssemblySpec): AssembledContract {
  const c    = spec.config;
  const name = (c.gameName || "RewardGame").replace(/[^a-zA-Z0-9]/g, "");
  const ver  = spec.version || "0.8.20";
  const cool = Number(c.cooldown || "3600");
  const maxReward = c.maxRewardEth || "0.005";

  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^${ver};

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ${name} — Reward Game
/// @notice Spin to win! Random ETH reward from pool. One spin per cooldown.
/// @dev Generated by block67.app — uses block hash for randomness (not cryptographically secure)
contract ${name} is Ownable, ReentrancyGuard {
    uint256 public cooldown     = ${cool};
    uint256 public maxReward    = ${maxReward} ether;
    uint256 public spinFee      = 0.0001 ether;
    uint256 public totalSpins;
    uint256 public totalPayout;

    mapping(address => uint256) public lastSpin;
    mapping(address => uint256) public totalWon;
    mapping(address => uint256) public spins;

    event Spun(address indexed player, uint256 reward, uint256 nonce);
    event Funded(uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function spin() external payable nonReentrant {
        require(msg.value >= spinFee, "Pay spin fee");
        require(block.timestamp >= lastSpin[msg.sender] + cooldown, "Cooldown active");
        require(address(this).balance >= maxReward, "Pool needs funding");

        lastSpin[msg.sender] = block.timestamp;
        spins[msg.sender]   += 1;
        totalSpins          += 1;

        // Pseudo-random: 0-3 (0=no win, 1=small, 2=med, 3=jackpot)
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.prevrandao, block.timestamp, msg.sender, totalSpins
        ))) % 100;

        uint256 reward = 0;
        if      (rand < 40) reward = maxReward / 10;      // 40% — small
        else if (rand < 65) reward = maxReward / 4;       // 25% — medium
        else if (rand < 80) reward = maxReward / 2;       // 15% — large
        else if (rand < 90) reward = maxReward;           // 10% — jackpot
        // else 0                                          // 10% — no win

        if (reward > 0 && address(this).balance >= reward) {
            totalWon[msg.sender] += reward;
            totalPayout          += reward;
            (bool ok,) = payable(msg.sender).call{value: reward}("");
            require(ok, "Transfer failed");
        }

        emit Spun(msg.sender, reward, totalSpins);
    }

    function timeUntilNextSpin(address user) external view returns (uint256) {
        if (block.timestamp >= lastSpin[user] + cooldown) return 0;
        return lastSpin[user] + cooldown - block.timestamp;
    }

    function poolBalance() external view returns (uint256) { return address(this).balance; }

    function fund() external payable onlyOwner { emit Funded(msg.value); }
    function setCooldown(uint256 s) external onlyOwner { cooldown = s; }
    function setMaxReward(uint256 amount) external onlyOwner { maxReward = amount; }
    function setSpinFee(uint256 fee) external onlyOwner { spinFee = fee; }
    function withdraw(uint256 amount) external onlyOwner {
        (bool ok,) = payable(owner()).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    receive() external payable { emit Funded(msg.value); }
}
`;
  return { source, filename: `${name}.sol`, imports: [], baseContracts: ["Ownable", "ReentrancyGuard"] };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Assemble a contract for a given template + module selection. */
export function assemble(spec: AssemblySpec): AssembledContract {
  // Upgradeable path — intercept before normal templates
  if (spec.upgradeable) {
    switch (spec.templateId) {
      case "erc20-token":      return assembleUpgradeableERC20(spec);
      case "nft-collection":   return assembleUpgradeableNFT(spec);
      case "dao-governance":   return assembleUpgradeableDAO(spec);
      case "staking-dashboard":return assembleUpgradeableNFT({ ...spec, templateId: "nft-collection" });
      default:                 return assembleUpgradeableERC20({ ...spec, templateId: "erc20-token" });
    }
  }

  switch (spec.templateId) {
    case "erc20-token":       return assembleERC20(spec);
    case "meme-token":        return assembleERC20({ ...spec, modules: [...new Set([...spec.modules, "taxable", "mintable"])] });
    case "nft-collection":    return assembleNFT(spec);
    case "staking-dashboard": return assembleStaking(spec);
    case "pump-token":        return assemblePumpToken(spec);
    case "nft-mint":          return assembleNFTMint(spec);
    case "token-gated":       return assembleTokenGated(spec);
    case "click-to-earn":     return assembleClickToEarn(spec);
    case "airdrop-campaign":  return assembleAirdrop(spec);
    case "token-presale":     return assemblePresale(spec);
    case "token-faucet":      return assembleFaucet(spec);
    case "referral-rewards":  return assembleReferral(spec);
    case "reward-game":       return assembleRewardGame(spec);
    default:                  return assembleERC20({ ...spec, templateId: "erc20-token" });
  }
}

/** List all available library paths. */
export function listLibrary(): string[] {
  return Object.keys(LIBRARY_VFS);
}

/** Get library contract source by path. */
export function getLibraryContract(path: string): string | undefined {
  return LIBRARY_VFS[path];
}
