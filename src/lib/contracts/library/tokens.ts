// Block67 Component Library — Tokens (8 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const TOKENS: Record<string, string> = {

  // ── 1. ERC20Base ────────────────────────────────────────────────────────────
  "block67/tokens/ERC20Base.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20Base
/// @notice Standard ERC-20 token with initial supply minted to owner.
contract ERC20Base is ERC20, Ownable {
    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        address        owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        _mint(owner_, initialSupply * 10 ** decimals());
    }
}`,

  // ── 2. ERC20Mintable ────────────────────────────────────────────────────────
  "block67/tokens/ERC20Mintable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20Mintable
/// @notice ERC-20 token that the owner can mint additional supply.
contract ERC20Mintable is ERC20, Ownable {
    uint256 public maxSupply;

    error MaxSupplyExceeded();

    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        uint256        maxSupply_,
        address        owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        maxSupply = maxSupply_ == 0 ? type(uint256).max : maxSupply_ * 10 ** decimals();
        _mint(owner_, initialSupply * 10 ** decimals());
    }

    /// @notice Mint new tokens (owner only).
    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}`,

  // ── 3. ERC20Burnable ────────────────────────────────────────────────────────
  "block67/tokens/ERC20Burnable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20BurnableToken
/// @notice ERC-20 token where holders can burn their own tokens.
contract ERC20BurnableToken is ERC20, ERC20Burnable, Ownable {
    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        address        owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        _mint(owner_, initialSupply * 10 ** decimals());
    }

    /// @notice Owner can also mint.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}`,

  // ── 4. ERC20Capped ──────────────────────────────────────────────────────────
  "block67/tokens/ERC20Capped.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20CappedToken
/// @notice ERC-20 with a hard-coded maximum supply cap.
contract ERC20CappedToken is ERC20Capped, Ownable {
    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        cap_,
        address        owner_
    ) ERC20(name_, symbol_) ERC20Capped(cap_ * 10 ** 18) Ownable(owner_) {
        _mint(owner_, cap_ * 10 ** 18);
    }
}`,

  // ── 5. ERC20VotesToken ──────────────────────────────────────────────────────
  "block67/tokens/ERC20VotesToken.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20VotesToken
/// @notice ERC-20 with on-chain voting power for DAO governance.
contract ERC20VotesToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
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

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Required overrides
    function _update(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes)
    { super._update(from, to, amount); }

    function nonces(address owner_)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    { return super.nonces(owner_); }
}`,

  // ── 6. ERC20Taxable ─────────────────────────────────────────────────────────
  "block67/tokens/ERC20Taxable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20Taxable
/// @notice ERC-20 with a configurable transfer tax sent to a treasury.
contract ERC20Taxable is ERC20, Ownable {
    uint256 public taxBps;      // basis points (100 = 1%)
    address public treasury;
    bool    public taxEnabled   = true;

    mapping(address => bool) public isExcluded;

    event TaxUpdated(uint256 bps);
    event TreasuryUpdated(address treasury);

    error TaxTooHigh();

    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        uint256        taxBps_,
        address        treasury_,
        address        owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        if (taxBps_ > 1000) revert TaxTooHigh(); // max 10%
        taxBps   = taxBps_;
        treasury = treasury_;
        isExcluded[owner_]   = true;
        isExcluded[treasury] = true;
        _mint(owner_, initialSupply * 10 ** decimals());
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (taxEnabled && !isExcluded[from] && !isExcluded[to] && taxBps > 0) {
            uint256 tax = (amount * taxBps) / 10_000;
            super._update(from, treasury, tax);
            super._update(from, to, amount - tax);
        } else {
            super._update(from, to, amount);
        }
    }

    function setTax(uint256 bps) external onlyOwner {
        if (bps > 1000) revert TaxTooHigh();
        taxBps = bps;
        emit TaxUpdated(bps);
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
        emit TreasuryUpdated(t);
    }

    function setTaxEnabled(bool v) external onlyOwner { taxEnabled = v; }
    function excludeFromTax(address a, bool v) external onlyOwner { isExcluded[a] = v; }
}`,

  // ── 7. ERC20Vesting ─────────────────────────────────────────────────────────
  "block67/tokens/ERC20Vesting.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ERC20Vesting
/// @notice Linear vesting schedule with optional cliff for any ERC-20 token.
contract ERC20Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        uint256 total;
        uint256 released;
        uint64  start;
        uint64  cliff;
        uint64  duration;
        bool    revocable;
        bool    revoked;
    }

    IERC20  public immutable token;
    mapping(address => VestingSchedule) public schedules;

    event ScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event ScheduleRevoked(address indexed beneficiary, uint256 returned);

    error ScheduleAlreadyExists();
    error NoSchedule();
    error NothingToRelease();
    error NotRevocable();
    error AlreadyRevoked();

    constructor(IERC20 token_, address owner_) Ownable(owner_) {
        token = token_;
    }

    function createSchedule(
        address beneficiary,
        uint256 amount,
        uint64  start,
        uint64  cliff,
        uint64  duration,
        bool    revocable
    ) external onlyOwner {
        if (schedules[beneficiary].total != 0) revert ScheduleAlreadyExists();
        token.safeTransferFrom(msg.sender, address(this), amount);
        schedules[beneficiary] = VestingSchedule(amount, 0, start, cliff, duration, revocable, false);
        emit ScheduleCreated(beneficiary, amount);
    }

    function release(address beneficiary) external nonReentrant {
        VestingSchedule storage s = schedules[beneficiary];
        if (s.total == 0) revert NoSchedule();
        uint256 releasable = _vestedAmount(s) - s.released;
        if (releasable == 0) revert NothingToRelease();
        s.released += releasable;
        token.safeTransfer(beneficiary, releasable);
        emit TokensReleased(beneficiary, releasable);
    }

    function revoke(address beneficiary) external onlyOwner nonReentrant {
        VestingSchedule storage s = schedules[beneficiary];
        if (!s.revocable) revert NotRevocable();
        if (s.revoked)    revert AlreadyRevoked();
        uint256 vested    = _vestedAmount(s);
        uint256 remaining = s.total - vested;
        s.revoked = true;
        if (remaining > 0) token.safeTransfer(owner(), remaining);
        emit ScheduleRevoked(beneficiary, remaining);
    }

    function vestedAmount(address beneficiary) external view returns (uint256) {
        return _vestedAmount(schedules[beneficiary]);
    }

    function _vestedAmount(VestingSchedule storage s) internal view returns (uint256) {
        if (s.revoked || block.timestamp < s.start + s.cliff) return 0;
        if (block.timestamp >= s.start + s.duration) return s.total;
        return (s.total * (block.timestamp - s.start)) / s.duration;
    }
}`,

  // ── 8. ERC20Permit ──────────────────────────────────────────────────────────
  "block67/tokens/ERC20PermitToken.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20PermitToken
/// @notice ERC-20 with EIP-2612 gasless approvals.
contract ERC20PermitToken is ERC20, ERC20Permit, Ownable {
    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        initialSupply,
        address        owner_
    ) ERC20(name_, symbol_) ERC20Permit(name_) Ownable(owner_) {
        _mint(owner_, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function nonces(address owner_)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    { return super.nonces(owner_); }
}`,
};
