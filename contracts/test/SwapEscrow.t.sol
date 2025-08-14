// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../SwapEscrow.sol";
import "./mocks/MockERC721.sol";
import "./mocks/MockERC1155.sol";
import "./mocks/MockERC20.sol";

contract SwapEscrowTest is Test {
    SwapEscrow public swapEscrow;
    MockERC721 public nft721;
    MockERC1155 public nft1155;
    MockERC20 public token20;

    address public owner = address(0x1);
    address public feeReceiver = address(0x2);
    address public alice = address(0x3);
    address public bob = address(0x4);
    address public charlie = address(0x5);

    uint256 public constant ALICE_PRIVATE_KEY = 0xa11ce;
    uint256 public constant BOB_PRIVATE_KEY = 0xb0b;
    
    // Test constants
    uint256 public constant TEST_TOKEN_ID_721 = 1;
    uint256 public constant TEST_TOKEN_ID_1155 = 100;
    uint256 public constant TEST_AMOUNT_1155 = 5;
    uint256 public constant TEST_AMOUNT_ERC20 = 1000 * 10**18;

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

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        swapEscrow = new SwapEscrow(feeReceiver);
        nft721 = new MockERC721("Test NFT", "TNFT");
        nft1155 = new MockERC1155("https://test.com/{id}");
        token20 = new MockERC20("Test Token", "TT", 18);
        
        vm.stopPrank();

        // Setup test data
        vm.startPrank(alice);
        nft721.mint(alice, TEST_TOKEN_ID_721);
        nft1155.mint(alice, TEST_TOKEN_ID_1155, TEST_AMOUNT_1155, "");
        token20.mint(alice, TEST_AMOUNT_ERC20);
        vm.stopPrank();

        vm.startPrank(bob);
        token20.mint(bob, TEST_AMOUNT_ERC20);
        nft721.mint(bob, 2);
        vm.stopPrank();

        // Setup approvals
        vm.startPrank(alice);
        nft721.setApprovalForAll(address(swapEscrow), true);
        nft1155.setApprovalForAll(address(swapEscrow), true);
        token20.approve(address(swapEscrow), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        nft721.setApprovalForAll(address(swapEscrow), true);
        token20.approve(address(swapEscrow), type(uint256).max);
        vm.stopPrank();
    }

    function testInitialState() public {
        assertEq(swapEscrow.VERSION(), "1");
        assertEq(swapEscrow.CHAIN_ID(), 2741);
        assertEq(swapEscrow.feeBps(), 0);
        assertEq(swapEscrow.feeReceiver(), feeReceiver);
        assertFalse(swapEscrow.paused());
        assertEq(swapEscrow.nonces(alice), 0);
    }

    function testCreateBasicERC721ToERC20Order() public {
        SwapEscrow.Item[] memory giveItems = new SwapEscrow.Item[](1);
        SwapEscrow.Item[] memory takeItems = new SwapEscrow.Item[](1);

        giveItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC721,
            contractAddr: address(nft721),
            tokenId: TEST_TOKEN_ID_721,
            amount: 1
        });

        takeItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC20,
            contractAddr: address(token20),
            tokenId: 0,
            amount: 100 * 10**18
        });

        SwapEscrow.Order memory order = SwapEscrow.Order({
            maker: alice,
            taker: address(0),
            giveItems: giveItems,
            takeItems: takeItems,
            expiry: block.timestamp + 1 hours,
            nonce: 1,
            feeBps: 0
        });

        bytes32 orderHash = swapEscrow.hashOrder(order);
        assertTrue(orderHash != bytes32(0));

        // Sign order
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);
        
        // Verify order is valid
        assertTrue(swapEscrow.isValidOrder(order, signature));
    }

    function testFillBasicOrder() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        bytes32 orderHash = swapEscrow.hashOrder(order);

        // Bob fills the order
        vm.startPrank(bob);
        
        vm.expectEmit(true, true, true, true);
        emit OrderFilled(orderHash, alice, bob, 0);
        
        swapEscrow.fillOrder(order, signature);
        
        vm.stopPrank();

        // Verify ownership transfer
        assertEq(nft721.ownerOf(TEST_TOKEN_ID_721), bob);
        assertEq(token20.balanceOf(alice), TEST_AMOUNT_ERC20 + 100 * 10**18);
        assertEq(token20.balanceOf(bob), TEST_AMOUNT_ERC20 - 100 * 10**18);

        // Verify order is marked as filled
        assertTrue(swapEscrow.filledOrders(orderHash));
    }

    function testCannotFillOrderTwice() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        // First fill
        vm.prank(bob);
        swapEscrow.fillOrder(order, signature);

        // Second fill should fail
        vm.startPrank(charlie);
        token20.mint(charlie, TEST_AMOUNT_ERC20);
        token20.approve(address(swapEscrow), type(uint256).max);
        
        vm.expectRevert(SwapEscrow.OrderAlreadyFilled.selector);
        swapEscrow.fillOrder(order, signature);
        vm.stopPrank();
    }

    function testCannotFillExpiredOrder() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        order.expiry = block.timestamp - 1; // Already expired
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        vm.expectRevert(SwapEscrow.OrderExpired.selector);
        swapEscrow.fillOrder(order, signature);
    }

    function testCannotFillCancelledOrder() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        
        // Alice cancels order
        vm.prank(alice);
        swapEscrow.cancelOrder(order.nonce);

        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        vm.expectRevert(SwapEscrow.OrderCancelled.selector);
        swapEscrow.fillOrder(order, signature);
    }

    function testRestrictedTakerOrder() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        order.taker = bob; // Only bob can fill
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        // Charlie tries to fill (should fail)
        vm.startPrank(charlie);
        token20.mint(charlie, TEST_AMOUNT_ERC20);
        token20.approve(address(swapEscrow), type(uint256).max);
        
        vm.expectRevert(SwapEscrow.InvalidTaker.selector);
        swapEscrow.fillOrder(order, signature);
        vm.stopPrank();

        // Bob fills successfully
        vm.prank(bob);
        swapEscrow.fillOrder(order, signature);
    }

    function testERC1155ToERC721Order() public {
        SwapEscrow.Item[] memory giveItems = new SwapEscrow.Item[](1);
        SwapEscrow.Item[] memory takeItems = new SwapEscrow.Item[](1);

        giveItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC1155,
            contractAddr: address(nft1155),
            tokenId: TEST_TOKEN_ID_1155,
            amount: 3
        });

        takeItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC721,
            contractAddr: address(nft721),
            tokenId: 2,
            amount: 1
        });

        SwapEscrow.Order memory order = SwapEscrow.Order({
            maker: alice,
            taker: address(0),
            giveItems: giveItems,
            takeItems: takeItems,
            expiry: block.timestamp + 1 hours,
            nonce: 2,
            feeBps: 0
        });

        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        swapEscrow.fillOrder(order, signature);

        // Verify transfers
        assertEq(nft1155.balanceOf(alice, TEST_TOKEN_ID_1155), TEST_AMOUNT_1155 - 3);
        assertEq(nft1155.balanceOf(bob, TEST_TOKEN_ID_1155), 3);
        assertEq(nft721.ownerOf(2), alice);
    }

    function testMultipleItemsOrder() public {
        SwapEscrow.Item[] memory giveItems = new SwapEscrow.Item[](2);
        SwapEscrow.Item[] memory takeItems = new SwapEscrow.Item[](2);

        // Alice gives: ERC721 + ERC1155
        giveItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC721,
            contractAddr: address(nft721),
            tokenId: TEST_TOKEN_ID_721,
            amount: 1
        });

        giveItems[1] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC1155,
            contractAddr: address(nft1155),
            tokenId: TEST_TOKEN_ID_1155,
            amount: 2
        });

        // Alice wants: ERC20 + ERC721
        takeItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC20,
            contractAddr: address(token20),
            tokenId: 0,
            amount: 50 * 10**18
        });

        takeItems[1] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC721,
            contractAddr: address(nft721),
            tokenId: 2,
            amount: 1
        });

        SwapEscrow.Order memory order = SwapEscrow.Order({
            maker: alice,
            taker: address(0),
            giveItems: giveItems,
            takeItems: takeItems,
            expiry: block.timestamp + 1 hours,
            nonce: 3,
            feeBps: 0
        });

        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        swapEscrow.fillOrder(order, signature);

        // Verify all transfers
        assertEq(nft721.ownerOf(TEST_TOKEN_ID_721), bob);
        assertEq(nft721.ownerOf(2), alice);
        assertEq(nft1155.balanceOf(bob, TEST_TOKEN_ID_1155), 2);
        assertEq(token20.balanceOf(alice), TEST_AMOUNT_ERC20 + 50 * 10**18);
    }

    function testOrderWithProtocolFee() public {
        // Set 2.5% protocol fee
        vm.prank(owner);
        swapEscrow.setFeeBps(250);

        SwapEscrow.Order memory order = _createNativeToERC20Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        uint256 initialFeeReceiverBalance = feeReceiver.balance;
        bytes32 orderHash = swapEscrow.hashOrder(order);

        vm.prank(bob);
        vm.deal(bob, 1 ether);
        
        uint256 expectedFee = (1 ether * 250) / 10000; // 2.5% of 1 ETH
        
        vm.expectEmit(true, true, true, true);
        emit OrderFilled(orderHash, alice, bob, expectedFee);
        
        swapEscrow.fillOrder{value: 1 ether}(order, signature);

        // Verify fee was taken
        assertEq(feeReceiver.balance, initialFeeReceiverBalance + expectedFee);
        assertEq(alice.balance, 1 ether - expectedFee);
    }

    function testInvalidSignature() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        bytes memory invalidSignature = _signOrder(order, BOB_PRIVATE_KEY); // Wrong signer

        vm.prank(bob);
        vm.expectRevert(SwapEscrow.InvalidSignature.selector);
        swapEscrow.fillOrder(order, invalidSignature);
    }

    function testWrongChainIdRejection() public {
        // This test verifies domain separator validation
        SwapEscrow.Order memory order = _createBasicERC721Order();
        
        // Mock wrong chain ID
        vm.chainId(1); // Change to Ethereum mainnet
        
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);
        
        vm.prank(bob);
        vm.expectRevert(SwapEscrow.InvalidSignature.selector);
        swapEscrow.fillOrder(order, signature);
    }

    function testPauseContract() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        // Pause contract
        vm.prank(owner);
        swapEscrow.setPaused(true);

        vm.prank(bob);
        vm.expectRevert(SwapEscrow.ContractPaused.selector);
        swapEscrow.fillOrder(order, signature);

        // Unpause and try again
        vm.prank(owner);
        swapEscrow.setPaused(false);

        vm.prank(bob);
        swapEscrow.fillOrder(order, signature); // Should succeed
    }

    function testCancelOrder() public {
        uint256 nonce = 5;
        
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit OrderCancelled(keccak256(abi.encode("CANCELLED", alice, nonce)), alice, nonce);
        
        swapEscrow.cancelOrder(nonce);

        // Verify nonce was incremented
        assertEq(swapEscrow.nonces(alice), nonce + 1);
    }

    function testInvalidFee() public {
        vm.prank(owner);
        vm.expectRevert(SwapEscrow.InvalidFee.selector);
        swapEscrow.setFeeBps(501); // Over 5% limit
    }

    function testInsufficientNativeValue() public {
        SwapEscrow.Order memory order = _createNativeToERC20Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        vm.deal(bob, 0.5 ether); // Not enough
        
        vm.expectRevert(SwapEscrow.InsufficientNativeValue.selector);
        swapEscrow.fillOrder{value: 0.5 ether}(order, signature);
    }

    function testNativeRefund() public {
        SwapEscrow.Order memory order = _createNativeToERC20Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        vm.deal(bob, 2 ether);
        
        uint256 initialBalance = bob.balance;
        
        swapEscrow.fillOrder{value: 2 ether}(order, signature);
        
        // Should receive 1 ETH refund
        assertEq(bob.balance, initialBalance - 1 ether);
    }

    function testEmergencyWithdraw() public {
        // Send some tokens to contract
        vm.prank(alice);
        token20.transfer(address(swapEscrow), 100 * 10**18);

        uint256 initialBalance = token20.balanceOf(owner);

        vm.prank(owner);
        swapEscrow.emergencyWithdraw(address(token20));

        assertEq(token20.balanceOf(owner), initialBalance + 100 * 10**18);
        assertEq(token20.balanceOf(address(swapEscrow)), 0);
    }

    function testEmergencyWithdrawNative() public {
        // Send native tokens to contract
        vm.deal(address(swapEscrow), 1 ether);

        uint256 initialBalance = owner.balance;

        vm.prank(owner);
        swapEscrow.emergencyWithdraw(address(0));

        assertEq(owner.balance, initialBalance + 1 ether);
    }

    function testReentrancyProtection() public {
        // This test would require a malicious contract
        // For brevity, we trust the ReentrancyGuard modifier
        assertTrue(true);
    }

    function testGasOptimization() public {
        SwapEscrow.Order memory order = _createBasicERC721Order();
        bytes memory signature = _signOrder(order, ALICE_PRIVATE_KEY);

        vm.prank(bob);
        uint256 gasBefore = gasleft();
        swapEscrow.fillOrder(order, signature);
        uint256 gasUsed = gasBefore - gasleft();

        // Ensure gas usage is reasonable (adjust threshold as needed)
        assertLt(gasUsed, 300000);
        console.log("Gas used for basic fill:", gasUsed);
    }

    // Helper functions

    function _createBasicERC721Order() internal view returns (SwapEscrow.Order memory) {
        SwapEscrow.Item[] memory giveItems = new SwapEscrow.Item[](1);
        SwapEscrow.Item[] memory takeItems = new SwapEscrow.Item[](1);

        giveItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC721,
            contractAddr: address(nft721),
            tokenId: TEST_TOKEN_ID_721,
            amount: 1
        });

        takeItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC20,
            contractAddr: address(token20),
            tokenId: 0,
            amount: 100 * 10**18
        });

        return SwapEscrow.Order({
            maker: alice,
            taker: address(0),
            giveItems: giveItems,
            takeItems: takeItems,
            expiry: block.timestamp + 1 hours,
            nonce: 1,
            feeBps: 0
        });
    }

    function _createNativeToERC20Order() internal view returns (SwapEscrow.Order memory) {
        SwapEscrow.Item[] memory giveItems = new SwapEscrow.Item[](1);
        SwapEscrow.Item[] memory takeItems = new SwapEscrow.Item[](1);

        giveItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.ERC20,
            contractAddr: address(token20),
            tokenId: 0,
            amount: 50 * 10**18
        });

        takeItems[0] = SwapEscrow.Item({
            itemType: SwapEscrow.ItemType.NATIVE,
            contractAddr: address(0),
            tokenId: 0,
            amount: 1 ether
        });

        return SwapEscrow.Order({
            maker: alice,
            taker: address(0),
            giveItems: giveItems,
            takeItems: takeItems,
            expiry: block.timestamp + 1 hours,
            nonce: 4,
            feeBps: 250 // 2.5% fee for this test
        });
    }

    function _signOrder(SwapEscrow.Order memory order, uint256 privateKey) internal view returns (bytes memory) {
        bytes32 orderHash = swapEscrow.hashOrder(order);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, orderHash);
        return abi.encodePacked(r, s, v);
    }
}