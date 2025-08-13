/**
 * 🧪 Abstract Network Transaction Tester
 * 
 * This file helps diagnose the specific transaction issues we're having
 * by testing different transaction formats and approaches
 */

class AbstractTransactionTester {
    constructor() {
        this.testResults = [];
        console.log('🧪 Abstract Transaction Tester initialized');
    }

    /**
     * 🔬 Run comprehensive transaction tests
     */
    async runAllTests() {
        console.log('🧪 Starting comprehensive Abstract Network transaction tests...');
        
        const tests = [
            this.testBasicConnectivity.bind(this),
            this.testAccountBalance.bind(this),
            this.testGasEstimation.bind(this),
            this.testMinimalTransaction.bind(this),
            this.testEthersJSTransaction.bind(this),
            this.testDirectRPCCall.bind(this)
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('🚨 Test failed:', error);
            }
        }

        this.displayResults();
    }

    /**
     * ✅ Test 1: Basic connectivity
     */
    async testBasicConnectivity() {
        console.log('🧪 Test 1: Basic RPC connectivity');
        
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const blockNumber = await window.ethereum.request({ method: 'eth_blockNumber' });
            
            this.testResults.push({
                test: 'Basic Connectivity',
                status: 'PASS',
                details: `Chain ID: ${chainId}, Block: ${blockNumber}`
            });
            
            console.log('✅ Basic connectivity: PASS');
        } catch (error) {
            this.testResults.push({
                test: 'Basic Connectivity',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Basic connectivity: FAIL', error);
        }
    }

    /**
     * 💰 Test 2: Account balance check
     */
    async testAccountBalance() {
        console.log('🧪 Test 2: Account balance check');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) throw new Error('No accounts connected');
            
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest']
            });
            
            const balanceEth = parseInt(balance, 16) / 1e18;
            
            this.testResults.push({
                test: 'Account Balance',
                status: 'PASS',
                details: `Account: ${accounts[0]}, Balance: ${balanceEth.toFixed(6)} ETH`
            });
            
            console.log('✅ Account balance: PASS');
        } catch (error) {
            this.testResults.push({
                test: 'Account Balance',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Account balance: FAIL', error);
        }
    }

    /**
     * ⛽ Test 3: Gas estimation
     */
    async testGasEstimation() {
        console.log('🧪 Test 3: Gas estimation');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) throw new Error('No accounts connected');
            
            // Test gas estimation with minimal transaction
            const gasEstimate = await window.ethereum.request({
                method: 'eth_estimateGas',
                params: [{
                    from: accounts[0],
                    to: accounts[0], // Send to self
                    value: '0x1' // 1 wei
                }]
            });
            
            this.testResults.push({
                test: 'Gas Estimation',
                status: 'PASS',
                details: `Estimated gas: ${parseInt(gasEstimate, 16)}`
            });
            
            console.log('✅ Gas estimation: PASS');
        } catch (error) {
            this.testResults.push({
                test: 'Gas Estimation',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Gas estimation: FAIL', error);
        }
    }

    /**
     * 🔧 Test 4: Minimal transaction (to self)
     */
    async testMinimalTransaction() {
        console.log('🧪 Test 4: Minimal transaction (to self)');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) throw new Error('No accounts connected');
            
            console.log('🔍 Attempting minimal transaction to self...');
            
            // Absolutely minimal transaction
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: accounts[0],
                    to: accounts[0],
                    value: '0x1', // 1 wei
                    gas: '0x5208' // 21000 gas
                }]
            });
            
            this.testResults.push({
                test: 'Minimal Transaction',
                status: 'PASS',
                details: `TX Hash: ${txHash}`
            });
            
            console.log('✅ Minimal transaction: PASS', txHash);
        } catch (error) {
            this.testResults.push({
                test: 'Minimal Transaction',
                status: 'FAIL',
                details: `${error.code}: ${error.message}`
            });
            console.log('❌ Minimal transaction: FAIL', error);
        }
    }

    /**
     * 📚 Test 5: Ethers.js transaction
     */
    async testEthersJSTransaction() {
        console.log('🧪 Test 5: Ethers.js transaction');
        
        try {
            if (!window.ethers) throw new Error('Ethers.js not available');
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            
            console.log('🔍 Attempting Ethers.js transaction...');
            
            // Use ethers.js to send transaction
            const tx = await signer.sendTransaction({
                to: address,
                value: ethers.parseEther('0.000000001'), // Very small amount
                gasLimit: 21000
            });
            
            this.testResults.push({
                test: 'Ethers.js Transaction',
                status: 'PASS',
                details: `TX Hash: ${tx.hash}`
            });
            
            console.log('✅ Ethers.js transaction: PASS', tx.hash);
        } catch (error) {
            this.testResults.push({
                test: 'Ethers.js Transaction',
                status: 'FAIL',
                details: `${error.code}: ${error.message}`
            });
            console.log('❌ Ethers.js transaction: FAIL', error);
        }
    }

    /**
     * 📡 Test 6: Direct RPC call
     */
    async testDirectRPCCall() {
        console.log('🧪 Test 6: Direct RPC call');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) throw new Error('No accounts connected');
            
            console.log('🔍 Testing direct RPC call to Abstract endpoint...');
            
            // Direct call to Abstract RPC
            const response = await fetch('https://api.mainnet.abs.xyz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_chainId',
                    params: [],
                    id: 1
                })
            });
            
            const result = await response.json();
            
            this.testResults.push({
                test: 'Direct RPC Call',
                status: 'PASS',
                details: `Response: ${JSON.stringify(result)}`
            });
            
            console.log('✅ Direct RPC call: PASS', result);
        } catch (error) {
            this.testResults.push({
                test: 'Direct RPC Call',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Direct RPC call: FAIL', error);
        }
    }

    /**
     * 📊 Display test results
     */
    displayResults() {
        console.log('\n🧪 === ABSTRACT NETWORK TRANSACTION TEST RESULTS ===');
        console.table(this.testResults);
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const total = this.testResults.length;
        
        console.log(`\n📊 Summary: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! The issue might be specific to your betting transaction.');
        } else {
            console.log('🚨 Some tests failed. This helps identify the root cause.');
        }
        
        // Store results globally for inspection
        window.abstractTestResults = this.testResults;
    }

    /**
     * 🎯 Quick test for current betting transaction
     */
    async testBettingTransaction() {
        console.log('🧪 Testing exact betting transaction format...');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) throw new Error('No accounts connected');
            
            // Exact format your betting system uses
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: accounts[0],
                    to: '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a',
                    value: '0x38d7ea4c68000', // 0.001 ETH
                    gas: '0x5208',
                    gasPrice: '0x5F5E100',
                    data: '0x'
                }]
            });
            
            console.log('✅ Betting transaction format: SUCCESS', txHash);
            return txHash;
        } catch (error) {
            console.log('❌ Betting transaction format: FAILED', error);
            throw error;
        }
    }
}

// Create global instance
window.AbstractTransactionTester = AbstractTransactionTester;
window.abstractTester = new AbstractTransactionTester();

// Add global console commands for easy testing
window.testAbstractTx = () => window.abstractTester.runAllTests();
window.testBettingTx = () => window.abstractTester.testBettingTransaction();

console.log('🧪 Abstract Transaction Tester loaded.');
console.log('🎯 Console commands available:');
console.log('   testAbstractTx() - Run all diagnostic tests');
console.log('   testBettingTx()  - Test exact betting transaction format');
