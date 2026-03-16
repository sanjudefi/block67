/**
 * Block67 Upgradeable Contract Library
 * ------------------------------------
 * All contracts use OpenZeppelin Upgradeable v5 patterns:
 *   - constructor() replaced with initialize() + Initializable
 *   - @custom:oz-upgrades-unsafe-allow constructor  (for storage-only base)
 *   - UUPSUpgradeable / TransparentUpgradeableProxy / BeaconProxy patterns
 *   - No immutables — state goes through storage slots
 *   - Solidity ^0.8.20
 */

export const UPGRADEABLE_VFS: Record<string, string> = {

  // ─── Proxy Wrappers ──────────────────────────────────────────────────────

  "block67/proxy/TransparentProxy.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title Block67TransparentProxy
 * @notice Deploy this alongside your implementation contract.
 *         The deployer automatically becomes the ProxyAdmin owner.
 *
 * Usage:
 *   1. Deploy implementation:  MyTokenV1 impl = new MyTokenV1();
 *   2. Encode initializer:     bytes memory data = abi.encodeCall(impl.initialize, (name, symbol, owner));
 *   3. Deploy proxy:           Block67TransparentProxy proxy = new Block67TransparentProxy(address(impl), msg.sender, data);
 *   4. Interact via proxy:     MyTokenV1(address(proxy)).totalSupply();
 *   5. Upgrade (admin only):   proxyAdmin.upgradeAndCall(proxy, address(implV2), data);
 */
contract Block67TransparentProxy is TransparentUpgradeableProxy {
    constructor(
        address implementation,
        address initialOwner,
        bytes memory _data
    ) TransparentUpgradeableProxy(implementation, initialOwner, _data) {}
}
`,

  "block67/proxy/UUPSProxy.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Block67UUPSProxy
 * @notice ERC1967 proxy for UUPS-upgradeable implementations.
 *         Upgrade logic lives inside the implementation (authorizeUpgrade).
 *
 * Usage:
 *   1. Deploy implementation:  MyTokenUUPS impl = new MyTokenUUPS();
 *   2. Encode initializer:     bytes memory data = abi.encodeCall(impl.initialize, (name, symbol, owner));
 *   3. Deploy proxy:           Block67UUPSProxy proxy = new Block67UUPSProxy(address(impl), data);
 *   4. Interact via proxy:     MyTokenUUPS(address(proxy)).totalSupply();
 *   5. Upgrade (owner only):   MyTokenUUPS(address(proxy)).upgradeToAndCall(address(implV2), data);
 */
contract Block67UUPSProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory _data
    ) ERC1967Proxy(implementation, _data) {}
}
`,

  "block67/proxy/BeaconProxyFactory.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Block67BeaconFactory
 * @notice Deploys a shared UpgradeableBeacon + factory for BeaconProxy instances.
 *         One upgrade to the beacon upgrades ALL proxy instances simultaneously.
 *
 * Usage:
 *   1. Deploy implementation:  MyNFTImpl impl = new MyNFTImpl();
 *   2. Deploy factory:         Block67BeaconFactory factory = new Block67BeaconFactory(address(impl), owner);
 *   3. Deploy clone:           address proxy = factory.deploy(abi.encodeCall(impl.initialize, (name, symbol, owner)));
 *   4. Upgrade all:            factory.upgradeTo(address(implV2));
 */
contract Block67BeaconFactory is Ownable {
    UpgradeableBeacon public immutable beacon;

    event ProxyDeployed(address indexed proxy, address indexed deployer);

    constructor(address implementation, address initialOwner) Ownable(initialOwner) {
        beacon = new UpgradeableBeacon(implementation, address(this));
    }

    /// @notice Deploy a new BeaconProxy pointing to the current implementation
    function deploy(bytes memory initData) external returns (address proxy) {
        proxy = address(new BeaconProxy(address(beacon), initData));
        emit ProxyDeployed(proxy, msg.sender);
    }

    /// @notice Upgrade the beacon so all proxies point to newImplementation
    function upgradeTo(address newImplementation) external onlyOwner {
        beacon.upgradeTo(newImplementation);
    }

    /// @notice Current implementation address
    function implementation() external view returns (address) {
        return beacon.implementation();
    }
}
`,

  // ─── Upgradeable Tokens ──────────────────────────────────────────────────

  "block67/upgradeable/tokens/ERC20UpgradeableToken.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ERC20UpgradeableToken
 * @notice Upgradeable ERC20 with burn, pause, and UUPS upgrade pattern.
 *         Deploy via Block67UUPSProxy (ERC1967Proxy).
 *
 * Key differences from non-upgradeable:
 *   - No constructor logic — use initialize() instead
 *   - Inherits Initializable to prevent double-init
 *   - authorizeUpgrade() restricts who can upgrade
 *   - Storage layout must be preserved between versions
 */
contract ERC20UpgradeableToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    uint256 public maxSupply;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /**
     * @notice Replaces constructor — called once via proxy during deployment.
     * @param name_      Token name
     * @param symbol_    Token symbol
     * @param maxSupply_ Hard cap (0 = unlimited)
     * @param initialOwner The address that receives ownership
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address initialOwner
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(initialOwner);
        maxSupply = maxSupply_;
    }

    /// @notice Mint new tokens (owner only, respects maxSupply)
    function mint(address to, uint256 amount) external onlyOwner {
        if (maxSupply > 0) {
            require(totalSupply() + amount <= maxSupply, "ERC20UpgradeableToken: cap exceeded");
        }
        _mint(to, amount);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Required overrides ───────────────────────────────────────────────

    function _update(address from, address to, uint256 value)
        internal override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }

    /// @notice Only owner may authorize an upgrade to a new implementation
    function _authorizeUpgrade(address newImplementation)
        internal override onlyOwner {}
}
`,

  "block67/upgradeable/tokens/ERC20VotesUpgradeable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ERC20VotesUpgradeable
 * @notice Governance token with on-chain voting power + UUPS upgrades.
 *         Use with UpgradeableDAO governor contract.
 */
contract ERC20VotesUpgradeableToken is
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __ERC20Votes_init();
        __Ownable_init(initialOwner);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ── Required overrides ───────────────────────────────────────────────

    function _update(address from, address to, uint256 value)
        internal override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  // ─── Upgradeable NFT ─────────────────────────────────────────────────────

  "block67/upgradeable/nft/ERC721UpgradeableNFT.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ERC721UpgradeableNFT
 * @notice Full-featured upgradeable NFT:
 *         Enumerable · URIStorage · Pausable · EIP-2981 royalties · UUPS
 *
 * Deploy pattern (UUPS):
 *   1. ERC721UpgradeableNFT impl = new ERC721UpgradeableNFT();
 *   2. bytes memory data = abi.encodeCall(impl.initialize, ("MyNFT","MN",500,owner,"ipfs://base/"));
 *   3. Block67UUPSProxy proxy = new Block67UUPSProxy(address(impl), data);
 *
 * Deploy pattern (Transparent):
 *   Same but use Block67TransparentProxy with initialOwner = proxyAdmin address.
 *
 * Deploy pattern (Beacon):
 *   Deploy Block67BeaconFactory with impl, then factory.deploy(data) per collection.
 */
contract ERC721UpgradeableNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721PausableUpgradeable,
    ERC2981Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    uint256 private _nextTokenId;
    uint256 public  maxSupply;
    uint256 public  mintPrice;
    bool    public  saleActive;
    string  private _baseTokenURI;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint96  royaltyBps,
        address initialOwner,
        string  memory baseURI_
    ) public initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __ERC721Pausable_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);

        _baseTokenURI = baseURI_;
        _setDefaultRoyalty(initialOwner, royaltyBps);
    }

    // ── Admin ────────────────────────────────────────────────────────────

    function setMaxSupply(uint256 max)    external onlyOwner { maxSupply = max; }
    function setMintPrice(uint256 price)  external onlyOwner { mintPrice = price; }
    function setSaleActive(bool active)   external onlyOwner { saleActive = active; }
    function setBaseURI(string memory uri) external onlyOwner { _baseTokenURI = uri; }
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    function withdraw() external onlyOwner { payable(owner()).transfer(address(this).balance); }

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    // ── Mint ─────────────────────────────────────────────────────────────

    /// @notice Public mint (requires payment if mintPrice > 0)
    function mint(address to) external payable {
        require(saleActive, "Sale not active");
        require(msg.value >= mintPrice, "Insufficient payment");
        if (maxSupply > 0) require(_nextTokenId < maxSupply, "Supply exhausted");
        _safeMint(to, ++_nextTokenId);
    }

    /// @notice Owner reserve mint
    function ownerMint(address to, uint256 qty) external onlyOwner {
        for (uint256 i; i < qty; i++) {
            if (maxSupply > 0) require(_nextTokenId < maxSupply, "Supply exhausted");
            _safeMint(to, ++_nextTokenId);
        }
    }

    // ── Required overrides ───────────────────────────────────────────────

    function _baseURI() internal view override returns (string memory) { return _baseTokenURI; }

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  "block67/upgradeable/nft/ERC1155UpgradeableNFT.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ERC1155UpgradeableNFT
 * @notice Multi-edition upgradeable NFT: Burnable · Pausable · Supply · EIP-2981 · UUPS
 */
contract ERC1155UpgradeableNFT is
    Initializable,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC2981Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    string public name;
    string public symbol;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        uint96  royaltyBps,
        address initialOwner
    ) public initializer {
        __ERC1155_init(uri_);
        __ERC1155Burnable_init();
        __ERC1155Pausable_init();
        __ERC1155Supply_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);

        name   = name_;
        symbol = symbol_;
        _setDefaultRoyalty(initialOwner, royaltyBps);
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(to, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(string memory newUri) external onlyOwner { _setURI(newUri); }
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal override(ERC1155Upgradeable, ERC1155PausableUpgradeable, ERC1155SupplyUpgradeable)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  // ─── Upgradeable DAO ─────────────────────────────────────────────────────

  "block67/upgradeable/dao/UpgradeableDAO.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title UpgradeableDAO
 * @notice Full on-chain DAO governance with:
 *         - Voting via ERC20Votes token
 *         - Configurable voting delay, period, threshold
 *         - 4% quorum fraction
 *         - Timelock execution
 *         - UUPS upgradeable governor itself
 *
 * Deploy pattern:
 *   1. Deploy ERC20VotesUpgradeableToken (as proxy)
 *   2. Deploy TimelockControllerUpgradeable (as proxy)
 *   3. Deploy UpgradeableDAO implementation + Block67UUPSProxy
 *   4. Grant PROPOSER_ROLE to governor, EXECUTOR_ROLE to address(0), revoke TIMELOCK_ADMIN
 */
contract UpgradeableDAO is
    Initializable,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable,
    GovernorTimelockControlUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        string memory name_,
        IVotes token_,
        TimelockControllerUpgradeable timelock_,
        uint48  votingDelay_,      // in blocks, e.g. 7200 (≈1 day)
        uint32  votingPeriod_,     // in blocks, e.g. 50400 (≈1 week)
        uint256 proposalThreshold_, // min tokens to propose
        uint256 quorumFraction_,    // e.g. 4 = 4%
        address initialOwner
    ) public initializer {
        __Governor_init(name_);
        __GovernorSettings_init(votingDelay_, votingPeriod_, proposalThreshold_);
        __GovernorCountingSimple_init();
        __GovernorVotes_init(token_);
        __GovernorVotesQuorumFraction_init(quorumFraction_);
        __GovernorTimelockControl_init(timelock_);
        __Ownable_init(initialOwner);
    }

    // ── Required overrides ───────────────────────────────────────────────

    function votingDelay() public view override(GovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(GovernorUpgradeable, GovernorSettingsUpgradeable) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public view override(GovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold()
        public view override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  "block67/upgradeable/dao/TimelockControllerUpgradeable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title Block67TimelockController
 * @notice Upgradeable timelock for DAO governance execution.
 *         Grant PROPOSER_ROLE to governor, EXECUTOR_ROLE to address(0) (anyone),
 *         and revoke TIMELOCK_ADMIN_ROLE from deployer after setup.
 */
contract Block67TimelockController is
    Initializable,
    TimelockControllerUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address initialOwner
    ) public initializer {
        __TimelockController_init(minDelay, proposers, executors, initialOwner);
        __Ownable_init(initialOwner);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  // ─── Upgradeable DeFi ────────────────────────────────────────────────────

  "block67/upgradeable/defi/StakingPoolUpgradeable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StakingPoolUpgradeable
 * @notice Upgradeable staking pool with proportional rewards.
 *         Reward rate set by owner; rewards accumulate per rewardPerToken.
 */
contract StakingPoolUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;
    IERC20 public rewardToken;

    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address stakingToken_,
        address rewardToken_,
        uint256 rewardRate_,
        address initialOwner
    ) public initializer {
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __Pausable_init();
        stakingToken = IERC20(stakingToken_);
        rewardToken  = IERC20(rewardToken_);
        rewardRate   = rewardRate_;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + (rewardRate * (block.timestamp - lastUpdateTime) * 1e18) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalStaked += amount;
        balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        totalStaked -= amount;
        balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function setRewardRate(uint256 rate) external onlyOwner updateReward(address(0)) { rewardRate = rate; }
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`,

  // ─── Hardhat deploy scripts (embedded as comments) ───────────────────────

  "block67/upgradeable/scripts/DeployUUPS.s.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Hardhat deploy script reference (TypeScript — not Solidity).
 *         Use with @openzeppelin/hardhat-upgrades plugin.
 *
 * // scripts/deploy-uups.ts
 * import { ethers, upgrades } from "hardhat";
 *
 * async function main() {
 *   const [deployer] = await ethers.getSigners();
 *
 *   // 1. Get implementation factory
 *   const Token = await ethers.getContractFactory("ERC20UpgradeableToken");
 *
 *   // 2. Deploy as UUPS proxy — upgrades plugin handles:
 *   //    a) Deploy implementation
 *   //    b) Deploy ERC1967Proxy
 *   //    c) Call initialize() atomically
 *   const proxy = await upgrades.deployProxy(Token, [
 *     "My Token",          // name
 *     "MTK",               // symbol
 *     ethers.parseEther("1000000"), // maxSupply
 *     deployer.address,    // initialOwner
 *   ], { kind: "uups" });
 *
 *   await proxy.waitForDeployment();
 *   console.log("Proxy deployed to:", await proxy.getAddress());
 *
 *   // 3. Upgrade to V2
 *   const TokenV2 = await ethers.getContractFactory("ERC20UpgradeableTokenV2");
 *   const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), TokenV2, { kind: "uups" });
 *   console.log("Upgraded to V2 at:", await upgraded.getAddress());
 * }
 *
 * main().catch(console.error);
 */
contract DeployUUPS_Reference {}
`,
};
