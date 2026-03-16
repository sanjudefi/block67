// Block67 Component Library — DeFi (8 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const DEFI: Record<string, string> = {

  // ── 23. StakingPool ─────────────────────────────────────────────────────────
  "block67/defi/StakingPool.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title StakingPool
/// @notice Stake tokens and earn proportional rewards over time.
contract StakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakeToken;
    IERC20 public immutable rewardToken;

    uint256 public rewardRate;          // reward tokens per second
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalStaked;

    mapping(address => uint256) public staked;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRateSet(uint256 rate);

    constructor(
        IERC20  stakeToken_,
        IERC20  rewardToken_,
        uint256 rewardRate_,
        address owner_
    ) Ownable(owner_) {
        stakeToken  = stakeToken_;
        rewardToken = rewardToken_;
        rewardRate  = rewardRate_;
    }

    modifier updateReward(address user) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime       = block.timestamp;
        if (user != address(0)) {
            rewards[user]               = earned(user);
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
        totalStaked        += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0 && staked[msg.sender] >= amount, "Invalid amount");
        staked[msg.sender] -= amount;
        totalStaked        -= amount;
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

    function setRewardRate(uint256 rate) external onlyOwner updateReward(address(0)) {
        rewardRate = rate;
        emit RewardRateSet(rate);
    }

    function fundRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}`,

  // ── 24. LiquidityPool ───────────────────────────────────────────────────────
  "block67/defi/LiquidityPool.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title LiquidityPool
/// @notice Simple constant-product AMM (x * y = k). LP tokens represent share.
contract LiquidityPool is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public constant FEE_BPS = 30; // 0.3%

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpBurned);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    error InsufficientLiquidity();
    error InvalidAmounts();

    constructor(IERC20 token0_, IERC20 token1_)
        ERC20("Block67 LP", "B67-LP")
    {
        token0 = token0_;
        token1 = token1_;
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external nonReentrant returns (uint256 lp) {
        if (amount0 == 0 || amount1 == 0) revert InvalidAmounts();
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);
        uint256 supply = totalSupply();
        lp = supply == 0
            ? Math.sqrt(amount0 * amount1)
            : Math.min((amount0 * supply) / reserve0, (amount1 * supply) / reserve1);
        reserve0 += amount0;
        reserve1 += amount1;
        _mint(msg.sender, lp);
        emit LiquidityAdded(msg.sender, amount0, amount1, lp);
    }

    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 out0, uint256 out1) {
        uint256 supply = totalSupply();
        out0 = (lpAmount * reserve0) / supply;
        out1 = (lpAmount * reserve1) / supply;
        if (out0 == 0 || out1 == 0) revert InsufficientLiquidity();
        _burn(msg.sender, lpAmount);
        reserve0 -= out0;
        reserve1 -= out1;
        token0.safeTransfer(msg.sender, out0);
        token1.safeTransfer(msg.sender, out1);
        emit LiquidityRemoved(msg.sender, out0, out1, lpAmount);
    }

    function swap(address tokenIn, uint256 amountIn) external nonReentrant returns (uint256 amountOut) {
        bool isToken0 = tokenIn == address(token0);
        (IERC20 tIn, IERC20 tOut, uint256 rIn, uint256 rOut) = isToken0
            ? (token0, token1, reserve0, reserve1)
            : (token1, token0, reserve1, reserve0);
        tIn.safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 amountInWithFee = amountIn * (10_000 - FEE_BPS);
        amountOut = (amountInWithFee * rOut) / (rIn * 10_000 + amountInWithFee);
        if (isToken0) { reserve0 += amountIn; reserve1 -= amountOut; }
        else          { reserve1 += amountIn; reserve0 -= amountOut; }
        tOut.safeTransfer(msg.sender, amountOut);
        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    function getPrice(address tokenIn) external view returns (uint256) {
        return tokenIn == address(token0)
            ? (reserve1 * 1e18) / reserve0
            : (reserve0 * 1e18) / reserve1;
    }
}`,

  // ── 25. YieldFarm ───────────────────────────────────────────────────────────
  "block67/defi/YieldFarm.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title YieldFarm
/// @notice Multi-pool yield farming with reward multipliers per pool.
contract YieldFarm is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        IERC20  lpToken;
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
    }

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    IERC20  public immutable rewardToken;
    uint256 public rewardPerSecond;
    uint256 public totalAllocPoint;

    PoolInfo[] public pools;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    event Deposited(uint256 indexed pid, address indexed user, uint256 amount);
    event Withdrawn(uint256 indexed pid, address indexed user, uint256 amount);
    event Harvested(uint256 indexed pid, address indexed user, uint256 reward);

    constructor(IERC20 rewardToken_, uint256 rewardPerSecond_, address owner_) Ownable(owner_) {
        rewardToken      = rewardToken_;
        rewardPerSecond  = rewardPerSecond_;
    }

    function addPool(IERC20 lpToken, uint256 allocPoint) external onlyOwner {
        massUpdatePools();
        totalAllocPoint += allocPoint;
        pools.push(PoolInfo({ lpToken: lpToken, allocPoint: allocPoint, lastRewardTime: block.timestamp, accRewardPerShare: 0 }));
    }

    function massUpdatePools() public {
        for (uint256 pid; pid < pools.length; ++pid) updatePool(pid);
    }

    function updatePool(uint256 pid) public {
        PoolInfo storage pool = pools[pid];
        if (block.timestamp <= pool.lastRewardTime) return;
        uint256 supply = pool.lpToken.balanceOf(address(this));
        if (supply > 0) {
            uint256 reward = (block.timestamp - pool.lastRewardTime) * rewardPerSecond * pool.allocPoint / totalAllocPoint;
            pool.accRewardPerShare += (reward * 1e12) / supply;
        }
        pool.lastRewardTime = block.timestamp;
    }

    function deposit(uint256 pid, uint256 amount) external nonReentrant {
        PoolInfo storage pool = pools[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        updatePool(pid);
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) rewardToken.safeTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
        user.amount    += amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Deposited(pid, msg.sender, amount);
    }

    function withdraw(uint256 pid, uint256 amount) external nonReentrant {
        PoolInfo storage pool = pools[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        require(user.amount >= amount, "Insufficient");
        updatePool(pid);
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        user.amount    -= amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        if (pending > 0) rewardToken.safeTransfer(msg.sender, pending);
        pool.lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(pid, msg.sender, amount);
    }

    function harvest(uint256 pid) external nonReentrant {
        PoolInfo storage pool = pools[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        updatePool(pid);
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        if (pending > 0) rewardToken.safeTransfer(msg.sender, pending);
        emit Harvested(pid, msg.sender, pending);
    }

    function setRewardPerSecond(uint256 r) external onlyOwner { massUpdatePools(); rewardPerSecond = r; }
    function poolLength() external view returns (uint256) { return pools.length; }
}`,

  // ── 26. TokenVesting ────────────────────────────────────────────────────────
  "block67/defi/TokenVesting.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenVesting
/// @notice Cliff + linear token vesting with revocability.
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    struct Schedule {
        uint256 total;
        uint256 released;
        uint64  cliff;
        uint64  start;
        uint64  duration;
        bool    revocable;
        bool    revoked;
    }

    mapping(address => Schedule) public schedules;

    event ScheduleCreated(address indexed beneficiary, uint256 total);
    event Released(address indexed beneficiary, uint256 amount);
    event Revoked(address indexed beneficiary);

    constructor(IERC20 token_, address owner_) Ownable(owner_) { token = token_; }

    function create(
        address beneficiary,
        uint256 totalAmount,
        uint64  start,
        uint64  cliffDuration,
        uint64  totalDuration,
        bool    revocable
    ) external onlyOwner {
        require(schedules[beneficiary].total == 0, "Already exists");
        require(totalDuration >= cliffDuration, "Cliff > duration");
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        schedules[beneficiary] = Schedule(totalAmount, 0, start + cliffDuration, start, totalDuration, revocable, false);
        emit ScheduleCreated(beneficiary, totalAmount);
    }

    function release(address beneficiary) external nonReentrant {
        Schedule storage s = schedules[beneficiary];
        require(!s.revoked, "Revoked");
        uint256 releasable = _vested(s) - s.released;
        require(releasable > 0, "Nothing to release");
        s.released += releasable;
        token.safeTransfer(beneficiary, releasable);
        emit Released(beneficiary, releasable);
    }

    function revoke(address beneficiary) external onlyOwner nonReentrant {
        Schedule storage s = schedules[beneficiary];
        require(s.revocable && !s.revoked, "Cannot revoke");
        uint256 unvested = s.total - _vested(s);
        s.revoked = true;
        token.safeTransfer(owner(), unvested);
        emit Revoked(beneficiary);
    }

    function releasable(address beneficiary) external view returns (uint256) {
        Schedule storage s = schedules[beneficiary];
        return _vested(s) - s.released;
    }

    function _vested(Schedule storage s) internal view returns (uint256) {
        if (s.revoked || block.timestamp < s.cliff) return 0;
        if (block.timestamp >= s.start + s.duration) return s.total;
        return (s.total * (block.timestamp - s.start)) / s.duration;
    }
}`,

  // ── 27. PriceOracle ─────────────────────────────────────────────────────────
  "block67/defi/PriceOracle.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PriceOracle
/// @notice Simple push-based on-chain price oracle with staleness guard.
contract PriceOracle is Ownable {
    struct Price {
        uint256 value;     // price in USD with 8 decimals
        uint256 updatedAt;
    }

    mapping(address => Price) public prices;
    uint256 public maxStaleness = 1 hours;

    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event MaxStalenessUpdated(uint256 seconds_);

    error StalePrice();
    error PriceNotSet();

    constructor(address owner_) Ownable(owner_) {}

    function updatePrice(address token, uint256 price) external onlyOwner {
        prices[token] = Price(price, block.timestamp);
        emit PriceUpdated(token, price, block.timestamp);
    }

    function updatePriceBatch(address[] calldata tokens, uint256[] calldata priceValues) external onlyOwner {
        require(tokens.length == priceValues.length, "Length mismatch");
        for (uint256 i; i < tokens.length; ++i) {
            prices[tokens[i]] = Price(priceValues[i], block.timestamp);
            emit PriceUpdated(tokens[i], priceValues[i], block.timestamp);
        }
    }

    function getPrice(address token) external view returns (uint256 price, uint256 updatedAt) {
        Price memory p = prices[token];
        if (p.value == 0)                                   revert PriceNotSet();
        if (block.timestamp - p.updatedAt > maxStaleness)   revert StalePrice();
        return (p.value, p.updatedAt);
    }

    function setMaxStaleness(uint256 s) external onlyOwner {
        maxStaleness = s;
        emit MaxStalenessUpdated(s);
    }
}`,

  // ── 28. TokenLocker ─────────────────────────────────────────────────────────
  "block67/defi/TokenLocker.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenLocker
/// @notice Time-locked ERC-20 storage — useful for LP locks, team vesting.
contract TokenLocker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address owner;
        IERC20  token;
        uint256 amount;
        uint256 unlockTime;
        bool    withdrawn;
    }

    uint256 public lockCount;
    mapping(uint256 => Lock) public locks;

    event LockCreated(uint256 indexed lockId, address indexed owner, address token, uint256 amount, uint256 unlockTime);
    event LockWithdrawn(uint256 indexed lockId, address indexed owner, uint256 amount);

    error NotUnlocked();
    error NotOwner();
    error AlreadyWithdrawn();

    function lock(IERC20 token, uint256 amount, uint256 unlockTime) external nonReentrant returns (uint256 lockId) {
        require(unlockTime > block.timestamp, "Unlock must be in future");
        token.safeTransferFrom(msg.sender, address(this), amount);
        lockId = lockCount++;
        locks[lockId] = Lock(msg.sender, token, amount, unlockTime, false);
        emit LockCreated(lockId, msg.sender, address(token), amount, unlockTime);
    }

    function withdraw(uint256 lockId) external nonReentrant {
        Lock storage l = locks[lockId];
        if (msg.sender != l.owner)        revert NotOwner();
        if (block.timestamp < l.unlockTime) revert NotUnlocked();
        if (l.withdrawn)                  revert AlreadyWithdrawn();
        l.withdrawn = true;
        l.token.safeTransfer(l.owner, l.amount);
        emit LockWithdrawn(lockId, l.owner, l.amount);
    }
}`,

  // ── 29. RewardDistributor ───────────────────────────────────────────────────
  "block67/defi/RewardDistributor.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RewardDistributor
/// @notice Merkle-tree-based reward distribution (gas-efficient airdrops).
contract RewardDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20  public immutable token;
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    event RootUpdated(bytes32 root);
    event Claimed(address indexed account, uint256 amount);

    error AlreadyClaimed();
    error InvalidProof();

    constructor(IERC20 token_, bytes32 root_, address owner_) Ownable(owner_) {
        token      = token_;
        merkleRoot = root_;
    }

    function claim(uint256 amount, bytes32[] calldata proof) external nonReentrant {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();
        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function setRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit RootUpdated(root);
    }

    function fund(uint256 amount) external onlyOwner {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function sweep(address to) external onlyOwner {
        token.safeTransfer(to, token.balanceOf(address(this)));
    }
}`,

  // ── 30. FeeCollector ────────────────────────────────────────────────────────
  "block67/defi/FeeCollector.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FeeCollector
/// @notice Protocol fee accumulator — collects ETH / ERC-20 fees and distributes them.
contract FeeCollector is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public feeBps = 100; // 1%
    address public feeRecipient;

    mapping(address => uint256) public accumulatedFees; // token => total

    event FeeCollected(address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);
    event FeeRecipientUpdated(address recipient);

    constructor(address feeRecipient_, address owner_) Ownable(owner_) {
        feeRecipient = feeRecipient_;
    }

    /// @notice Calculate and collect fee. Returns net amount.
    function collectFee(IERC20 token, uint256 grossAmount) external nonReentrant returns (uint256 netAmount) {
        uint256 fee = (grossAmount * feeBps) / 10_000;
        netAmount   = grossAmount - fee;
        token.safeTransferFrom(msg.sender, address(this), fee);
        accumulatedFees[address(token)] += fee;
        emit FeeCollected(address(token), fee);
    }

    /// @notice Collect ETH fee inline (call with msg.value = gross).
    function collectETHFee() external payable nonReentrant returns (uint256 netAmount) {
        uint256 fee = (msg.value * feeBps) / 10_000;
        netAmount   = msg.value - fee;
        accumulatedFees[address(0)] += fee;
        emit FeeCollected(address(0), fee);
        // Return net ETH to caller
        (bool ok,) = msg.sender.call{value: netAmount}("");
        require(ok, "ETH return failed");
    }

    function withdrawFees(IERC20 token) external nonReentrant {
        uint256 amount = accumulatedFees[address(token)];
        accumulatedFees[address(token)] = 0;
        token.safeTransfer(feeRecipient, amount);
        emit FeesWithdrawn(address(token), feeRecipient, amount);
    }

    function withdrawETHFees() external nonReentrant {
        uint256 amount = accumulatedFees[address(0)];
        accumulatedFees[address(0)] = 0;
        (bool ok,) = feeRecipient.call{value: amount}("");
        require(ok, "ETH withdraw failed");
        emit FeesWithdrawn(address(0), feeRecipient, amount);
    }

    function setFeeBps(uint256 bps) external onlyOwner { require(bps <= 1000, "Max 10%"); feeBps = bps; }
    function setFeeRecipient(address r) external onlyOwner { feeRecipient = r; emit FeeRecipientUpdated(r); }

    receive() external payable {}
}`,
};
