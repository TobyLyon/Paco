/**
 * 🎲 Verify Seeds Endpoint - Provably Fair Verification
 * 
 * Public endpoint for players to verify crash game fairness
 * Recomputes crash values from revealed server seeds
 */

const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

class VerifySeedsEndpoint {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.router = express.Router();
        this.setupRoutes();
        
        console.log('🎲 Verify seeds endpoint initialized');
    }

    setupRoutes() {
        // Public verification endpoint
        this.router.get('/verify/:roundId', this.handleVerifyRound.bind(this));
        
        // Batch verification
        this.router.post('/verify/batch', this.handleBatchVerify.bind(this));
        
        // Get verification page (HTML)
        this.router.get('/verify', this.handleVerificationPage.bind(this));
    }

    /**
     * 🔍 Verify a specific round
     */
    async handleVerifyRound(req, res) {
        try {
            const { roundId } = req.params;
            
            // Get round data from database
            const { data: roundData, error } = await this.supabase
                .from('crash_rounds')
                .select('*')
                .eq('id', roundId)
                .single();

            if (error || !roundData) {
                return res.status(404).json({
                    error: 'Round not found',
                    roundId
                });
            }

            // Verify the round
            const verification = this.verifyRound(roundData);
            
            res.json({
                roundId,
                verification,
                roundData: {
                    crashValue: roundData.crash_value,
                    serverSeed: roundData.server_seed,
                    serverSeedHash: roundData.server_seed_hash,
                    clientSeed: roundData.client_seed,
                    nonce: roundData.nonce,
                    timestamp: roundData.created_at
                }
            });

        } catch (error) {
            console.error('❌ Verification error:', error);
            res.status(500).json({
                error: 'Verification failed',
                message: error.message
            });
        }
    }

    /**
     * 📊 Batch verification for multiple rounds
     */
    async handleBatchVerify(req, res) {
        try {
            const { roundIds, limit = 100 } = req.body;
            
            if (!roundIds || !Array.isArray(roundIds)) {
                return res.status(400).json({
                    error: 'roundIds array is required'
                });
            }

            if (roundIds.length > limit) {
                return res.status(400).json({
                    error: `Maximum ${limit} rounds can be verified at once`
                });
            }

            // Get rounds data
            const { data: rounds, error } = await this.supabase
                .from('crash_rounds')
                .select('*')
                .in('id', roundIds);

            if (error) {
                throw error;
            }

            // Verify each round
            const verifications = rounds.map(round => ({
                roundId: round.id,
                verification: this.verifyRound(round),
                crashValue: round.crash_value
            }));

            res.json({
                total: verifications.length,
                verifications
            });

        } catch (error) {
            console.error('❌ Batch verification error:', error);
            res.status(500).json({
                error: 'Batch verification failed',
                message: error.message
            });
        }
    }

    /**
     * 🌐 Serve verification page HTML
     */
    async handleVerificationPage(req, res) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crash Game - Provably Fair Verification</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .verification-form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .result { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .error { background: #ffe8e8; padding: 15px; border-radius: 5px; margin: 10px 0; }
        input, button { padding: 10px; margin: 5px; }
        button { background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .code-block { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🎲 Provably Fair Verification</h1>
    
    <p>Verify the fairness of any crash game round by entering the round ID below. 
       Our system uses cryptographically secure random number generation that can be independently verified.</p>
    
    <div class="verification-form">
        <h3>Verify Round</h3>
        <input type="text" id="roundId" placeholder="Enter Round ID" style="width: 300px;">
        <button onclick="verifyRound()">Verify</button>
    </div>
    
    <div id="result"></div>
    
    <h3>How Verification Works</h3>
    <ol>
        <li><strong>Server Seed:</strong> Generated before each round using cryptographically secure randomness</li>
        <li><strong>Server Seed Hash:</strong> SHA-256 hash of the server seed, published before the round starts</li>
        <li><strong>Client Seed:</strong> Provided by players or generated from block hash</li>
        <li><strong>Nonce:</strong> Incremental counter for each round</li>
        <li><strong>Crash Calculation:</strong> Deterministic algorithm using all above inputs</li>
    </ol>
    
    <h3>Algorithm</h3>
    <div class="code-block">
// 1. Combine seeds and nonce
const combined = serverSeed + clientSeed + nonce;

// 2. Generate SHA-256 hash
const hash = SHA256(combined);

// 3. Convert to crash multiplier using our algorithm
const randomInt = parseInt(hash.substring(0, 10), 16);

if (randomInt % 33 === 0) {
    // 3% chance of instant crash (house edge)
    crashValue = 1.00;
} else {
    // Calculate multiplier
    const randomFloat = parseInt(hash.substring(10, 18), 16) / 0xFFFFFFFF;
    crashValue = Math.round((0.01 + (0.99 / randomFloat)) * 100) / 100;
}
    </div>
    
    <script>
        async function verifyRound() {
            const roundId = document.getElementById('roundId').value;
            const resultDiv = document.getElementById('result');
            
            if (!roundId) {
                resultDiv.innerHTML = '<div class="error">Please enter a round ID</div>';
                return;
            }
            
            try {
                resultDiv.innerHTML = '<div>Verifying...</div>';
                
                const response = await fetch(\`/verify/\${roundId}\`);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Verification failed');
                }
                
                const { verification, roundData } = data;
                
                resultDiv.innerHTML = \`
                    <div class="result">
                        <h3>Verification Result for Round \${roundId}</h3>
                        <p><strong>Status:</strong> \${verification.valid ? '✅ VALID' : '❌ INVALID'}</p>
                        <p><strong>Recorded Crash:</strong> \${roundData.crashValue}x</p>
                        <p><strong>Calculated Crash:</strong> \${verification.calculatedCrash}x</p>
                        <p><strong>Match:</strong> \${verification.valid ? 'Yes' : 'No'}</p>
                        
                        <h4>Seeds Used:</h4>
                        <p><strong>Server Seed:</strong> \${roundData.serverSeed}</p>
                        <p><strong>Server Seed Hash:</strong> \${roundData.serverSeedHash}</p>
                        <p><strong>Client Seed:</strong> \${roundData.clientSeed}</p>
                        <p><strong>Nonce:</strong> \${roundData.nonce}</p>
                        
                        <h4>Hash Verification:</h4>
                        <p><strong>Generated Hash:</strong> \${verification.generatedHash}</p>
                        <p><strong>Hash Match:</strong> \${verification.hashValid ? 'Yes' : 'No'}</p>
                    </div>
                \`;
                
            } catch (error) {
                resultDiv.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        // Allow Enter key to trigger verification
        document.getElementById('roundId').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyRound();
            }
        });
    </script>
</body>
</html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }

    /**
     * 🎲 Verify a round's fairness
     */
    verifyRound(roundData) {
        try {
            const {
                server_seed: serverSeed,
                server_seed_hash: serverSeedHash,
                client_seed: clientSeed,
                nonce,
                crash_value: recordedCrash
            } = roundData;

            // 1. Verify server seed hash
            const calculatedHash = crypto.createHash('sha256')
                .update(serverSeed)
                .digest('hex');

            const hashValid = calculatedHash === serverSeedHash;

            // 2. Calculate crash value from seeds
            const combinedInput = serverSeed + clientSeed + nonce.toString();
            const gameHash = crypto.createHash('sha256')
                .update(combinedInput)
                .digest('hex');

            const calculatedCrash = this.hashToCrashPoint(gameHash);

            // 3. Compare with recorded crash
            const valid = hashValid && Math.abs(calculatedCrash - recordedCrash) < 0.01;

            return {
                valid,
                hashValid,
                calculatedCrash,
                recordedCrash,
                generatedHash: gameHash,
                serverSeedHashMatch: hashValid
            };

        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * 🎯 Convert hash to crash point (same algorithm as game)
     */
    hashToCrashPoint(hash) {
        // Use first 10 chars for random int (32-bit range)
        const hexSubstring = hash.substring(0, 10);
        const randomInt = parseInt(hexSubstring, 16);
        
        // 3% house edge (1/33 instant crashes)
        if (randomInt % 33 === 0) {
            return 1.00;
        } else {
            // Generate random float from different part of hash
            const hexSubstring2 = hash.substring(10, 18);
            const randomInt2 = parseInt(hexSubstring2, 16);
            let randomFloat = randomInt2 / 0xFFFFFFFF;
            
            // Ensure we never get exactly 0
            while (randomFloat === 0) {
                const fallbackHex = hash.substring(18, 26);
                const fallbackInt = parseInt(fallbackHex, 16);
                randomFloat = fallbackInt / 0xFFFFFFFF;
                if (randomFloat === 0) randomFloat = 0.0001;
            }
            
            // Calculate crash value
            let crashValue = 0.01 + (0.99 / randomFloat);
            
            // Round to 2 decimal places
            crashValue = Math.round(crashValue * 100) / 100;
            
            // Apply max cap
            crashValue = Math.min(crashValue, 1000);
            
            return crashValue;
        }
    }

    /**
     * 📊 Get router for Express app
     */
    getRouter() {
        return this.router;
    }
}

module.exports = VerifySeedsEndpoint;
