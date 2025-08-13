/**
 * 🧪 Simple Transaction Test - Testing what ACTUALLY worked before
 * 
 * This will help us identify what the original working transaction format was
 */

class SimpleTransactionTest {
    constructor() {
        console.log('🧪 Simple Transaction Test loaded');
    }

    /**
     * Test the absolute simplest transaction format
     */
    async testSimplestFormat() {
        console.log('🧪 Testing absolutely simplest transaction format...');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            const fromAddress = accounts[0];
            
            // MINIMAL transaction - just like the very beginning
            const minimalTx = {
                from: fromAddress,
                to: '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a', // House wallet
                value: '0x38D7EA4C68000' // 0.001 ETH in wei
            };
            
            console.log('📋 Minimal transaction object:', minimalTx);
            console.log('🔍 Fields:', Object.keys(minimalTx));
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [minimalTx]
            });
            
            console.log('✅ MINIMAL TRANSACTION SUCCEEDED!', txHash);
            return { success: true, txHash };
            
        } catch (error) {
            console.log('❌ Minimal transaction failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Test with basic gas fields added
     */
    async testWithBasicGas() {
        console.log('🧪 Testing with basic gas fields...');
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            const fromAddress = accounts[0];
            
            // Basic transaction with gas
            const basicTx = {
                from: fromAddress,
                to: '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a', // House wallet
                value: '0x38D7EA4C68000', // 0.001 ETH in wei
                gas: '0x5208', // 21000
                gasPrice: '0x3B9ACA00' // 1 gwei
            };
            
            console.log('📋 Basic transaction with gas:', basicTx);
            console.log('🔍 Fields:', Object.keys(basicTx));
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [basicTx]
            });
            
            console.log('✅ BASIC GAS TRANSACTION SUCCEEDED!', txHash);
            return { success: true, txHash };
            
        } catch (error) {
            console.log('❌ Basic gas transaction failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Run all simple tests
     */
    async runAllTests() {
        console.log('🧪 Running all simple transaction tests...');
        
        const results = [];
        
        // Test 1: Minimal format
        const minimalResult = await this.testSimplestFormat();
        results.push({ test: 'Minimal Format', ...minimalResult });
        
        // Test 2: Basic gas format
        const basicResult = await this.testWithBasicGas();
        results.push({ test: 'Basic Gas Format', ...basicResult });
        
        console.log('🧪 Simple Transaction Test Results:', results);
        
        // Check if any worked
        const successfulTests = results.filter(r => r.success);
        if (successfulTests.length > 0) {
            console.log('✅ SUCCESS! These formats work:', successfulTests.map(t => t.test));
            console.log('💡 Use these working formats to fix your betting transactions');
        } else {
            console.log('❌ All simple formats failed - this is a deeper MetaMask/Abstract issue');
        }
        
        return results;
    }
}

// Create global instance
window.SimpleTransactionTest = SimpleTransactionTest;
window.simpleTest = new SimpleTransactionTest();

// Add easy console command
window.testSimpleTransaction = () => window.simpleTest.runAllTests();

console.log('🧪 Simple Transaction Test loaded');
console.log('🎯 Run: testSimpleTransaction()');
