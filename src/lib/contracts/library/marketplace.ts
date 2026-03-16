// Block67 Component Library — Marketplace (5 contracts)
// All contracts compile with solc ^0.8.20 + OpenZeppelin 5.x

export const MARKETPLACE: Record<string, string> = {

  // ── 41. NFTMarketplace ──────────────────────────────────────────────────────
  "block67/marketplace/NFTMarketplace.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFTMarketplace
/// @notice List, buy, and delist ERC-721 NFTs with EIP-2981 royalty support.
contract NFTMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool    active;
    }

    uint256 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;

    // collection => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    event Listed(address indexed collection, uint256 indexed tokenId, address seller, uint256 price);
    event Sold(address indexed collection, uint256 indexed tokenId, address buyer, uint256 price);
    event Delisted(address indexed collection, uint256 indexed tokenId);
    event PriceUpdated(address indexed collection, uint256 indexed tokenId, uint256 price);

    error NotListed();
    error NotSeller();
    error InsufficientPayment();

    constructor(address feeRecipient_, address owner_) Ownable(owner_) {
        feeRecipient = feeRecipient_;
    }

    function list(address collection, uint256 tokenId, uint256 price) external {
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);
        listings[collection][tokenId] = Listing(msg.sender, price, true);
        emit Listed(collection, tokenId, msg.sender, price);
    }

    function buy(address collection, uint256 tokenId) external payable nonReentrant {
        Listing storage l = listings[collection][tokenId];
        if (!l.active)           revert NotListed();
        if (msg.value < l.price) revert InsufficientPayment();

        uint256 fee      = (l.price * platformFeeBps) / 10_000;
        uint256 royalty;
        address royaltyReceiver;

        // Attempt EIP-2981 royalty lookup
        try IERC2981(collection).royaltyInfo(tokenId, l.price) returns (address r, uint256 a) {
            royaltyReceiver = r;
            royalty = a;
        } catch {}

        uint256 sellerAmount = l.price - fee - royalty;
        l.active = false;

        IERC721(collection).transferFrom(address(this), msg.sender, tokenId);
        (bool ok1,) = l.seller.call{value: sellerAmount}("");
        require(ok1, "Seller payment failed");
        (bool ok2,) = feeRecipient.call{value: fee}("");
        require(ok2, "Fee failed");
        if (royalty > 0 && royaltyReceiver != address(0)) {
            (bool ok3,) = royaltyReceiver.call{value: royalty}("");
            require(ok3, "Royalty failed");
        }
        // Refund excess
        if (msg.value > l.price) {
            (bool ok4,) = msg.sender.call{value: msg.value - l.price}("");
            require(ok4, "Refund failed");
        }
        emit Sold(collection, tokenId, msg.sender, l.price);
    }

    function delist(address collection, uint256 tokenId) external nonReentrant {
        Listing storage l = listings[collection][tokenId];
        if (!l.active)          revert NotListed();
        if (l.seller != msg.sender) revert NotSeller();
        l.active = false;
        IERC721(collection).transferFrom(address(this), msg.sender, tokenId);
        emit Delisted(collection, tokenId);
    }

    function updatePrice(address collection, uint256 tokenId, uint256 newPrice) external {
        Listing storage l = listings[collection][tokenId];
        if (!l.active)          revert NotListed();
        if (l.seller != msg.sender) revert NotSeller();
        l.price = newPrice;
        emit PriceUpdated(collection, tokenId, newPrice);
    }

    function setPlatformFee(uint256 bps) external onlyOwner { require(bps <= 1000, "Max 10%"); platformFeeBps = bps; }
    function setFeeRecipient(address r) external onlyOwner { feeRecipient = r; }
}`,

  // ── 42. AuctionHouse ────────────────────────────────────────────────────────
  "block67/marketplace/AuctionHouse.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AuctionHouse
/// @notice English auction for ERC-721 NFTs with automatic extension.
contract AuctionHouse is Ownable, ReentrancyGuard {
    struct Auction {
        address collection;
        uint256 tokenId;
        address seller;
        uint256 reservePrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool    ended;
    }

    uint256 public auctionCount;
    uint256 public platformFeeBps = 250;
    uint256 public extensionWindow = 10 minutes;
    uint256 public extensionTime   = 10 minutes;

    mapping(uint256 => Auction)          public auctions;
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    event AuctionCreated(uint256 indexed id, address collection, uint256 tokenId, uint256 reservePrice, uint256 endTime);
    event BidPlaced(uint256 indexed id, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed id, address winner, uint256 amount);

    error AuctionNotActive();
    error BidTooLow();
    error AuctionNotEnded();
    error ReserveNotMet();

    constructor(address owner_) Ownable(owner_) {}

    function createAuction(address collection, uint256 tokenId, uint256 reservePrice, uint256 duration) external returns (uint256 id) {
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);
        id = auctionCount++;
        auctions[id] = Auction(collection, tokenId, msg.sender, reservePrice, 0, address(0), block.timestamp + duration, false);
        emit AuctionCreated(id, collection, tokenId, reservePrice, block.timestamp + duration);
    }

    function bid(uint256 id) external payable nonReentrant {
        Auction storage a = auctions[id];
        if (a.ended || block.timestamp >= a.endTime) revert AuctionNotActive();
        if (msg.value <= a.highestBid)                revert BidTooLow();
        if (a.highestBidder != address(0)) pendingReturns[id][a.highestBidder] += a.highestBid;
        a.highestBid    = msg.value;
        a.highestBidder = msg.sender;
        // Auto-extend if bid placed near end
        if (a.endTime - block.timestamp < extensionWindow) a.endTime += extensionTime;
        emit BidPlaced(id, msg.sender, msg.value);
    }

    function endAuction(uint256 id) external nonReentrant {
        Auction storage a = auctions[id];
        if (block.timestamp < a.endTime) revert AuctionNotEnded();
        if (a.ended) revert AuctionNotActive();
        a.ended = true;
        if (a.highestBid < a.reservePrice) {
            IERC721(a.collection).transferFrom(address(this), a.seller, a.tokenId);
            if (a.highestBidder != address(0)) pendingReturns[id][a.highestBidder] += a.highestBid;
        } else {
            uint256 fee    = (a.highestBid * platformFeeBps) / 10_000;
            uint256 payout = a.highestBid - fee;
            IERC721(a.collection).transferFrom(address(this), a.highestBidder, a.tokenId);
            (bool ok,) = a.seller.call{value: payout}("");
            require(ok, "Seller payout failed");
        }
        emit AuctionEnded(id, a.highestBidder, a.highestBid);
    }

    function withdraw(uint256 id) external nonReentrant {
        uint256 amount = pendingReturns[id][msg.sender];
        pendingReturns[id][msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Withdraw failed");
    }
}`,

  // ── 43. BidManager ──────────────────────────────────────────────────────────
  "block67/marketplace/BidManager.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BidManager
/// @notice Track and manage bids on arbitrary assets (off-chain fulfillment).
contract BidManager is ReentrancyGuard {
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 expiry;
        bool    active;
    }

    // collection => tokenId => bids
    mapping(address => mapping(uint256 => Bid[])) public bids;

    event BidPlaced(address indexed collection, uint256 indexed tokenId, address bidder, uint256 amount, uint256 expiry);
    event BidCancelled(address indexed collection, uint256 indexed tokenId, uint256 bidIndex, address bidder);
    event BidAccepted(address indexed collection, uint256 indexed tokenId, uint256 bidIndex, address bidder);

    error InactiveBid();
    error BidExpired();
    error NotBidder();

    function placeBid(address collection, uint256 tokenId, uint256 expiry) external payable nonReentrant {
        require(msg.value > 0, "Zero bid");
        require(expiry > block.timestamp, "Expiry in past");
        bids[collection][tokenId].push(Bid(msg.sender, msg.value, expiry, true));
        emit BidPlaced(collection, tokenId, msg.sender, msg.value, expiry);
    }

    function cancelBid(address collection, uint256 tokenId, uint256 bidIndex) external nonReentrant {
        Bid storage b = bids[collection][tokenId][bidIndex];
        if (!b.active)          revert InactiveBid();
        if (b.bidder != msg.sender) revert NotBidder();
        b.active = false;
        (bool ok,) = msg.sender.call{value: b.amount}("");
        require(ok, "Refund failed");
        emit BidCancelled(collection, tokenId, bidIndex, msg.sender);
    }

    function getBids(address collection, uint256 tokenId) external view returns (Bid[] memory) {
        return bids[collection][tokenId];
    }

    function highestActiveBid(address collection, uint256 tokenId) external view returns (address bidder, uint256 amount, uint256 idx) {
        Bid[] storage list = bids[collection][tokenId];
        for (uint256 i; i < list.length; ++i) {
            if (list[i].active && list[i].expiry > block.timestamp && list[i].amount > amount) {
                bidder = list[i].bidder; amount = list[i].amount; idx = i;
            }
        }
    }
}`,

  // ── 44. OfferManager ────────────────────────────────────────────────────────
  "block67/marketplace/OfferManager.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title OfferManager
/// @notice Make / accept / cancel ERC-20 offers for ERC-721 NFTs.
contract OfferManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Offer {
        address offerer;
        IERC20  token;
        uint256 amount;
        uint256 expiry;
        bool    active;
    }

    // collection => tokenId => offers
    mapping(address => mapping(uint256 => Offer[])) public offers;

    event OfferMade(address indexed collection, uint256 indexed tokenId, address offerer, uint256 amount, uint256 expiry);
    event OfferCancelled(address indexed collection, uint256 indexed tokenId, uint256 offerIndex);
    event OfferAccepted(address indexed collection, uint256 indexed tokenId, uint256 offerIndex, address seller);

    error InactiveOffer();
    error OfferExpired();
    error NotOwner();
    error NotOfferer();

    function makeOffer(address collection, uint256 tokenId, IERC20 token, uint256 amount, uint256 expiry)
        external nonReentrant
    {
        require(expiry > block.timestamp, "Expiry in past");
        token.safeTransferFrom(msg.sender, address(this), amount);
        offers[collection][tokenId].push(Offer(msg.sender, token, amount, expiry, true));
        emit OfferMade(collection, tokenId, msg.sender, amount, expiry);
    }

    function cancelOffer(address collection, uint256 tokenId, uint256 offerIndex) external nonReentrant {
        Offer storage o = offers[collection][tokenId][offerIndex];
        if (!o.active)          revert InactiveOffer();
        if (o.offerer != msg.sender) revert NotOfferer();
        o.active = false;
        o.token.safeTransfer(msg.sender, o.amount);
        emit OfferCancelled(collection, tokenId, offerIndex);
    }

    function acceptOffer(address collection, uint256 tokenId, uint256 offerIndex) external nonReentrant {
        Offer storage o = offers[collection][tokenId][offerIndex];
        if (!o.active)                 revert InactiveOffer();
        if (block.timestamp > o.expiry) revert OfferExpired();
        if (IERC721(collection).ownerOf(tokenId) != msg.sender) revert NotOwner();
        o.active = false;
        IERC721(collection).transferFrom(msg.sender, o.offerer, tokenId);
        o.token.safeTransfer(msg.sender, o.amount);
        emit OfferAccepted(collection, tokenId, offerIndex, msg.sender);
    }

    function getOffers(address collection, uint256 tokenId) external view returns (Offer[] memory) {
        return offers[collection][tokenId];
    }
}`,

  // ── 45. MarketplaceFees ─────────────────────────────────────────────────────
  "block67/marketplace/MarketplaceFees.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MarketplaceFees
/// @notice Configurable fee engine with per-collection overrides.
contract MarketplaceFees is Ownable, ReentrancyGuard {
    uint256 public defaultFeeBps = 250; // 2.5%
    address public feeRecipient;

    mapping(address => uint256) public collectionFeeBps;  // 0 = use default
    mapping(address => bool)    public collectionOverride;

    uint256 public totalFeesCollected;

    event FeeCollected(address indexed collection, uint256 salePrice, uint256 fee);
    event FeeUpdated(uint256 defaultBps);
    event CollectionFeeSet(address indexed collection, uint256 bps);

    constructor(address feeRecipient_, address owner_) Ownable(owner_) {
        feeRecipient = feeRecipient_;
    }

    function calculateFee(address collection, uint256 salePrice) public view returns (uint256) {
        uint256 bps = collectionOverride[collection] ? collectionFeeBps[collection] : defaultFeeBps;
        return (salePrice * bps) / 10_000;
    }

    function collectFee(address collection, uint256 salePrice) external payable nonReentrant returns (uint256 fee) {
        fee = calculateFee(collection, salePrice);
        require(msg.value >= fee, "Insufficient fee");
        totalFeesCollected += fee;
        (bool ok,) = feeRecipient.call{value: fee}("");
        require(ok, "Fee transfer failed");
        if (msg.value > fee) {
            (bool ok2,) = msg.sender.call{value: msg.value - fee}("");
            require(ok2, "Refund failed");
        }
        emit FeeCollected(collection, salePrice, fee);
    }

    function setDefaultFee(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        defaultFeeBps = bps;
        emit FeeUpdated(bps);
    }

    function setCollectionFee(address collection, uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        collectionFeeBps[collection]  = bps;
        collectionOverride[collection] = true;
        emit CollectionFeeSet(collection, bps);
    }

    function setFeeRecipient(address r) external onlyOwner { feeRecipient = r; }
}`,
};
