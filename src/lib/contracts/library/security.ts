// Block67 Component Library — Security (5 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const SECURITY: Record<string, string> = {

  // ── 31. OwnableAccess ───────────────────────────────────────────────────────
  "block67/security/OwnableAccess.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title OwnableAccess
/// @notice Two-step ownership transfer to prevent accidental owner loss.
contract OwnableAccess is Ownable2Step {
    constructor(address owner_) Ownable(owner_) {}

    /// @notice Check that msg.sender is the owner; revert otherwise.
    modifier onlyAuthorized() {
        _checkOwner();
        _;
    }
}`,

  // ── 32. RoleBasedAccess ─────────────────────────────────────────────────────
  "block67/security/RoleBasedAccess.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleBasedAccess
/// @notice Granular role-based access control with pre-defined protocol roles.
contract RoleBasedAccess is AccessControl {
    bytes32 public constant ADMIN_ROLE    = DEFAULT_ADMIN_ROLE;
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    constructor(address admin) {
        _grantRole(ADMIN_ROLE,    admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(MINTER_ROLE,   admin);
        _grantRole(PAUSER_ROLE,   admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    function grantOperator(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(OPERATOR_ROLE, account);
    }

    function revokeOperator(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(OPERATOR_ROLE, account);
    }
}`,

  // ── 33. MultiSigSecurity ────────────────────────────────────────────────────
  "block67/security/MultiSigSecurity.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MultiSigSecurity
/// @notice On-chain multi-signature approval guard for sensitive operations.
contract MultiSigSecurity {
    address[] public signers;
    uint256   public threshold;

    mapping(bytes32 => mapping(address => bool)) public approvals;
    mapping(bytes32 => uint256)                  public approvalCount;
    mapping(bytes32 => bool)                     public executed;

    event OperationApproved(bytes32 indexed opId, address indexed signer);
    event OperationExecuted(bytes32 indexed opId);
    event SignerAdded(address indexed signer);
    event ThresholdUpdated(uint256 threshold);

    error NotSigner();
    error AlreadyApproved();
    error AlreadyExecuted();
    error ThresholdNotMet();

    modifier onlySigner() {
        if (!isSigner(msg.sender)) revert NotSigner();
        _;
    }

    constructor(address[] memory signers_, uint256 threshold_) {
        require(threshold_ <= signers_.length && threshold_ > 0, "Invalid threshold");
        signers   = signers_;
        threshold = threshold_;
    }

    function isSigner(address account) public view returns (bool) {
        for (uint256 i; i < signers.length; ++i) if (signers[i] == account) return true;
        return false;
    }

    function approve(bytes32 opId) external onlySigner {
        if (approvals[opId][msg.sender]) revert AlreadyApproved();
        if (executed[opId])              revert AlreadyExecuted();
        approvals[opId][msg.sender] = true;
        approvalCount[opId]++;
        emit OperationApproved(opId, msg.sender);
    }

    function isApproved(bytes32 opId) public view returns (bool) {
        return approvalCount[opId] >= threshold;
    }

    function markExecuted(bytes32 opId) internal {
        if (!isApproved(opId)) revert ThresholdNotMet();
        executed[opId] = true;
        emit OperationExecuted(opId);
    }

    function operationId(address target, bytes memory data, uint256 salt)
        public pure returns (bytes32)
    {
        return keccak256(abi.encode(target, data, salt));
    }
}`,

  // ── 34. ReentrancyProtection ────────────────────────────────────────────────
  "block67/security/ReentrancyProtection.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReentrancyProtection
/// @notice Combines ReentrancyGuard + Pausable for maximum security.
abstract contract ReentrancyProtection is ReentrancyGuard, Pausable, Ownable {
    constructor(address owner_) Ownable(owner_) {}

    /// @notice Pause the contract in an emergency.
    function pause() external onlyOwner { _pause(); }

    /// @notice Resume normal operation.
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Combined guard: non-reentrant + not-paused.
    modifier safeOperation() {
        _requireNotPaused();
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }
}`,

  // ── 35. PauseControl ────────────────────────────────────────────────────────
  "block67/security/PauseControl.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PauseControl
/// @notice Role-based emergency pause with granular per-function control.
contract PauseControl is Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Per-function pause flags
    mapping(bytes4 => bool) public functionPaused;

    event FunctionPaused(bytes4 selector, bool paused);

    modifier whenFunctionNotPaused(bytes4 selector) {
        require(!functionPaused[selector], "Function paused");
        _;
    }

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE,        admin);
        _grantRole(MANAGER_ROLE,       admin);
    }

    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(MANAGER_ROLE) { _unpause(); }

    function setFunctionPaused(bytes4 selector, bool paused) external onlyRole(PAUSER_ROLE) {
        functionPaused[selector] = paused;
        emit FunctionPaused(selector, paused);
    }
}`,
};
