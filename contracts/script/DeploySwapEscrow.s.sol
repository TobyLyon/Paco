// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../SwapEscrow.sol";

contract DeploySwapEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeReceiver = vm.envAddress("TRADES_FEE_RECEIVER");
        
        console.log("Deploying SwapEscrow to Abstract Mainnet...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Fee receiver:", feeReceiver);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        SwapEscrow swapEscrow = new SwapEscrow(feeReceiver);
        
        vm.stopBroadcast();
        
        console.log("SwapEscrow deployed at:", address(swapEscrow));
        console.log("Verification command:");
        console.log("forge verify-contract", address(swapEscrow), "SwapEscrow", "--chain-id", vm.toString(block.chainid), "--constructor-args", abi.encode(feeReceiver));
        
        // Write deployment info to file
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "SwapEscrow": "', vm.toString(address(swapEscrow)), '",\n',
            '  "feeReceiver": "', vm.toString(feeReceiver), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(vm.addr(deployerPrivateKey)), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), '\n',
            '}'
        ));
        
        vm.writeFile("deployments/abstract.json", json);
        console.log("Deployment info written to deployments/abstract.json");
    }
}

// Helper script to verify after deployment
contract VerifySwapEscrow is Script {
    function run() external {
        address swapEscrow = vm.envAddress("SWAP_ESCROW_ADDRESS");
        address feeReceiver = vm.envAddress("TRADES_FEE_RECEIVER");
        
        console.log("Verifying SwapEscrow at:", swapEscrow);
        
        // This would be used with: forge script script/DeploySwapEscrow.s.sol:VerifySwapEscrow --rpc-url $RPC_URL --verify
        vm.startBroadcast();
        // Verification happens automatically with --verify flag
        vm.stopBroadcast();
    }
}