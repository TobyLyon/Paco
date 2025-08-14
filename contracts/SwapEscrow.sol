// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SwapEscrow
 * @notice Peer-to-peer NFT trading with EIP-712 signatures on Abstract Mainnet
 * @dev Non-upgradeable contract for atomic swaps of ERC-721, ERC-1155, and ERC-20 tokens
 */
contract SwapEscrow is EIP712, ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    // Contract version and domain info
    string public constant VERSION = "1";
    uint256 public constant CHAIN_ID = 2741; // Abstract Mainnet

    // Protocol fee (in basis points, max 5%)
    uint256 public feeBps = 0; // Default 0%
    uint256 public constant MAX_FEE_BPS = 500; // 5% maximum
    address public feeReceiver;

    // Order tracking
    mapping(address => uint256) public nonces; // User nonces to prevent replay
    mapping(bytes32 => bool) public filledOrders; // Filled order hashes
    mapping(bytes32 => bool) public cancelledOrders; // Cancelled order hashes

    // Kill switch for emergency stops
    bool public paused = false;

    // Item types for the order
    enum ItemType {
        ERC721,
        ERC1155,
        ERC20,
        NATIVE
    }

    // Individual item in an order
    struct Item {
        ItemType itemType;
        address contractAddr;
        uint256 tokenId; // For ERC721/1155, ignored for ERC20/NATIVE
        uint256 amount; // Amount for ERC1155/ERC20/NATIVE, ignored for ERC721
    }

    // Complete order structure
    struct Order {
        address maker;
        address taker; // address(0) for open orders
        Item[] giveItems;
        Item[] takeItems;
        uint256 expiry;
        uint256 nonce;
        uint256 feeBps; // Fee in basis points (0-500)
    }

    // EIP-712 type hash
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address taker,Item[] giveItems,Item[] takeItems,uint256 expiry,uint256 nonce,uint256 feeBps)Item(uint8 itemType,address contractAddr,uint256 tokenId,uint256 amount)"
    );

    bytes32 public constant ITEM_TYPEHASH = keccak256(
        "Item(uint8 itemType,address contractAddr,uint256 tokenId,uint256 amount)"
    );

    // Events
    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 protocolFee
    );

    event OrderCancelled(
        bytes32 indexed orderHash,
        address indexed maker,
        uint256 nonce
    );

    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeReceiverUpdated(address oldReceiver, address newReceiver);
    event PauseToggled(bool paused);

    // Errors
    error InvalidSignature();
    error OrderExpired();
    error OrderAlreadyFilled();
    error OrderCancelled();
    error InvalidTaker();
    error InvalidFee();
    error ContractPaused();
    error TransferFailed();
    error InsufficientNativeValue();

    constructor(address _feeReceiver) 
        EIP712("PacoTrades", VERSION) 
        Ownable() 
    {
        feeReceiver = _feeReceiver;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @notice Fill an order by providing the maker's signature
     * @param order The order to fill
     * @param signature The maker's EIP-712 signature
     */
    function fillOrder(Order calldata order, bytes calldata signature) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        // Verify order validity
        bytes32 orderHash = _hashOrder(order);
        _validateOrder(order, orderHash, signature);

        // Mark as filled
        filledOrders[orderHash] = true;

        // Calculate protocol fee
        uint256 protocolFee = 0;
        uint256 totalNativeGive = _calculateNativeAmount(order.giveItems);
        uint256 totalNativeTake = _calculateNativeAmount(order.takeItems);
        
        if (order.feeBps > 0 && totalNativeGive > 0) {
            protocolFee = (totalNativeGive * order.feeBps) / 10000;
        }

        // Execute transfers: maker gives items to taker
        _transferItems(order.giveItems, order.maker, msg.sender);
        
        // Execute transfers: taker gives items to maker
        _transferItems(order.takeItems, msg.sender, order.maker);

        // Handle protocol fee
        if (protocolFee > 0 && feeReceiver != address(0)) {
            (bool success, ) = feeReceiver.call{value: protocolFee}("");
            if (!success) revert TransferFailed();
        }

        // Refund excess native tokens to taker
        uint256 excess = msg.value - totalNativeTake - protocolFee;
        if (excess > 0) {
            (bool success, ) = msg.sender.call{value: excess}("");
            if (!success) revert TransferFailed();
        }

        emit OrderFilled(orderHash, order.maker, msg.sender, protocolFee);
    }

    /**
     * @notice Cancel an order by nonce (only maker)
     * @param nonce The nonce to cancel
     */
    function cancelOrder(uint256 nonce) external {
        // Increment user nonce to invalidate all orders with lower nonces
        nonces[msg.sender] = nonce + 1;
        
        bytes32 orderHash = keccak256(abi.encode("CANCELLED", msg.sender, nonce));
        cancelledOrders[orderHash] = true;

        emit OrderCancelled(orderHash, msg.sender, nonce);
    }

    /**
     * @notice Hash an order for EIP-712 signing
     * @param order The order to hash
     * @return The order hash
     */
    function hashOrder(Order calldata order) external view returns (bytes32) {
        return _hashOrder(order);
    }

    /**
     * @notice Check if an order is valid and not filled/cancelled
     * @param order The order to check
     * @param signature The maker's signature
     * @return isValid Whether the order is valid
     */
    function isValidOrder(Order calldata order, bytes calldata signature) 
        external 
        view 
        returns (bool isValid) 
    {
        try this._validateOrderView(order, _hashOrder(order), signature) {
            return true;
        } catch {
            return false;
        }
    }

    // Internal functions

    function _hashOrder(Order calldata order) internal view returns (bytes32) {
        bytes32[] memory giveItemHashes = new bytes32[](order.giveItems.length);
        bytes32[] memory takeItemHashes = new bytes32[](order.takeItems.length);

        for (uint256 i = 0; i < order.giveItems.length; i++) {
            giveItemHashes[i] = _hashItem(order.giveItems[i]);
        }

        for (uint256 i = 0; i < order.takeItems.length; i++) {
            takeItemHashes[i] = _hashItem(order.takeItems[i]);
        }

        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.taker,
            keccak256(abi.encodePacked(giveItemHashes)),
            keccak256(abi.encodePacked(takeItemHashes)),
            order.expiry,
            order.nonce,
            order.feeBps
        )));
    }

    function _hashItem(Item calldata item) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            ITEM_TYPEHASH,
            item.itemType,
            item.contractAddr,
            item.tokenId,
            item.amount
        ));
    }

    function _validateOrder(
        Order calldata order,
        bytes32 orderHash,
        bytes calldata signature
    ) internal view {
        // Check expiry
        if (block.timestamp > order.expiry) revert OrderExpired();

        // Check if already filled or cancelled
        if (filledOrders[orderHash]) revert OrderAlreadyFilled();
        if (cancelledOrders[orderHash]) revert OrderCancelled();

        // Check nonce
        if (order.nonce < nonces[order.maker]) revert OrderCancelled();

        // Check taker restriction
        if (order.taker != address(0) && order.taker != msg.sender) {
            revert InvalidTaker();
        }

        // Check fee
        if (order.feeBps > MAX_FEE_BPS) revert InvalidFee();

        // Verify signature
        address recovered = orderHash.recover(signature);
        if (recovered != order.maker) revert InvalidSignature();

        // Check domain separator (ensure correct chain)
        if (block.chainid != CHAIN_ID) revert InvalidSignature();
    }

    function _validateOrderView(
        Order calldata order,
        bytes32 orderHash,
        bytes calldata signature
    ) external view {
        _validateOrder(order, orderHash, signature);
    }

    function _calculateNativeAmount(Item[] calldata items) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].itemType == ItemType.NATIVE) {
                total += items[i].amount;
            }
        }
    }

    function _transferItems(
        Item[] calldata items,
        address from,
        address to
    ) internal {
        uint256 totalNative = 0;

        for (uint256 i = 0; i < items.length; i++) {
            Item calldata item = items[i];

            if (item.itemType == ItemType.ERC721) {
                IERC721(item.contractAddr).safeTransferFrom(from, to, item.tokenId);
            } else if (item.itemType == ItemType.ERC1155) {
                IERC1155(item.contractAddr).safeTransferFrom(from, to, item.tokenId, item.amount, "");
            } else if (item.itemType == ItemType.ERC20) {
                IERC20(item.contractAddr).transferFrom(from, to, item.amount);
            } else if (item.itemType == ItemType.NATIVE) {
                totalNative += item.amount;
            }
        }

        // Handle native token transfers
        if (totalNative > 0) {
            if (from == msg.sender) {
                // Taker providing native tokens
                if (msg.value < totalNative) revert InsufficientNativeValue();
            } else {
                // This would be maker providing native tokens, not supported in this design
                // Native tokens from maker should be handled differently
                revert TransferFailed();
            }
        }
    }

    // Admin functions

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        uint256 oldFee = feeBps;
        feeBps = _feeBps;
        emit FeeUpdated(oldFee, _feeBps);
    }

    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseToggled(_paused);
    }

    // Emergency function to withdraw stuck tokens
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: address(this).balance}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }

    receive() external payable {}
}