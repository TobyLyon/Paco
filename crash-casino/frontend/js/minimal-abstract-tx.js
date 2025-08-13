/**
 * 🔧 Minimal Abstract Transaction Sender
 * 
 * Last resort transaction method using the SIMPLEST possible format
 * Specifically for Abstract L2 RPC issues
 */

class MinimalAbstractTx {
    constructor() {
        console.log('🔧 Minimal Abstract Transaction Sender initialized');
    }

    /**
     * 🚀 Send minimal transaction format
     */
    async sendMinimalTransaction(to, valueEth) {
        try {
            console.log('🔧 MINIMAL TRANSACTION ATTEMPT');
            console.log('📍 To:', to);
            console.log('💰 Value:', valueEth, 'ETH');
            
            // Get current account
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (!accounts?.length) {
                throw new Error('No wallet connected');
            }

            // Convert ETH to wei
            const valueWei = ethers.parseEther(valueEth.toString());
            
            // ABSOLUTE MINIMAL transaction object
            const minimalTx = {
                from: accounts[0], // Required: sender address
                to: to,
                value: '0x' + valueWei.toString(16)
            };
            
            console.log('🔧 Sending MINIMAL transaction:', minimalTx);
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [minimalTx]
            });
            
            console.log('✅ MINIMAL transaction successful:', txHash);
            return { success: true, txHash };
            
        } catch (error) {
            console.error('❌ MINIMAL transaction failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.minimalAbstractTx = new MinimalAbstractTx();

console.log('🔧 Minimal Abstract Transaction Sender loaded');
console.log('📖 Usage: minimalAbstractTx.sendMinimalTransaction(to, valueEth)');
