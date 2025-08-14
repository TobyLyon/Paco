/**
 * 🌐 Abstract Network Wallet Integration
 * 
 * Handles all wallet operations for PacoRocko on Abstract L2
 */

const { ethers } = require('ethers');
const { createWalletClient, http, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { getHouseWallet } = require('./house-wallet');
const { config } = require('./config/abstract-config');
const { createClient } = require('@supabase/supabase-js');

// Abstract chain config
const ABSTRACT_CHAIN = {
    id: 2741,
    name: 'Abstract',
    rpcUrls: { 
        default: { http: ['https://api.mainnet.abs.xyz'] } 
    }
};

class AbstractWalletIntegration {
    constructor(supabaseUrl, supabaseKey) {
        this.houseWallet = getHouseWallet();
        this.provider = null;
        this.supabase = null;
        this.playerBalances = new Map(); // In-memory cache
        this.pendingBets = new Map();
        
        // Initialize
        this.init(supabaseUrl, supabaseKey);
    }
    
    /**
     * 🚀 Initialize wallet integration
     */
    async init(supabaseUrl, supabaseKey) {
        try {
            console.log('🌐 Initializing Abstract wallet integration...');
            
            // Connect to Abstract network
            this.provider = new ethers.JsonRpcProvider(
                config.currentNetwork.rpcUrl
            );
            
            // Initialize Supabase for database - use existing config if env vars not set
            const dbUrl = supabaseUrl || 'https://tbowrsbjoijdtpdgnoio.supabase.co';
            const dbKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib3dyc2Jqb2lqZHRwZGdub2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTM5NDQsImV4cCI6MjA2OTQyOTk0NH0.-A1uzl0uuzS5ZyHhRAffLEPo10PH1K7dwNPHNW5r1FQ';
            
            if (dbUrl && dbKey) {
                this.supabase = createClient(dbUrl, dbKey);
                console.log('✅ Database connected');
            }
            
            // Verify network
            const network = await this.provider.getNetwork();
            console.log(`✅ Connected to ${config.currentNetwork.name} (Chain ID: ${Number(network.chainId)})`);
            
            // Initialize house wallet
            await this.houseWallet.init();
            
            console.log('✅ Abstract wallet integration ready');
            
        } catch (error) {
            console.error('❌ Wallet integration init failed:', error);
        }
    }
    
    /**
     * 🔐 Authenticate player wallet
     */
    async authenticatePlayer(address, signature, message) {
        try {
            // Verify signature
            const recoveredAddress = ethers.verifyMessage(message, signature);
            
            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                throw new Error('Invalid signature');
            }
            
            // Get player balance on Abstract
            const balance = await this.provider.getBalance(address);
            
            // Store/update player info
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('crash_players')
                    .upsert({
                        wallet_address: address.toLowerCase(),
                        last_seen: new Date().toISOString(),
                        network: config.network,
                        balance_wei: balance.toString()
                    }, {
                        onConflict: 'wallet_address'
                    });
                    
                if (error) console.error('DB error:', error);
            }
            
            // Cache balance
            this.playerBalances.set(address.toLowerCase(), balance);
            
            return {
                success: true,
                address,
                balance: ethers.formatEther(balance),
                network: config.currentNetwork.name
            };
            
        } catch (error) {
            console.error('❌ Player authentication failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 💰 Process bet placement
     */
    async placeBet(playerAddress, betAmount, roundId) {
        try {
            const amountWei = ethers.parseEther(betAmount.toString());
            
            // Validate bet amount
            if (amountWei < ethers.parseEther(config.game.minBet.toString())) {
                throw new Error(`Minimum bet is ${config.game.minBet} ETH`);
            }
            if (amountWei > ethers.parseEther(config.game.maxBet.toString())) {
                throw new Error(`Maximum bet is ${config.game.maxBet} ETH`);
            }
            
            // Check player balance
            const balance = await this.provider.getBalance(playerAddress);
            if (balance < amountWei) {
                throw new Error('Insufficient balance');
            }
            
            // Generate bet ID
            const betId = `bet_${roundId}_${playerAddress}_${Date.now()}`;
            
            // Create bet record
            const bet = {
                id: betId,
                roundId,
                playerAddress: playerAddress.toLowerCase(),
                amount: amountWei.toString(),
                status: 'pending',
                timestamp: Date.now(),
                network: config.network
            };
            
            // Store pending bet
            this.pendingBets.set(betId, bet);
            
            // Store in database (temporarily disabled - using balance system instead)
            // if (this.supabase) {
            //     await this.supabase
            //         .from('crash_bets')
            //         .insert(bet);
            // }
            
            // Return bet details with payment instructions
            return {
                success: true,
                betId,
                amount: betAmount,
                paymentAddress: this.houseWallet.wallet.address,
                memo: betId,
                instructions: 'Send ETH to the payment address to confirm your bet'
            };
            
        } catch (error) {
            console.error('❌ Bet placement failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * ✅ Confirm bet payment
     */
    async confirmBetPayment(betId, txHash) {
        try {
            const bet = this.pendingBets.get(betId);
            if (!bet) {
                throw new Error('Bet not found');
            }
            
            // Validate payment
            const validation = await this.houseWallet.validateBetPayment(
                txHash,
                bet.amount,
                bet.playerAddress
            );
            
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Update bet status
            bet.status = 'confirmed';
            bet.txHash = txHash;
            bet.confirmationTime = Date.now();
            
            // Update database (temporarily disabled - using balance system instead)
            // if (this.supabase) {
            //     await this.supabase
            //         .from('crash_bets')
            //         .update({
            //             status: 'confirmed',
            //             tx_hash: txHash,
            //             confirmation_time: new Date().toISOString()
            //         })
            //         .eq('id', betId);
            // }
            
            console.log(`✅ Bet confirmed: ${betId}`);
            
            return {
                success: true,
                betId,
                confirmed: true
            };
            
        } catch (error) {
            console.error('❌ Bet confirmation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 💸 Process cash out
     */
    async processCashOut(playerId, roundId, multiplier, betAmount) {
        try {
            const winAmount = parseEther((betAmount * multiplier).toFixed(18)); // Convert to BigInt Wei
            const playerAddress = playerId; // Assuming playerId is the actual wallet address

                    // Use HOT WALLET for payouts (not house wallet)
        const hotWalletKey = process.env.HOT_WALLET_PRIVATE_KEY;
        if (!hotWalletKey) {
            throw new Error('HOT_WALLET_PRIVATE_KEY environment variable not configured');
        }

            // Initialize Viem wallet client for sending transactions
            // Ensure private key has 0x prefix for viem compatibility
            const formattedHotKey = hotWalletKey.startsWith('0x') ? hotWalletKey : `0x${hotWalletKey}`;
            const hotAccount = privateKeyToAccount(formattedHotKey);
            const walletClient = createWalletClient({
                account: hotAccount,
                chain: abstract,
                transport: http(abstract.rpcUrls.default.http[0]),
            });

            console.log(`💸 Processing payout: ${winAmount.toString()} wei (${(betAmount * multiplier).toFixed(4)} ETH) to ${playerAddress}`);
            console.log(`🔥 Using hot wallet: ${hotAccount.address}`);

            // Check hot wallet balance (critical for payouts)
            const hotBalance = await walletClient.getBalance({ address: hotAccount.address });
            if (hotBalance < winAmount) {
                console.error(`🚨 Insufficient hot wallet balance! Need: ${winAmount.toString()}, Have: ${hotBalance.toString()}`);
                console.error(`💡 Fund hot wallet from house wallet: 0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a`);
                throw new Error('Insufficient hot wallet balance for payout - transfer funds from house wallet');
            }

            // Warn if hot wallet balance will be low after this payout
            const balanceAfterPayout = hotBalance - winAmount;
            const lowThreshold = parseEther('0.5'); // 0.5 ETH threshold
            if (balanceAfterPayout < lowThreshold) {
                console.warn(`⚠️ Hot wallet will be low after payout: ${(Number(balanceAfterPayout) / 1e18).toFixed(4)} ETH remaining`);
                console.warn(`💡 Consider funding hot wallet from house wallet soon`);
            }

            // Send transaction using viem
            const hash = await walletClient.sendTransaction({
                to: playerAddress,
                value: winAmount,
            });

            // Record payout in Supabase
            if (this.supabase) {
                await this.supabase
                    .from('payouts')
                    .insert({
                        round_id: roundId,
                        user_id: playerId,
                        amount_wei: winAmount.toString(),
                        dest_address: playerAddress.toLowerCase(),
                        tx_hash: hash,
                        status: 'sent',
                        created_at: new Date().toISOString()
                    });
            }

            console.log(`📤 Payout transaction sent: ${hash}`);

            return {
                success: true,
                txHash: hash,
                amount: (betAmount * multiplier).toFixed(4)
            };

        } catch (error) {
            console.error('❌ Cash out failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 💸 Process winner payout (used by unified-production-integration)
     */
    async processWinnerPayout(playerAddress, originalBetEth, multiplier, roundId) {
        try {
            const { ethers } = require('ethers');
            const bet = Number(originalBetEth)
            const mult = Number(multiplier)
            if (!Number.isFinite(bet) || bet <= 0 || !Number.isFinite(mult) || mult < 1) {
                throw new Error('Invalid payout parameters')
            }
            const payoutWei = ethers.parseEther((bet * mult).toString())
            const receipt = await this.houseWallet.processPayout(
                playerAddress,
                payoutWei,
                roundId
            )
            if (this.supabase) {
                await this.supabase
                    .from('payouts')
                    .insert({
                        bet_id: null,
                        user_id: null,
                        amount_wei: payoutWei.toString(),
                        dest_address: playerAddress.toLowerCase(),
                        tx_hash: receipt.hash,
                        status: 'confirmed'
                    })
            }
            return { success: true, txHash: receipt.hash }
        } catch (error) {
            console.error('❌ processWinnerPayout failed:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * 📊 Get player statistics
     */
    async getPlayerStats(playerAddress) {
        try {
            if (!this.supabase) {
                return { success: false, error: 'Database not available' };
            }
            
            // Get total bets
            const { data: bets } = await this.supabase
                .from('crash_bets')
                .select('*')
                .eq('player_address', playerAddress.toLowerCase())
                .eq('status', 'confirmed');
            
            // Get total payouts
            const { data: payouts } = await this.supabase
                .from('crash_payouts')
                .select('*')
                .eq('player_address', playerAddress.toLowerCase());
            
            // Calculate stats
            const totalBets = bets?.length || 0;
            const totalWagered = bets?.reduce((sum, bet) => 
                sum + BigInt(bet.amount), 0n) || 0n;
            const totalWon = payouts?.reduce((sum, payout) => 
                sum + BigInt(payout.payout_amount), 0n) || 0n;
            
            return {
                success: true,
                stats: {
                    totalBets,
                    totalWagered: ethers.formatEther(totalWagered),
                    totalWon: ethers.formatEther(totalWon),
                    profit: ethers.formatEther(totalWon - totalWagered),
                    winRate: totalBets > 0 ? (payouts?.length || 0) / totalBets : 0
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to get player stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 🏦 Get house wallet info
     */
    async getHouseInfo() {
        return await this.houseWallet.getStats();
    }
    
    /**
     * 🔄 Monitor pending transactions
     */
    startTransactionMonitoring() {
        // Check pending bets every 10 seconds
        setInterval(async () => {
            for (const [betId, bet] of this.pendingBets) {
                if (bet.status === 'pending' && 
                    Date.now() - bet.timestamp > 300000) { // 5 minutes
                    // Expire old pending bets
                    this.pendingBets.delete(betId);
                    
                    // Temporarily disabled - using balance system instead
                    // if (this.supabase) {
                    //     await this.supabase
                    //         .from('crash_bets')
                    //         .update({ status: 'expired' })
                    //         .eq('id', betId);
                    // }
                }
            }
        }, 10000);
    }
}

// Singleton instance
let walletIntegration = null;

function getWalletIntegration() {
    if (!walletIntegration) {
        walletIntegration = new AbstractWalletIntegration(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return walletIntegration;
}

module.exports = {
    AbstractWalletIntegration,
    getWalletIntegration
};
