// Block67 Component Library — DAO (6 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const DAO: Record<string, string> = {

  // ── 17. GovernanceToken ─────────────────────────────────────────────────────
  "block67/dao/GovernanceToken.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GovernanceToken
/// @notice ERC-20 with on-chain voting power for DAO governance.
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        address        owner_
    )
        ERC20(name_, symbol_)
        ERC20Permit(name_)
        Ownable(owner_)
    {
        _mint(owner_, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }

    function _update(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes)
    { super._update(from, to, amount); }

    function nonces(address owner_)
        public view override(ERC20Permit, Nonces) returns (uint256)
    { return super.nonces(owner_); }
}`,

  // ── 18. DAOGovernor ─────────────────────────────────────────────────────────
  "block67/dao/DAOGovernor.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/// @title DAOGovernor
/// @notice Full on-chain governor with timelock, quorum and voting settings.
contract DAOGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(
        string         memory name_,
        IVotes                 token_,
        TimelockController     timelock_,
        uint48                 votingDelay_,
        uint32                 votingPeriod_,
        uint256                proposalThreshold_,
        uint256                quorumNumerator_
    )
        Governor(name_)
        GovernorSettings(votingDelay_, votingPeriod_, proposalThreshold_)
        GovernorVotes(token_)
        GovernorVotesQuorumFraction(quorumNumerator_)
        GovernorTimelockControl(timelock_)
    {}

    function votingDelay()      public view override(Governor, GovernorSettings)    returns (uint256) { return super.votingDelay(); }
    function votingPeriod()     public view override(Governor, GovernorSettings)    returns (uint256) { return super.votingPeriod(); }
    function quorum(uint256 b)  public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) { return super.quorum(b); }
    function proposalThreshold() public view override(Governor, GovernorSettings)  returns (uint256) { return super.proposalThreshold(); }
    function state(uint256 id)  public view override(Governor, GovernorTimelockControl)    returns (ProposalState) { return super.state(id); }
    function proposalNeedsQueuing(uint256 id) public view override(Governor, GovernorTimelockControl) returns (bool) { return super.proposalNeedsQueuing(id); }

    function _queueOperations(uint256 id, address[] memory t, uint256[] memory v, bytes[] memory c, bytes32 h)
        internal override(Governor, GovernorTimelockControl) returns (uint48) { return super._queueOperations(id, t, v, c, h); }

    function _executeOperations(uint256 id, address[] memory t, uint256[] memory v, bytes[] memory c, bytes32 h)
        internal override(Governor, GovernorTimelockControl) { super._executeOperations(id, t, v, c, h); }

    function _cancel(address[] memory t, uint256[] memory v, bytes[] memory c, bytes32 h)
        internal override(Governor, GovernorTimelockControl) returns (uint256) { return super._cancel(t, v, c, h); }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) { return super._executor(); }
}`,

  // ── 19. DAOTimelockController ───────────────────────────────────────────────
  "block67/dao/DAOTimelockController.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title DAOTimelockController
/// @notice Timelock for DAO governance — wraps OZ TimelockController.
contract DAOTimelockController is TimelockController {
    /// @param minDelay  Minimum delay (seconds) before execution.
    /// @param proposers Addresses that can schedule operations.
    /// @param executors Addresses that can execute (use address(0) for open).
    /// @param admin     Optional admin address (use address(0) to renounce).
    constructor(
        uint256          minDelay,
        address[] memory proposers,
        address[] memory executors,
        address          admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}`,

  // ── 20. ProposalManager ─────────────────────────────────────────────────────
  "block67/dao/ProposalManager.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ProposalManager
/// @notice Lightweight off-chain signalling governance (no timelock).
contract ProposalManager is Ownable {
    enum Status { Active, Passed, Rejected, Cancelled }

    struct Proposal {
        uint256 id;
        address proposer;
        string  description;
        uint64  startTime;
        uint64  endTime;
        uint256 forVotes;
        uint256 againstVotes;
        Status  status;
    }

    ERC20Votes public immutable votingToken;
    uint256 public proposalCount;
    uint256 public quorumBps = 400; // 4%

    mapping(uint256 => Proposal)               public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, address proposer);
    event Voted(uint256 indexed id, address voter, bool support, uint256 weight);
    event ProposalFinalized(uint256 indexed id, Status status);

    error AlreadyVoted();
    error ProposalNotActive();
    error ProposalNotEnded();

    constructor(ERC20Votes token_, address owner_) Ownable(owner_) {
        votingToken = token_;
    }

    function propose(string calldata description, uint64 duration) external returns (uint256 id) {
        id = ++proposalCount;
        proposals[id] = Proposal({
            id:            id,
            proposer:      msg.sender,
            description:   description,
            startTime:     uint64(block.timestamp),
            endTime:       uint64(block.timestamp + duration),
            forVotes:      0,
            againstVotes:  0,
            status:        Status.Active
        });
        emit ProposalCreated(id, msg.sender);
    }

    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        if (p.status != Status.Active || block.timestamp > p.endTime) revert ProposalNotActive();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();
        uint256 weight = votingToken.getPastVotes(msg.sender, p.startTime);
        hasVoted[id][msg.sender] = true;
        if (support) p.forVotes += weight;
        else         p.againstVotes += weight;
        emit Voted(id, msg.sender, support, weight);
    }

    function finalize(uint256 id) external {
        Proposal storage p = proposals[id];
        if (block.timestamp <= p.endTime) revert ProposalNotEnded();
        uint256 total = votingToken.getPastTotalSupply(p.startTime);
        uint256 quorumNeeded = (total * quorumBps) / 10_000;
        p.status = (p.forVotes + p.againstVotes >= quorumNeeded && p.forVotes > p.againstVotes)
            ? Status.Passed : Status.Rejected;
        emit ProposalFinalized(id, p.status);
    }

    function cancel(uint256 id) external {
        Proposal storage p = proposals[id];
        require(msg.sender == p.proposer || msg.sender == owner(), "Not authorized");
        p.status = Status.Cancelled;
    }

    function setQuorum(uint256 bps) external onlyOwner { quorumBps = bps; }
}`,

  // ── 21. VotingPower ─────────────────────────────────────────────────────────
  "block67/dao/VotingPower.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @title VotingPower
/// @notice Helper library/view contract for querying ERC20Votes delegation.
contract VotingPower {
    ERC20Votes public immutable token;

    constructor(ERC20Votes token_) { token = token_; }

    /// @notice Current voting power of an account.
    function currentVotes(address account) external view returns (uint256) {
        return token.getVotes(account);
    }

    /// @notice Voting power at a past timestamp.
    function pastVotes(address account, uint256 timepoint) external view returns (uint256) {
        return token.getPastVotes(account, timepoint);
    }

    /// @notice Bulk query voting power.
    function votingPowerBulk(address[] calldata accounts) external view returns (uint256[] memory powers) {
        powers = new uint256[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) powers[i] = token.getVotes(accounts[i]);
    }

    /// @notice Delegate via this helper.
    function delegateTo(address delegatee) external {
        token.delegate(delegatee);
    }
}`,

  // ── 22. DAOTreasury ─────────────────────────────────────────────────────────
  "block67/dao/DAOTreasury.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DAOTreasury
/// @notice Multi-asset treasury managed by DAO roles.
contract DAOTreasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    event ETHTransferred(address indexed to, uint256 amount);
    event ERC20Transferred(address indexed token, address indexed to, uint256 amount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
    }

    function transferETH(address payable to, uint256 amount)
        external onlyRole(EXECUTOR_ROLE) nonReentrant
    {
        require(address(this).balance >= amount, "Insufficient ETH");
        (bool ok,) = to.call{value: amount}("");
        require(ok, "Transfer failed");
        emit ETHTransferred(to, amount);
    }

    function transferERC20(IERC20 token, address to, uint256 amount)
        external onlyRole(EXECUTOR_ROLE) nonReentrant
    {
        token.safeTransfer(to, amount);
        emit ERC20Transferred(address(token), to, amount);
    }

    function ethBalance() external view returns (uint256) { return address(this).balance; }
    function erc20Balance(IERC20 token) external view returns (uint256) { return token.balanceOf(address(this)); }

    receive() external payable {}
}`,
};
