// Block67 Component Library — NFT (8 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const NFT: Record<string, string> = {

  // ── 9. ERC721Base ───────────────────────────────────────────────────────────
  "block67/nft/ERC721Base.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title ERC721Base
/// @notice Minimal ERC-721 NFT collection with base URI and counter.
contract ERC721Base is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextId = 1;
    string  private _baseUri;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_,
        address       owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        _baseUri = baseUri_;
    }

    function safeMint(address to) external onlyOwner returns (uint256 id) {
        id = _nextId++;
        _safeMint(to, id);
    }

    function totalMinted() external view returns (uint256) { return _nextId - 1; }
    function setBaseURI(string calldata uri) external onlyOwner { _baseUri = uri; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }
}`,

  // ── 10. ERC721Mintable ──────────────────────────────────────────────────────
  "block67/nft/ERC721Mintable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ERC721Mintable
/// @notice Public mint NFT with supply cap and ETH price.
contract ERC721Mintable is ERC721, Ownable, ReentrancyGuard {
    uint256 public immutable MAX_SUPPLY;
    uint256 public immutable MINT_PRICE;
    uint256 private _nextId = 1;
    bool    public  saleActive;
    string  private _baseUri;

    error SaleNotActive();
    error MaxSupplyReached();
    error InsufficientPayment();

    event SaleToggled(bool active);
    event Withdrawn(address to, uint256 amount);

    constructor(
        string  memory name_,
        string  memory symbol_,
        uint256        maxSupply_,
        uint256        mintPrice_,
        address        owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        MAX_SUPPLY = maxSupply_;
        MINT_PRICE = mintPrice_;
    }

    function mint(uint256 qty) external payable nonReentrant {
        if (!saleActive)                              revert SaleNotActive();
        if (msg.value < MINT_PRICE * qty)             revert InsufficientPayment();
        if (_nextId + qty - 1 > MAX_SUPPLY)           revert MaxSupplyReached();
        for (uint256 i; i < qty; ++i) _safeMint(msg.sender, _nextId++);
    }

    function ownerMint(address to, uint256 qty) external onlyOwner {
        if (_nextId + qty - 1 > MAX_SUPPLY) revert MaxSupplyReached();
        for (uint256 i; i < qty; ++i) _safeMint(to, _nextId++);
    }

    function setSaleActive(bool v) external onlyOwner { saleActive = v; emit SaleToggled(v); }
    function setBaseURI(string calldata u) external onlyOwner { _baseUri = u; }
    function totalMinted() external view returns (uint256) { return _nextId - 1; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok,) = payable(owner()).call{value: bal}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(owner(), bal);
    }
}`,

  // ── 11. ERC721Enumerable ────────────────────────────────────────────────────
  "block67/nft/ERC721Enumerable.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC721EnumerableToken
/// @notice ERC-721 with full enumeration support.
contract ERC721EnumerableToken is ERC721, ERC721Enumerable, Ownable {
    uint256 private _nextId = 1;
    string  private _baseUri;

    constructor(
        string memory name_,
        string memory symbol_,
        address       owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {}

    function safeMint(address to) external onlyOwner {
        _safeMint(to, _nextId++);
    }

    function tokensOfOwner(address owner_) external view returns (uint256[] memory) {
        uint256 bal = balanceOf(owner_);
        uint256[] memory ids = new uint256[](bal);
        for (uint256 i; i < bal; ++i) ids[i] = tokenOfOwnerByIndex(owner_, i);
        return ids;
    }

    function setBaseURI(string calldata u) external onlyOwner { _baseUri = u; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }

    // Required overrides
    function _update(address to, uint256 id, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    { return super._update(to, id, auth); }

    function _increaseBalance(address account, uint128 amount)
        internal override(ERC721, ERC721Enumerable)
    { super._increaseBalance(account, amount); }

    function supportsInterface(bytes4 id)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    { return super.supportsInterface(id); }
}`,

  // ── 12. ERC721URIStorage ────────────────────────────────────────────────────
  "block67/nft/ERC721URIStorage.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC721URIStorageToken
/// @notice ERC-721 with per-token metadata URIs stored on-chain.
contract ERC721URIStorageToken is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextId = 1;

    constructor(
        string memory name_,
        string memory symbol_,
        address       owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {}

    function safeMint(address to, string calldata uri) external onlyOwner returns (uint256 id) {
        id = _nextId++;
        _safeMint(to, id);
        _setTokenURI(id, uri);
    }

    function setTokenURI(uint256 id, string calldata uri) external onlyOwner {
        _setTokenURI(id, uri);
    }

    // Required overrides
    function tokenURI(uint256 id)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    { return super.tokenURI(id); }

    function supportsInterface(bytes4 id_)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    { return super.supportsInterface(id_); }
}`,

  // ── 13. ERC721Royalty ───────────────────────────────────────────────────────
  "block67/nft/ERC721Royalty.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC721RoyaltyToken
/// @notice ERC-721 NFT with EIP-2981 royalty standard.
contract ERC721RoyaltyToken is ERC721, ERC2981, Ownable {
    uint256 private _nextId = 1;
    string  private _baseUri;

    constructor(
        string  memory name_,
        string  memory symbol_,
        address        royaltyReceiver,
        uint96         royaltyBps,
        address        owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    function safeMint(address to) external onlyOwner returns (uint256 id) {
        id = _nextId++;
        _safeMint(to, id);
    }

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    function setTokenRoyalty(uint256 id, address receiver, uint96 bps) external onlyOwner {
        _setTokenRoyalty(id, receiver, bps);
    }

    function setBaseURI(string calldata u) external onlyOwner { _baseUri = u; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }

    function supportsInterface(bytes4 id)
        public view override(ERC721, ERC2981) returns (bool)
    { return super.supportsInterface(id); }
}`,

  // ── 14. ERC721Soulbound ─────────────────────────────────────────────────────
  "block67/nft/ERC721Soulbound.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC721Soulbound
/// @notice Non-transferable ERC-721 (soul-bound token / SBT).
/// @dev Transfers are blocked except mint (from zero) and burn (to zero).
contract ERC721Soulbound is ERC721, Ownable {
    uint256 private _nextId = 1;
    string  private _baseUri;

    error Soulbound();

    constructor(
        string memory name_,
        string memory symbol_,
        address       owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {}

    function issue(address to) external onlyOwner returns (uint256 id) {
        id = _nextId++;
        _safeMint(to, id);
    }

    function revoke(uint256 id) external onlyOwner {
        _burn(id);
    }

    function setBaseURI(string calldata u) external onlyOwner { _baseUri = u; }
    function _baseURI() internal view override returns (string memory) { return _baseUri; }

    function _update(address to, uint256 id, address auth)
        internal override returns (address from)
    {
        from = super._update(to, id, auth);
        // Allow mint (from == address(0)) and burn (to == address(0)), block everything else
        if (from != address(0) && to != address(0)) revert Soulbound();
    }
}`,

  // ── 15. ERC1155Base ─────────────────────────────────────────────────────────
  "block67/nft/ERC1155Base.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC1155Base
/// @notice Multi-token standard (fungible + non-fungible in one contract).
contract ERC1155Base is ERC1155, Ownable {
    string public name;
    string public symbol;
    mapping(uint256 => uint256) public totalSupply;

    event TokenMinted(address indexed to, uint256 indexed id, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        address       owner_
    ) ERC1155(uri_) Ownable(owner_) {
        name   = name_;
        symbol = symbol_;
    }

    function mint(address to, uint256 id, uint256 amount, bytes calldata data)
        external onlyOwner
    {
        _mint(to, id, amount, data);
        totalSupply[id] += amount;
        emit TokenMinted(to, id, amount);
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)
        external onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
        for (uint256 i; i < ids.length; ++i) totalSupply[ids[i]] += amounts[i];
    }

    function burn(address from, uint256 id, uint256 amount) external {
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not authorized");
        _burn(from, id, amount);
        totalSupply[id] -= amount;
    }

    function setURI(string calldata uri_) external onlyOwner { _setURI(uri_); }
}`,

  // ── 16. NFTAirdrop ──────────────────────────────────────────────────────────
  "block67/nft/NFTAirdrop.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NFTAirdrop
/// @notice Batch-airdrop ERC-721 or ERC-20 tokens to a list of recipients.
contract NFTAirdrop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event ERC20Airdropped(address indexed token, uint256 recipients, uint256 total);
    event ETHAirdropped(uint256 recipients, uint256 total);

    constructor(address owner_) Ownable(owner_) {}

    /// @notice Airdrop equal ERC-20 amounts to each recipient.
    function airdropERC20Equal(
        IERC20          token,
        address[] calldata recipients,
        uint256           amountEach
    ) external onlyOwner nonReentrant {
        uint256 total = amountEach * recipients.length;
        token.safeTransferFrom(msg.sender, address(this), total);
        for (uint256 i; i < recipients.length; ++i) {
            token.safeTransfer(recipients[i], amountEach);
        }
        emit ERC20Airdropped(address(token), recipients.length, total);
    }

    /// @notice Airdrop custom ERC-20 amounts.
    function airdropERC20Custom(
        IERC20          token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");
        uint256 total;
        for (uint256 i; i < amounts.length; ++i) total += amounts[i];
        token.safeTransferFrom(msg.sender, address(this), total);
        for (uint256 i; i < recipients.length; ++i) {
            token.safeTransfer(recipients[i], amounts[i]);
        }
        emit ERC20Airdropped(address(token), recipients.length, total);
    }

    /// @notice Airdrop equal ETH to each recipient.
    function airdropETHEqual(address[] calldata recipients) external payable onlyOwner nonReentrant {
        uint256 each = msg.value / recipients.length;
        for (uint256 i; i < recipients.length; ++i) {
            (bool ok,) = recipients[i].call{value: each}("");
            require(ok, "ETH transfer failed");
        }
        emit ETHAirdropped(recipients.length, msg.value);
    }

    receive() external payable {}
}`,
};
