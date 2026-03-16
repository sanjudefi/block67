// Block67 Component Library — Infrastructure (5 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const INFRASTRUCTURE: Record<string, string> = {

  // ── 46. ContractFactory ─────────────────────────────────────────────────────
  "block67/infrastructure/ContractFactory.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ContractFactory
/// @notice Deploy arbitrary contracts from bytecode using CREATE2 for deterministic addresses.
contract ContractFactory is Ownable {
    event Deployed(address indexed deployed, bytes32 indexed salt);

    constructor(address owner_) Ownable(owner_) {}

    /// @notice Deploy a contract with CREATE2 for a deterministic address.
    function deploy(bytes memory bytecode, bytes32 salt) external onlyOwner returns (address deployed) {
        assembly {
            deployed := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(deployed != address(0), "Deploy failed");
        emit Deployed(deployed, salt);
    }

    /// @notice Deploy and call an initializer in one transaction.
    function deployAndInit(bytes memory bytecode, bytes32 salt, bytes memory initData) external onlyOwner returns (address deployed) {
        assembly {
            deployed := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(deployed != address(0), "Deploy failed");
        (bool ok,) = deployed.call(initData);
        require(ok, "Init failed");
        emit Deployed(deployed, salt);
    }

    /// @notice Predict the address of a future CREATE2 deployment.
    function predictAddress(bytes memory bytecode, bytes32 salt) external view returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode)));
        return address(uint160(uint256(hash)));
    }
}`,

  // ── 47. UpgradeableProxy ────────────────────────────────────────────────────
  "block67/infrastructure/UpgradeableProxy.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title UpgradeableBase
/// @notice UUPS-upgradeable contract base. Inherit this in your implementation contract.
abstract contract UpgradeableBase is UUPSUpgradeable, Ownable {
    constructor(address owner_) Ownable(owner_) {}

    /// @dev Only owner can authorize upgrades.
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}
}

/// @title UpgradeableProxy
/// @notice ERC-1967 proxy shell. Pass implementation address + init data.
contract UpgradeableProxy is ERC1967Proxy {
    constructor(address implementation, bytes memory initData)
        ERC1967Proxy(implementation, initData)
    {}
}`,

  // ── 48. MultiSigWallet ──────────────────────────────────────────────────────
  "block67/infrastructure/MultiSigWallet.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MultiSigWallet
/// @notice M-of-N multi-signature wallet for ETH and ERC-20 transactions.
contract MultiSigWallet is ReentrancyGuard {
    struct Transaction {
        address to;
        uint256 value;
        bytes   data;
        bool    executed;
        uint256 confirmations;
    }

    address[] public owners;
    uint256   public required;
    Transaction[] public transactions;

    mapping(uint256 => mapping(address => bool)) public confirmed;

    event Submitted(uint256 indexed txId);
    event Confirmed(uint256 indexed txId, address indexed owner);
    event Revoked(uint256 indexed txId, address indexed owner);
    event Executed(uint256 indexed txId);
    event Deposit(address indexed sender, uint256 amount);

    error NotOwner();
    error AlreadyConfirmed();
    error NotConfirmed();
    error AlreadyExecuted();
    error ExecutionFailed();

    modifier onlyOwner() {
        bool found;
        for (uint256 i; i < owners.length; ++i) if (owners[i] == msg.sender) { found = true; break; }
        if (!found) revert NotOwner();
        _;
    }

    constructor(address[] memory owners_, uint256 required_) {
        require(owners_.length > 0 && required_ > 0 && required_ <= owners_.length, "Invalid params");
        owners   = owners_;
        required = required_;
    }

    receive() external payable { emit Deposit(msg.sender, msg.value); }

    function submit(address to, uint256 value, bytes calldata data) external onlyOwner returns (uint256 txId) {
        txId = transactions.length;
        transactions.push(Transaction(to, value, data, false, 0));
        emit Submitted(txId);
    }

    function confirm(uint256 txId) external onlyOwner {
        if (confirmed[txId][msg.sender]) revert AlreadyConfirmed();
        confirmed[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        emit Confirmed(txId, msg.sender);
    }

    function revoke(uint256 txId) external onlyOwner {
        if (!confirmed[txId][msg.sender]) revert NotConfirmed();
        if (transactions[txId].executed)  revert AlreadyExecuted();
        confirmed[txId][msg.sender] = false;
        transactions[txId].confirmations--;
        emit Revoked(txId, msg.sender);
    }

    function execute(uint256 txId) external nonReentrant onlyOwner {
        Transaction storage t = transactions[txId];
        if (t.executed)                    revert AlreadyExecuted();
        if (t.confirmations < required)    revert NotOwner();
        t.executed = true;
        (bool ok,) = t.to.call{value: t.value}(t.data);
        if (!ok) revert ExecutionFailed();
        emit Executed(txId);
    }

    function ownerCount()      external view returns (uint256) { return owners.length; }
    function transactionCount() external view returns (uint256) { return transactions.length; }
}`,

  // ── 49. EventEmitter ────────────────────────────────────────────────────────
  "block67/infrastructure/EventEmitter.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EventEmitter
/// @notice Centralised on-chain event bus for off-chain indexers.
contract EventEmitter is AccessControl {
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");

    event Log(address indexed source, string indexed topic, bytes data, uint256 timestamp);
    event LogString(address indexed source, string topic, string message);
    event LogUint(address indexed source, string topic, uint256 value);
    event LogAddress(address indexed source, string topic, address addr);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMITTER_ROLE, admin);
    }

    function log(string calldata topic, bytes calldata data) external onlyRole(EMITTER_ROLE) {
        emit Log(msg.sender, topic, data, block.timestamp);
    }

    function logString(string calldata topic, string calldata message) external onlyRole(EMITTER_ROLE) {
        emit LogString(msg.sender, topic, message);
    }

    function logUint(string calldata topic, uint256 value) external onlyRole(EMITTER_ROLE) {
        emit LogUint(msg.sender, topic, value);
    }

    function logAddress(string calldata topic, address addr) external onlyRole(EMITTER_ROLE) {
        emit LogAddress(msg.sender, topic, addr);
    }

    function grantEmitter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(EMITTER_ROLE, account);
    }
}`,

  // ── 50. EmergencyStop ───────────────────────────────────────────────────────
  "block67/infrastructure/EmergencyStop.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title EmergencyStop
/// @notice Circuit-breaker with escalating roles and asset recovery.
contract EmergencyStop is Pausable, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MANAGER_ROLE  = keccak256("MANAGER_ROLE");

    uint256 public emergencyCount;
    uint256 public lastEmergencyTime;

    event EmergencyActivated(address indexed by, string reason);
    event EmergencyResolved(address indexed by);
    event AssetRecovered(address indexed token, address indexed to, uint256 amount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    /// @notice Guardian can trigger emergency stop.
    function emergencyStop(string calldata reason) external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emergencyCount++;
        lastEmergencyTime = block.timestamp;
        emit EmergencyActivated(msg.sender, reason);
    }

    /// @notice Manager can resume operations.
    function resume() external onlyRole(MANAGER_ROLE) {
        _unpause();
        emit EmergencyResolved(msg.sender);
    }

    /// @notice Admin can recover accidentally sent tokens.
    function recoverERC20(IERC20 token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.safeTransfer(to, amount);
        emit AssetRecovered(address(token), to, amount);
    }

    /// @notice Admin can recover ETH.
    function recoverETH(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "ETH recovery failed");
        emit AssetRecovered(address(0), to, amount);
    }

    function grantGuardian(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(GUARDIAN_ROLE, account);
    }

    receive() external payable {}
}`,
};
