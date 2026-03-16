// Block67 Component Library — Payments (5 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const PAYMENTS: Record<string, string> = {

  // ── 36. PaymentSplitter ─────────────────────────────────────────────────────
  "block67/payments/PaymentSplitter.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PaymentSplitter
/// @notice Splits incoming ETH / ERC-20 payments among payees by shares.
contract PaymentSplitter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address[] public payees;
    uint256[] public shares;
    uint256   public totalShares;

    mapping(address => uint256) public ethReleased;
    mapping(IERC20 => mapping(address => uint256)) public erc20Released;

    event PaymentReceived(address from, uint256 amount);
    event PayeeReleased(address payee, uint256 amount);

    error NoPayees();
    error SharesLengthMismatch();
    error ZeroShare();

    constructor(address[] memory payees_, uint256[] memory shares_, address owner_) Ownable(owner_) {
        if (payees_.length == 0)                   revert NoPayees();
        if (payees_.length != shares_.length)       revert SharesLengthMismatch();
        for (uint256 i; i < payees_.length; ++i) {
            if (shares_[i] == 0) revert ZeroShare();
            payees.push(payees_[i]);
            shares.push(shares_[i]);
            totalShares += shares_[i];
        }
    }

    receive() external payable { emit PaymentReceived(msg.sender, msg.value); }

    function releaseETH(uint256 payeeIndex) external nonReentrant {
        uint256 totalReceived = address(this).balance + ethReleased[payees[payeeIndex]];
        uint256 due = (totalReceived * shares[payeeIndex]) / totalShares - ethReleased[payees[payeeIndex]];
        require(due > 0, "Nothing to release");
        ethReleased[payees[payeeIndex]] += due;
        (bool ok,) = payees[payeeIndex].call{value: due}("");
        require(ok, "ETH transfer failed");
        emit PayeeReleased(payees[payeeIndex], due);
    }

    function releaseERC20(IERC20 token, uint256 payeeIndex) external nonReentrant {
        uint256 totalReceived = token.balanceOf(address(this)) + erc20Released[token][payees[payeeIndex]];
        uint256 due = (totalReceived * shares[payeeIndex]) / totalShares - erc20Released[token][payees[payeeIndex]];
        require(due > 0, "Nothing to release");
        erc20Released[token][payees[payeeIndex]] += due;
        token.safeTransfer(payees[payeeIndex], due);
    }

    function payeeCount() external view returns (uint256) { return payees.length; }
}`,

  // ── 37. RoyaltyDistributor ──────────────────────────────────────────────────
  "block67/payments/RoyaltyDistributor.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoyaltyDistributor
/// @notice Distributes royalty payments according to EIP-2981 and custom splits.
contract RoyaltyDistributor is ERC2981, Ownable, ReentrancyGuard {
    struct Split {
        address recipient;
        uint256 bps; // basis points share of the royalty
    }

    Split[] public splits;
    uint256 public totalSplitBps;

    event RoyaltyDistributed(address indexed payer, uint256 amount);
    event SplitUpdated();

    error SplitBpsMismatch();

    constructor(address owner_) Ownable(owner_) {
        _setDefaultRoyalty(address(this), 500); // 5% default
    }

    function setSplits(Split[] calldata splits_) external onlyOwner {
        delete splits;
        uint256 total;
        for (uint256 i; i < splits_.length; ++i) {
            splits.push(splits_[i]);
            total += splits_[i].bps;
        }
        if (total != 10_000) revert SplitBpsMismatch();
        totalSplitBps = total;
        emit SplitUpdated();
    }

    function distribute() external payable nonReentrant {
        uint256 amount = msg.value;
        for (uint256 i; i < splits.length; ++i) {
            uint256 share = (amount * splits[i].bps) / 10_000;
            (bool ok,) = splits[i].recipient.call{value: share}("");
            require(ok, "Transfer failed");
        }
        emit RoyaltyDistributed(msg.sender, amount);
    }

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    function supportsInterface(bytes4 id) public view override(ERC2981) returns (bool) {
        return super.supportsInterface(id);
    }

    receive() external payable {}
}`,

  // ── 38. EscrowPayment ───────────────────────────────────────────────────────
  "block67/payments/EscrowPayment.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EscrowPayment
/// @notice Conditional escrow — funds are held until buyer confirms or deadline expires.
contract EscrowPayment is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State { Pending, Released, Refunded, Disputed }

    struct Escrow {
        address  buyer;
        address  seller;
        IERC20   token;       // address(0) = ETH
        uint256  amount;
        uint256  deadline;
        State    state;
    }

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(uint256 indexed id, address buyer, address seller, uint256 amount);
    event EscrowReleased(uint256 indexed id);
    event EscrowRefunded(uint256 indexed id);
    event EscrowDisputed(uint256 indexed id);

    error NotBuyer();
    error NotSeller();
    error WrongState();
    error DeadlineNotReached();
    error DeadlinePassed();

    function createETH(address seller, uint256 deadline) external payable nonReentrant returns (uint256 id) {
        id = escrowCount++;
        escrows[id] = Escrow(msg.sender, seller, IERC20(address(0)), msg.value, deadline, State.Pending);
        emit EscrowCreated(id, msg.sender, seller, msg.value);
    }

    function createERC20(address seller, IERC20 token, uint256 amount, uint256 deadline) external nonReentrant returns (uint256 id) {
        token.safeTransferFrom(msg.sender, address(this), amount);
        id = escrowCount++;
        escrows[id] = Escrow(msg.sender, seller, token, amount, deadline, State.Pending);
        emit EscrowCreated(id, msg.sender, seller, amount);
    }

    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (msg.sender != e.buyer) revert NotBuyer();
        if (e.state != State.Pending) revert WrongState();
        e.state = State.Released;
        _transfer(e, e.seller);
        emit EscrowReleased(id);
    }

    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (msg.sender != e.seller) revert NotSeller();
        if (e.state != State.Pending) revert WrongState();
        e.state = State.Refunded;
        _transfer(e, e.buyer);
        emit EscrowRefunded(id);
    }

    function claimExpired(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.Pending) revert WrongState();
        if (block.timestamp < e.deadline) revert DeadlineNotReached();
        e.state = State.Refunded;
        _transfer(e, e.buyer);
        emit EscrowRefunded(id);
    }

    function _transfer(Escrow storage e, address to) internal {
        if (address(e.token) == address(0)) {
            (bool ok,) = to.call{value: e.amount}("");
            require(ok, "ETH failed");
        } else {
            e.token.safeTransfer(to, e.amount);
        }
    }
}`,

  // ── 39. SubscriptionManager ─────────────────────────────────────────────────
  "block67/payments/SubscriptionManager.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SubscriptionManager
/// @notice Recurring ERC-20 payment subscriptions with on-chain tracking.
contract SubscriptionManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Plan {
        uint256 price;       // per period in token units
        uint256 period;      // period in seconds
        bool    active;
    }

    struct Subscription {
        uint256 planId;
        uint256 validUntil;
        bool    active;
    }

    IERC20  public immutable paymentToken;
    address public treasury;

    Plan[]  public plans;
    mapping(address => Subscription) public subscriptions;

    event PlanCreated(uint256 indexed planId, uint256 price, uint256 period);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 validUntil);
    event SubscriptionCancelled(address indexed user);

    constructor(IERC20 paymentToken_, address treasury_, address owner_) Ownable(owner_) {
        paymentToken = paymentToken_;
        treasury     = treasury_;
    }

    function addPlan(uint256 price, uint256 period) external onlyOwner returns (uint256 id) {
        id = plans.length;
        plans.push(Plan(price, period, true));
        emit PlanCreated(id, price, period);
    }

    function subscribe(uint256 planId) external nonReentrant {
        Plan storage plan = plans[planId];
        require(plan.active, "Plan inactive");
        paymentToken.safeTransferFrom(msg.sender, treasury, plan.price);
        Subscription storage sub = subscriptions[msg.sender];
        uint256 start = (sub.active && sub.validUntil > block.timestamp) ? sub.validUntil : block.timestamp;
        sub.planId     = planId;
        sub.validUntil = start + plan.period;
        sub.active     = true;
        emit Subscribed(msg.sender, planId, sub.validUntil);
    }

    function cancel() external {
        subscriptions[msg.sender].active = false;
        emit SubscriptionCancelled(msg.sender);
    }

    function isActive(address user) external view returns (bool) {
        Subscription storage sub = subscriptions[user];
        return sub.active && sub.validUntil > block.timestamp;
    }

    function setPlanActive(uint256 planId, bool active) external onlyOwner { plans[planId].active = active; }
    function setTreasury(address t) external onlyOwner { treasury = t; }
}`,

  // ── 40. TipJar ──────────────────────────────────────────────────────────────
  "block67/payments/TipJar.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TipJar
/// @notice Accept ETH and ERC-20 tips with optional message.
contract TipJar is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Tip {
        address tipper;
        uint256 amount;
        address token;    // address(0) = ETH
        string  message;
        uint256 timestamp;
    }

    Tip[] public tips;
    uint256 public totalETHReceived;
    mapping(address => uint256) public totalERC20Received;

    event TipReceived(address indexed tipper, uint256 amount, address token, string message);
    event Withdrawn(address token, uint256 amount);

    constructor(address owner_) Ownable(owner_) {}

    function tipETH(string calldata message) external payable nonReentrant {
        require(msg.value > 0, "No ETH sent");
        totalETHReceived += msg.value;
        tips.push(Tip(msg.sender, msg.value, address(0), message, block.timestamp));
        emit TipReceived(msg.sender, msg.value, address(0), message);
    }

    function tipERC20(IERC20 token, uint256 amount, string calldata message) external nonReentrant {
        token.safeTransferFrom(msg.sender, address(this), amount);
        totalERC20Received[address(token)] += amount;
        tips.push(Tip(msg.sender, amount, address(token), message, block.timestamp));
        emit TipReceived(msg.sender, amount, address(token), message);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        (bool ok,) = owner().call{value: bal}("");
        require(ok, "ETH withdraw failed");
        emit Withdrawn(address(0), bal);
    }

    function withdrawERC20(IERC20 token) external onlyOwner nonReentrant {
        uint256 bal = token.balanceOf(address(this));
        token.safeTransfer(owner(), bal);
        emit Withdrawn(address(token), bal);
    }

    function tipCount() external view returns (uint256) { return tips.length; }
    receive() external payable { totalETHReceived += msg.value; }
}`,
};
