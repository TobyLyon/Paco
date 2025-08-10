/**
 * 🎰 PacoRocko Crash Client
 * 
 * WebSocket client for real-time crash game communication
 */

class CrashGameClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRound = null;
        this.gameState = 'waiting';
        this.currentMultiplier = 1.0;
        this.playerBet = null;
        this.roundHistory = [];
        
        // HYBRID MODE: Disable multiplier updates by default (local game controls display)
        this.disableMultiplierUpdates = false; // Will be set to true externally
        
        // Event handlers
        this.onGameStateUpdate = null;
        this.onMultiplierUpdate = null;
        this.onRoundStart = null;
        this.onRoundCrash = null;
        this.onBetPlaced = null;
        this.onCashOut = null;
        this.onError = null;
        
        this.init();
    }

    /**
     * 🚀 Initialize the WebSocket connection
     */
    init() {
        console.log('🎰 Initializing crash game client...');
        
        try {
            // Connect to WebSocket server - Use production backend URL
            let wsUrl;
            
            // Check if we're running locally (for development)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.hostname;
                const port = parseInt(window.location.port) + 1; // Local dev server
                wsUrl = `${protocol}//${host}:${port}`;
            } else {
                // Production: Connect to your Render backend
                wsUrl = 'https://paco-x57j.onrender.com'; // Your live Render backend
            }
            
            console.log('🔗 Connecting to:', wsUrl);
            
            this.socket = io(wsUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true,
                path: '/crash-ws'
            });
            
            this.setupSocketListeners();
            
        } catch (error) {
            console.error('❌ Failed to initialize crash client:', error);
            this.showError('Failed to connect to game server');
        }
    }

    /**
     * 🔌 Setup WebSocket event listeners
     */
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to crash game server for betting');
            console.log('🎮 Local game system handling multiplier display');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Notify connection callback
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate({ connected: true, isConnected: true });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from crash game server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });

        // Handle specific crash game events
        this.socket.on('game_state', (data) => {
            this.handleGameState(data);
        });

        // Enhanced server event names
        this.socket.on('round_started', (data) => {
            this.handleRoundStart({ roundId: data.roundId });
        });

        this.socket.on('multiplier_update', (data) => {
            this.handleMultiplierUpdate(data);
        });

        this.socket.on('round_crashed', (data) => {
            this.handleRoundCrash({ crashPoint: data.crashPoint });
        });

        this.socket.on('bet_placed', (data) => {
            this.handleBetPlaced(data);
        });

        this.socket.on('bet_placed_global', (data) => {
            // Update players list / stats if needed
        });

        this.socket.on('cashout_success', (data) => {
            this.handleOwnCashOut(data);
        });

        this.socket.on('authenticated', (data) => {
            this.handleAuthentication(data);
        });

        this.socket.on('live_betting_table', (data) => {
            this.handleLiveBettingTable(data);
        });

        this.socket.on('crash_history', (data) => {
            this.handleCrashHistory(data);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.showError('Connection failed. Retrying...');
        });

        // Setup heartbeat
        setInterval(() => {
            if (this.socket && this.isConnected) {
                this.socket.emit('ping');
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * 📨 Handle messages from server
     */
    handleServerMessage(message) {
        const { type, data, timestamp } = message;
        
        console.log(`📨 Received: ${type}`, data);

        switch (type) {
            case 'gameState':
                this.handleGameState(data);
                break;
                
            case 'roundStarted':
                this.handleRoundStart(data);
                break;
                
            case 'multiplierUpdate':
                this.handleMultiplierUpdate(data);
                break;
                
            case 'roundCrashed':
                this.handleRoundCrash(data);
                break;
                
            case 'betPlaced':
                this.handleBetPlaced(data);
                break;
                
            case 'playerCashedOut':
                this.handlePlayerCashOut(data);
                break;
                
            case 'cashOutSuccess':
                this.handleOwnCashOut(data);
                break;
                
            case 'authenticated':
                this.handleAuthentication(data);
                break;
                
            case 'error':
                this.handleError(data);
                break;
                
            default:
                console.warn('Unknown message type:', type);
        }
    }

    /**
     * 🎮 Handle game state updates
     */
    handleGameState(data) {
        // Support both legacy and enhanced payloads
        const phase = data.status || data.currentPhase || 'waiting';
        
        // Map backend phases to frontend states
        if (phase === 'betting') {
            this.gameState = 'betting';  // Accepting bets
        } else if (phase === 'waiting') {
            this.gameState = 'pending';  // Between rounds
        } else if (phase === 'running' || phase === 'flying') {
            this.gameState = 'running';  // Game in progress
        } else if (phase === 'crashed' || phase === 'ended') {
            this.gameState = 'crashed'; // Round ended
        } else {
            this.gameState = phase;      // Use backend phase as-is
        }
        
        this.currentMultiplier = data.currentMultiplier || 1.0;
        this.currentRound = data.roundId;
        
        console.log(`🎮 Game state updated: ${phase} → ${this.gameState}`);
        
        // Update UI
        document.getElementById('currentRoundId').textContent = 
            data.roundId ? data.roundId.substring(0, 8) + '...' : '-';
        document.getElementById('gameStatus').textContent = this.gameState;
        
        if (this.onGameStateUpdate) {
            this.onGameStateUpdate(data);
        }
    }

    /**
     * 🚀 Handle round start
     */
    handleRoundStart(data) {
        this.gameState = 'running';
        this.currentRound = data.roundId;
        this.currentMultiplier = 1.0;
        
        console.log('🚀 Round started:', data.roundId);
        
        // Update UI
        document.getElementById('gameStatus').textContent = 'Running';
        document.getElementById('gameStateMessage').textContent = 'Round in progress...';
        document.getElementById('countdownTimer').style.display = 'none';
        
        // Show cash out button if player has bet
        if (this.playerBet && !this.playerBet.cashedOut) {
            document.getElementById('cashOutBtn').style.display = 'block';
        }
        
        if (this.onRoundStart) {
            this.onRoundStart(data);
        }
    }

    /**
     * 📈 Handle multiplier updates
     */
    handleMultiplierUpdate(data) {
        this.currentMultiplier = data.multiplier;
        
        // COMPLETE ISOLATION: Never update display from server (local game owns it)
        if (this.disableMultiplierUpdates) {
            // Server values ignored completely for display
            if (Math.random() < 0.02) { // 2% chance to log for debugging
                console.log(`📡 Server multiplier: ${data.multiplier.toFixed(2)}x (IGNORED - local controls display)`);
            }
            // Don't even try to touch the display element
            return;
        }
        
        // Legacy mode: Only if specifically not disabled (shouldn't happen in hybrid mode)
        if (data.multiplier >= 1.0) {
            const multiplierElement = document.getElementById('multiplierValue');
            if (multiplierElement) {
                multiplierElement.textContent = data.multiplier.toFixed(2) + 'x';
                console.log(`📡 Server Multiplier: ${data.multiplier.toFixed(2)}x (legacy mode)`);
            }
        }
        
        // Always update potential winnings even if display is disabled
        if (this.playerBet && !this.playerBet.cashedOut) {
            const potentialWin = (this.playerBet.amount * data.multiplier).toFixed(4);
            const potentialWinElement = document.getElementById('potentialWin');
            if (potentialWinElement) {
                potentialWinElement.textContent = potentialWin + ' ETH';
            }
        }
        
        if (this.onMultiplierUpdate) {
            this.onMultiplierUpdate(data);
        }
    }

    /**
     * 💥 Handle round crash
     */
    handleRoundCrash(data) {
        this.gameState = 'crashed';
        
        console.log('💥 Server round crashed at:', data.crashPoint);
        
        // HYBRID MODE: Don't update UI if local game controls display
        if (this.disableMultiplierUpdates) {
            console.log('🔒 Server crash UI updates DISABLED - local game controls crash display');
            
            // Only handle betting results, not display
            if (this.playerBet) {
                if (this.playerBet.cashedOut) {
                    this.showNotification(`🎉 You won ${this.playerBet.payout.toFixed(4)} ETH!`, 'success');
                } else {
                    this.showNotification('💥 Your bet was lost in the crash', 'error');
                }
                this.playerBet = null;
            }
            
            if (this.onRoundCrash) {
                this.onRoundCrash(data);
            }
            return;
        }
        
        // Legacy mode: Update UI (only if not in hybrid mode)
        document.getElementById('gameStatus').textContent = 'Crashed';
        document.getElementById('gameStateMessage').textContent = 
            `Crashed at ${data.crashPoint.toFixed(2)}x`;
        document.getElementById('multiplierValue').classList.add('crashed');
        document.getElementById('cashOutBtn').style.display = 'none';
        
        // Add to history
        this.addToHistory(data.crashPoint);
        
        // Check if player won or lost
        if (this.playerBet) {
            if (this.playerBet.cashedOut) {
                this.showNotification(`🎉 You won ${this.playerBet.payout.toFixed(4)} ETH!`, 'success');
            } else {
                this.showNotification('💥 Your bet was lost in the crash', 'error');
            }
            this.playerBet = null;
        }
        
        // Reset for next round
        setTimeout(() => {
            document.getElementById('multiplierValue').classList.remove('crashed');
            this.prepareForNextRound();
        }, 3000);
        
        if (this.onRoundCrash) {
            this.onRoundCrash(data);
        }
    }

    /**
     * 💰 Handle bet placement
     */
    handleBetPlaced(data) {
        // Update total bet amount
        document.getElementById('totalBetAmount').textContent = 
            data.totalAmount.toFixed(4) + ' ETH';
        document.getElementById('playerCount').textContent = data.totalBets;
        
        if (this.onBetPlaced) {
            this.onBetPlaced(data);
        }
    }

    /**
     * 🏃‍♂️ Handle other player cash out
     */
    handlePlayerCashOut(data) {
        console.log('🏃‍♂️ Player cashed out:', data.playerId, 'at', data.multiplier + 'x');
        
        if (this.onCashOut) {
            this.onCashOut(data);
        }
    }

    /**
     * ✅ Handle own cash out success
     */
    handleOwnCashOut(data) {
        if (this.playerBet) {
            this.playerBet.cashedOut = true;
            this.playerBet.multiplier = data.multiplier;
            this.playerBet.payout = data.payout;
        }
        
        document.getElementById('cashOutBtn').style.display = 'none';
        this.showNotification(`✅ Cashed out at ${data.multiplier.toFixed(2)}x for ${data.payout.toFixed(4)} ETH!`, 'success');
    }

    /**
     * 🔐 Handle authentication response
     */
    handleAuthentication(data) {
        if (data.success) {
            console.log('✅ Authenticated with wallet:', data.walletAddress);
            this.showNotification('✅ Wallet connected successfully!', 'success');
        }
    }

    /**
     * ❌ Handle errors
     */
    handleError(data) {
        console.error('❌ Game error:', data);
        this.showError(data.message || 'Unknown error occurred');
        
        if (this.onError) {
            this.onError(data);
        }
    }

    /**
     * 💰 Place a bet
     */
    async placeBet(amount) {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return false;
        }

        // HYBRID MODE: Check local game state with extended betting window
        if (this.disableMultiplierUpdates) {
            const localGameState = window.liveGameSystem?.gameState;
            const gameMultiplier = window.liveGameSystem?.currentMultiplier || 1.0;
            console.log(`🎮 Hybrid mode - Local game state: "${localGameState}", Server state: "${this.gameState}", Multiplier: ${gameMultiplier}x`);
            
            if (localGameState === 'betting') {
                console.log(`✅ Bet allowed - Local game in betting phase`);
            } else if (localGameState === 'running' && gameMultiplier < 1.2) {
                // Allow "late betting" if round just started (< 1.2x multiplier)
                console.log(`✅ Late bet allowed - Round just started (${gameMultiplier}x)`);
            } else if (localGameState === 'running' && gameMultiplier >= 1.2) {
                this.showError(`Too late to bet - round is at ${gameMultiplier}x`);
                console.log(`🚫 Bet rejected - Round too advanced (${gameMultiplier}x)`);
                return false;
            } else if (localGameState === 'crashed') {
                this.showError(`Cannot bet now - round crashed`);
                console.log(`🚫 Bet rejected - Local game is "${localGameState}"`);
                return false;
            } else {
                console.log(`⚠️ Local game state unclear (${localGameState}), checking server state`);
            }
        } else {
            // Legacy mode: Use server state
            if (this.gameState === 'running' || this.gameState === 'crashed') {
                this.showError(`Cannot bet now - round is ${this.gameState}`);
                console.log(`🚫 Bet rejected - Round is "${this.gameState}"`);
                return false;
            }
            
            if (!['betting', 'waiting', 'pending', undefined].includes(this.gameState)) {
                this.showError(`Cannot bet now - game state: "${this.gameState}"`);
                console.log(`🚫 Bet rejected - Game state: "${this.gameState}"`);
                return false;
            }
        }
        
        console.log(`✅ Bet validation passed - Game state: "${this.gameState}"`);
        console.log(`🔗 Connection status: ${this.isConnected}`);
        console.log(`🎰 Current round: ${this.currentRound}`);

        try {
            // Check if wallet is connected
            if (!window.realWeb3Modal || !window.realWeb3Modal.isWalletConnected()) {
                this.showError('Please connect your wallet first');
                return false;
            }

            this.showNotification('🎰 Processing bet transaction...', 'info');
            this.showTransactionStatus('pending', 'Waiting for MetaMask approval...', 'Please approve the transaction in your wallet');
            
            // Send transaction to Abstract L2 - Use correct house wallet with advanced retry logic
            const houseWallet = '0x1f8B1c4D05eF17Ebaa1E572426110146691e6C5a'; // Your house wallet
            
            // Advanced RPC error handling for Abstract Network
            let txResult;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`🔄 Transaction attempt ${attempts}/${maxAttempts}`);
                
                try {
                    // Different gas strategies for each attempt
                    let gasConfig;
                    switch (attempts) {
                        case 1:
                            // First attempt: Let MetaMask estimate everything
                            gasConfig = {};
                            console.log('📊 Attempt 1: MetaMask auto-estimation');
                            break;
                        case 2:
                            // Second attempt: Manual gas limit with auto price
                            gasConfig = {
                                gasLimit: 100000,
                                gasPrice: null
                            };
                            console.log('📊 Attempt 2: Manual gas limit 100k');
                            break;
                        case 3:
                            // Third attempt: Conservative manual settings
                            gasConfig = {
                                gasLimit: 21000, // Standard ETH transfer
                                gasPrice: '20000000000' // 20 gwei
                            };
                            console.log('📊 Attempt 3: Conservative settings');
                            break;
                    }
                    
                    // Debug current network state
                    if (window.ethereum) {
                        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        const balance = await window.ethereum.request({ 
                            method: 'eth_getBalance', 
                            params: [this.playerAddress, 'latest'] 
                        });
                        const balanceEth = parseInt(balance, 16) / 1e18;
                        console.log(`🌐 Network: ${chainId}, Balance: ${balanceEth.toFixed(6)} ETH`);
                        
                        // Check if we're on Abstract mainnet
                        if (chainId !== '0xab5') {
                            console.log('⚠️ Not on Abstract mainnet (0xab5). Current chain:', chainId);
                            throw new Error('Please switch to Abstract mainnet (Chain ID: 0xab5)');
                        }
                        
                        // Check if balance is sufficient for bet + gas
                        const betAmountEth = parseInt(amount.toString(), 16) / 1e18;
                        const estimatedGasEth = 0.001; // Conservative estimate
                        if (balanceEth < (betAmountEth + estimatedGasEth)) {
                            throw new Error(`Insufficient balance. Need ${(betAmountEth + estimatedGasEth).toFixed(6)} ETH, have ${balanceEth.toFixed(6)} ETH`);
                        }
                    }
                    
                    txResult = await window.realWeb3Modal.sendTransaction(
                        houseWallet,
                        amount,
                        gasConfig
                    );
                    
                    console.log('✅ Transaction successful:', txResult);
                    
                    // Report success to network health monitor
                    if (window.NetworkHealthMonitor) {
                        window.NetworkHealthMonitor.recordSuccess();
                    }
                    
                    break; // Success, exit retry loop
                    
                } catch (error) {
                    console.error(`❌ Attempt ${attempts} failed:`, error);
                    
                    // Report failure to network health monitor
                    if (window.NetworkHealthMonitor) {
                        window.NetworkHealthMonitor.recordFailure();
                    }
                    
                    // Analyze error type
                    if (error.message.includes('Internal JSON-RPC error')) {
                        console.log('🔍 RPC Error detected - this is likely an Abstract Network issue');
                        
                        // If it's the last attempt, show user-friendly message
                        if (attempts === maxAttempts) {
                            console.log('💡 Abstract Network RPC Issue - Suggested solutions:');
                            console.log('1. 🔄 Refresh the page and reconnect your wallet');
                            console.log('2. 🌐 Check Abstract Network status at https://status.abs.xyz');
                            console.log('3. 💰 Ensure sufficient ETH balance for gas fees');
                            console.log('4. ⏰ Try again in a few minutes');
                            console.log('5. 🔗 Try switching MetaMask RPC endpoint');
                            
                            // Show user-friendly modal message
                            this.showNotification(
                                '❌ Transaction Failed: Abstract Network RPC Error. Try refreshing the page and reconnecting your wallet, or check Abstract Network status.',
                                'error',
                                10000
                            );
                            
                            throw new Error(`Transaction failed after ${maxAttempts} attempts. This appears to be an Abstract Network RPC issue. Please try refreshing the page or check the console for detailed troubleshooting steps.`);
                        }
                    } else {
                        // Different error type, don't retry
                        throw error;
                    }
                    
                    // Wait before retry
                    if (attempts < maxAttempts) {
                        console.log(`⏱️ Waiting 2 seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            
            // Verify transaction was successful
            if (!txResult || !txResult.hash) {
                throw new Error('Transaction failed');
            }
            
            // Wait for confirmation
            const receipt = await txResult.wait();
            
            if (receipt.status !== 1) {
                throw new Error('Transaction failed on blockchain');
            }
            
            this.showNotification('✅ Transaction confirmed! Placing bet...', 'success');
            
            // Now notify the game server with verified transaction
            this.socket.emit('place_bet', {
                betAmount: amount,
                autoPayoutMultiplier: null, // Can be set for auto-cashout
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                playerAddress: window.realWeb3Modal?.address
            });

            this.playerBet = {
                amount: amount,
                cashedOut: false,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };

            // Update UI
            document.getElementById('yourBetAmount').textContent = amount.toFixed(4) + ' ETH';
            document.getElementById('potentialWin').textContent = amount.toFixed(4) + ' ETH';
            document.getElementById('betStatus').style.display = 'block';
            document.getElementById('placeBetBtn').disabled = true;

            // Show success status
            this.showTransactionStatus('success', 'Bet placed successfully!', `${amount.toFixed(4)} ETH bet confirmed`);

            return true;

        } catch (error) {
            console.error('❌ Failed to place bet:', error);
            
            // If it's an RPC error, suggest solutions
            if (error.message.includes('RPC') || error.message.includes('JSON-RPC')) {
                this.suggestRPCSwitch();
            }
            
            // Handle specific error types
            let errorMessage = 'Failed to place bet';
            if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient ETH balance';
            } else if (error.message.includes('user rejected')) {
                errorMessage = 'Transaction cancelled';
            } else if (error.message.includes('House wallet not configured')) {
                errorMessage = 'Game temporarily unavailable';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
            this.showTransactionStatus('error', 'Transaction failed', errorMessage);
            return false;
        }
    }

    /**
     * 🔗 Helper function to suggest Alternative Abstract RPC endpoints
     */
    suggestRPCSwitch() {
        const abstractRPCs = [
            {
                name: 'Abstract Mainnet (Primary)',
                url: 'https://api.mainnet.abs.xyz',
                chainId: '0xab5'
            },
            {
                name: 'Abstract Mainnet (Alternative)',
                url: 'https://rpc.abs.xyz', 
                chainId: '0xab5'
            }
        ];
        
        console.log('🔗 Alternative Abstract RPC endpoints you can try:');
        abstractRPCs.forEach((rpc, index) => {
            console.log(`${index + 1}. ${rpc.name}: ${rpc.url}`);
        });
        
        console.log('📋 To switch RPC in MetaMask:');
        console.log('1. Open MetaMask > Settings > Networks');
        console.log('2. Find "Abstract" and click Edit');
        console.log('3. Try changing RPC URL to one above');
        console.log('4. Chain ID: 2741 (0xab5)');
        console.log('5. Currency: ETH');
        console.log('6. Block Explorer: https://explorer.abs.xyz');
        
        // Also show a user notification
        this.showNotification(
            '🔗 RPC Issue Detected. Check console for alternative RPC endpoints to try in MetaMask.',
            'warning',
            8000
        );
    }

    /**
     * 🏃‍♂️ Cash out current bet
     */
    cashOut() {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return;
        }

        if (!this.playerBet || this.playerBet.cashedOut) {
            this.showError('No active bet to cash out');
            return;
        }

        if (this.gameState !== 'running') {
            this.showError('Cannot cash out - round not running');
            return;
        }

        this.socket.emit('cash_out');
    }

    /**
     * 🔐 Authenticate with wallet
     */
    authenticate(walletAddress, token) {
        if (!this.isConnected) {
            this.showError('Not connected to game server');
            return;
        }

        this.socket.emit('authenticate', {
            address: walletAddress,
            signature: token.signature || token, // compatibility if we pass a signed message
            message: token.message || `Login to PacoRocko at ${new Date().toISOString()}`
        });
    }

    /**
     * 🔄 Prepare for next round
     */
    prepareForNextRound() {
        this.gameState = 'waiting';
        document.getElementById('gameStatus').textContent = 'Waiting';
        document.getElementById('gameStateMessage').textContent = 'Waiting for next round...';
        document.getElementById('multiplierValue').textContent = '1.00x';
        document.getElementById('betStatus').style.display = 'none';
        document.getElementById('placeBetBtn').disabled = false;
        
        // Start countdown
        this.startCountdown(5);
    }

    /**
     * ⏰ Start unified betting countdown (5 seconds)
     */
    startCountdown(seconds = 5) {
        const countdownElement = document.getElementById('countdownTimer');
        const countdownValue = document.getElementById('countdownValue');
        
        countdownElement.style.display = 'block';
        document.getElementById('gameStatus').textContent = 'Place Your Bets';
        
        let remaining = seconds;
        const interval = setInterval(() => {
            countdownValue.textContent = remaining;
            
            if (remaining > 0) {
                document.getElementById('gameStateMessage').textContent = `🎰 Next round starting in ${remaining}s - Place your bets now!`;
            } else {
                document.getElementById('gameStateMessage').textContent = `🚀 Round starting...`;
            }
            
            remaining--;
            
            if (remaining < 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';
                this.gameState = 'pending';
                document.getElementById('gameStatus').textContent = 'Accepting Bets';
                document.getElementById('gameStateMessage').textContent = 'Bets accepted!';
            }
        }, 1000);
    }

    /**
     * 📊 Add crash point to history
     */
    addToHistory(crashPoint) {
        this.roundHistory.unshift(crashPoint);
        if (this.roundHistory.length > 20) {
            this.roundHistory = this.roundHistory.slice(0, 20);
        }
        
        this.updateHistoryDisplay();
    }

    /**
     * 🎨 Update history display
     */
    updateHistoryDisplay() {
        const historyContainer = document.getElementById('roundHistory');
        historyContainer.innerHTML = '';
        
        this.roundHistory.forEach(crashPoint => {
            const item = document.createElement('div');
            item.className = 'round-item';
            item.textContent = crashPoint.toFixed(2) + 'x';
            
            // Color based on multiplier
            if (crashPoint < 2) {
                item.classList.add('low');
            } else if (crashPoint < 10) {
                item.classList.add('medium');
            } else {
                item.classList.add('high');
            }
            
            historyContainer.appendChild(item);
        });
    }

    /**
     * 🔄 Update connection status UI
     */
    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (connected) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Connected';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Disconnected';
        }
    }

    /**
     * 📢 Show notification
     */
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * 📊 Handle live betting table updates
     */
    handleLiveBettingTable(data) {
        // Update the live players display
        const playersContainer = document.getElementById('playersList');
        if (playersContainer) {
            playersContainer.innerHTML = '';
            
            data.forEach(bettor => {
                const playerElement = document.createElement('div');
                playerElement.className = 'player-item';
                
                const statusClass = bettor.status === 'cashed_out' ? 'cashed-out' : 'active';
                
                playerElement.innerHTML = `
                    <div class="player-address">${bettor.username}</div>
                    <div class="player-bet">${bettor.betAmount.toFixed(4)} ETH</div>
                    <div class="player-status ${statusClass}">${bettor.status}</div>
                `;
                
                playersContainer.appendChild(playerElement);
            });
        }
    }

    /**
     * 📈 Handle crash history updates
     */
    handleCrashHistory(history) {
        this.roundHistory = history;
        this.updateHistoryDisplay();
    }

    /**
     * ❌ Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 📱 Show transaction status feedback
     */
    showTransactionStatus(type, message, detail) {
        const statusElement = document.getElementById('transactionStatus');
        if (!statusElement) return;

        const statusIcon = statusElement.querySelector('.status-icon');
        const statusText = statusElement.querySelector('.status-text');
        const statusDetail = statusElement.querySelector('.status-detail');

        // Reset classes
        statusElement.className = 'transaction-status';
        
        switch (type) {
            case 'pending':
                statusIcon.textContent = '⏳';
                statusElement.classList.add('pending');
                break;
            case 'success':
                statusIcon.textContent = '✅';
                statusElement.classList.add('success');
                break;
            case 'error':
                statusIcon.textContent = '❌';
                statusElement.classList.add('error');
                break;
        }

        statusText.textContent = message;
        if (detail) statusDetail.textContent = detail;
        
        statusElement.style.display = 'flex';

        // Auto-hide success/error messages after 5 seconds
        if (type !== 'pending') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 🔒 Hide transaction status
     */
    hideTransactionStatus() {
        const statusElement = document.getElementById('transactionStatus');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    /**
     * 🧹 Cleanup
     */
    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global instance
window.CrashGameClient = CrashGameClient;

// Note: Initialization is handled in the HTML file to avoid conflicts