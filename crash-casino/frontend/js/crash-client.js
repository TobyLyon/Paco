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
            // Connect to WebSocket server  
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = parseInt(window.location.port) + 1; // Crash server runs on port + 1
            const wsUrl = `${protocol}//${host}:${port}`;
            
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
            console.log('✅ Connected to crash game server');
            this.isConnected = true;
            this.updateConnectionStatus(true);
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

        this.socket.on('new_round_started', (data) => {
            this.handleRoundStart(data);
        });

        this.socket.on('multiplier_update', (data) => {
            this.handleMultiplierUpdate(data);
        });

        this.socket.on('game_crashed', (data) => {
            this.handleRoundCrash(data);
        });

        this.socket.on('bet_placed', (data) => {
            this.handleBetPlaced(data);
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
        this.gameState = data.status || 'waiting';
        this.currentMultiplier = data.currentMultiplier || 1.0;
        this.currentRound = data.roundId;
        
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
        
        // Update multiplier display
        const multiplierElement = document.getElementById('multiplierValue');
        multiplierElement.textContent = data.multiplier.toFixed(2) + 'x';
        
        // Update potential winnings
        if (this.playerBet && !this.playerBet.cashedOut) {
            const potentialWin = (this.playerBet.amount * data.multiplier).toFixed(4);
            document.getElementById('potentialWin').textContent = potentialWin + ' ETH';
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
        
        console.log('💥 Round crashed at:', data.crashPoint);
        
        // Update UI
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

        if (this.gameState !== 'pending') {
            this.showError('Cannot place bet - round not accepting bets');
            return false;
        }

        try {
            // In a real implementation, this would interact with the smart contract first
            // For now, we'll simulate the transaction
            const txHash = '0x' + Math.random().toString(16).substring(2, 66);
            
            this.socket.emit('place_bet', {
                betAmount: amount,
                autoPayoutMultiplier: null // Can be set for auto-cashout
            });

            this.playerBet = {
                amount: amount,
                cashedOut: false,
                txHash: txHash
            };

            // Update UI
            document.getElementById('yourBetAmount').textContent = amount.toFixed(4) + ' ETH';
            document.getElementById('potentialWin').textContent = amount.toFixed(4) + ' ETH';
            document.getElementById('betStatus').style.display = 'block';
            document.getElementById('placeBetBtn').disabled = true;

            return true;

        } catch (error) {
            console.error('❌ Failed to place bet:', error);
            this.showError('Failed to place bet: ' + error.message);
            return false;
        }
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
            walletAddress: walletAddress,
            token: token
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
     * ⏰ Start countdown timer
     */
    startCountdown(seconds) {
        const countdownElement = document.getElementById('countdownTimer');
        const countdownValue = document.getElementById('countdownValue');
        
        countdownElement.style.display = 'block';
        
        let remaining = seconds;
        const interval = setInterval(() => {
            countdownValue.textContent = remaining;
            remaining--;
            
            if (remaining < 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';
                this.gameState = 'pending';
                document.getElementById('gameStatus').textContent = 'Accepting Bets';
                document.getElementById('gameStateMessage').textContent = 'Place your bets!';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.crashClient = new CrashGameClient();
    });
} else {
    window.crashClient = new CrashGameClient();
}