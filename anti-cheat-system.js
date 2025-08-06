// ===== PACO JUMP ANTI-CHEAT SYSTEM =====
// Comprehensive security measures to prevent leaderboard manipulation

class AntiCheatSystem {
    constructor() {
        this.gameSession = null;
        this.lastSubmissionTime = 0;
        this.submissionCount = 0;
        this.gameStartTime = 0;
        this.totalGameTime = 0;
        this.platformsJumped = 0;
        this.maxRealisticScore = 50000; // Reasonable maximum for legitimate gameplay
        this.minGameDuration = 10000; // Minimum 10 seconds for valid game
        this.maxScorePerSecond = 500; // Maximum points per second (very generous)
        this.submissionCooldown = 5000; // 5 second cooldown between submissions
        this.maxSubmissionsPerHour = 20; // Maximum submissions per hour
        
        // Initialize session tracking
        this.initializeSession();
    }
    
    // Initialize a new game session with unique token
    initializeSession() {
        this.gameSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            events: [],
            verified: false,
            checksum: null
        };
        
        console.log('🛡️ Anti-cheat session initialized:', this.gameSession.id);
    }
    
    // Generate unique session ID
    generateSessionId() {
        return 'gs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Track game events for verification
    trackGameEvent(eventType, data = {}) {
        if (!this.gameSession) return;
        
        const event = {
            type: eventType,
            timestamp: Date.now(),
            data: data
        };
        
        this.gameSession.events.push(event);
        
        // Update counters
        switch(eventType) {
            case 'platform_jump':
                this.platformsJumped++;
                break;
            case 'game_start':
                this.gameStartTime = Date.now();
                break;
            case 'game_end':
                this.totalGameTime = Date.now() - this.gameStartTime;
                break;
        }
    }
    
    // Validate score before submission
    validateScore(score, gameStats = {}) {
        const validationResults = {
            valid: true,
            reasons: [],
            riskLevel: 'low'
        };
        
        // 1. Basic score validation
        if (score < 0) {
            validationResults.valid = false;
            validationResults.reasons.push('Negative score detected');
            validationResults.riskLevel = 'critical';
        }
        
        if (score > this.maxRealisticScore) {
            validationResults.valid = false;
            validationResults.reasons.push(`Score exceeds maximum realistic limit (${this.maxRealisticScore})`);
            validationResults.riskLevel = 'critical';
        }
        
        // 2. Time-based validation (more lenient)
        if (this.totalGameTime < 5000 && score > 1000) { // 5 seconds minimum for 1000+ scores
            validationResults.valid = false;
            validationResults.reasons.push('Score too high for game duration');
            validationResults.riskLevel = 'high';
        }
        
        const scorePerSecond = score / Math.max(this.totalGameTime / 1000, 1);
        if (scorePerSecond > this.maxScorePerSecond * 2) { // Double the limit for more leniency
            validationResults.valid = false;
            validationResults.reasons.push('Score per second exceeds realistic limits');
            validationResults.riskLevel = 'high';
        }
        
        // 3. Rate limiting
        const now = Date.now();
        if (now - this.lastSubmissionTime < this.submissionCooldown) {
            validationResults.valid = false;
            validationResults.reasons.push('Submission too frequent (rate limited)');
            validationResults.riskLevel = 'medium';
        }
        
        // 4. Hourly submission limit
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentSubmissions = this.getSubmissionHistory().filter(
            time => time > oneHourAgo
        ).length;
        
        if (recentSubmissions >= this.maxSubmissionsPerHour) {
            validationResults.valid = false;
            validationResults.reasons.push('Too many submissions in the last hour');
            validationResults.riskLevel = 'medium';
        }
        
        // 5. Game session validation
        if (!this.gameSession || !this.gameSession.verified) {
            validationResults.valid = false;
            validationResults.reasons.push('Invalid or unverified game session');
            validationResults.riskLevel = 'high';
        }
        
        // 6. Statistical anomaly detection
        if (this.detectStatisticalAnomalies(score, gameStats)) {
            validationResults.reasons.push('Statistical anomaly detected');
            validationResults.riskLevel = 'medium';
        }
        
        return validationResults;
    }
    
    // Detect statistical anomalies in gameplay
    detectStatisticalAnomalies(score, gameStats) {
        let anomalies = 0;
        
        // Check platforms jumped vs score ratio
        const expectedPlatformsPerScore = 0.1; // Rough estimate
        const actualRatio = this.platformsJumped / Math.max(score, 1);
        if (actualRatio < expectedPlatformsPerScore * 0.1) {
            anomalies++;
        }
        
        // Check for perfect scores (suspiciously round numbers)
        if (score > 1000 && score % 1000 === 0) {
            anomalies++;
        }
        
        // Check game events consistency
        const jumpEvents = this.gameSession?.events.filter(e => e.type === 'platform_jump').length || 0;
        if (jumpEvents < this.platformsJumped * 0.8) {
            anomalies++;
        }
        
        return anomalies >= 2; // Flag if 2+ anomalies detected
    }
    
    // Create secure score submission data
    createSecureSubmission(score, gameStats = {}) {
        const validation = this.validateScore(score, gameStats);
        
        if (!validation.valid) {
            throw new Error(`Score validation failed: ${validation.reasons.join(', ')}`);
        }
        
        // Generate submission checksum
        const submissionData = {
            score: score,
            sessionId: this.gameSession.id,
            gameTime: this.totalGameTime,
            platformsJumped: this.platformsJumped,
            timestamp: Date.now(),
            checksum: this.generateChecksum(score, this.gameSession.id, this.totalGameTime)
        };
        
        // Update tracking
        this.lastSubmissionTime = Date.now();
        this.addToSubmissionHistory(Date.now());
        
        return submissionData;
    }
    
    // Generate checksum for data integrity
    generateChecksum(score, sessionId, gameTime) {
        const data = `${score}:${sessionId}:${gameTime}:${this.platformsJumped}`;
        return this.simpleHash(data);
    }
    
    // Simple hash function (not cryptographically secure, but deters casual cheating)
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    // Verify game session integrity
    verifySession() {
        if (!this.gameSession) return false;
        
        const events = this.gameSession.events;
        const hasGameStart = events.some(e => e.type === 'game_start');
        const hasGameEnd = events.some(e => e.type === 'game_end');
        const hasGameplay = events.some(e => e.type === 'platform_jump');
        
        this.gameSession.verified = hasGameStart && hasGameEnd && hasGameplay;
        return this.gameSession.verified;
    }
    
    // Get submission history from localStorage
    getSubmissionHistory() {
        try {
            const history = localStorage.getItem('submission_history');
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    }
    
    // Add submission to history
    addToSubmissionHistory(timestamp) {
        const history = this.getSubmissionHistory();
        history.push(timestamp);
        
        // Keep only last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentHistory = history.filter(time => time > oneDayAgo);
        
        localStorage.setItem('submission_history', JSON.stringify(recentHistory));
    }
    
    // Reset session for new game
    resetSession() {
        this.gameSession = null;
        this.gameStartTime = 0;
        this.totalGameTime = 0;
        this.platformsJumped = 0;
        this.initializeSession();
    }
    
    // Get security report
    getSecurityReport() {
        return {
            sessionId: this.gameSession?.id,
            verified: this.gameSession?.verified,
            gameTime: this.totalGameTime,
            platformsJumped: this.platformsJumped,
            eventsTracked: this.gameSession?.events.length || 0,
            lastSubmission: this.lastSubmissionTime,
            submissionCount: this.submissionCount
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.AntiCheatSystem = AntiCheatSystem;
}

// Initialize global anti-cheat system
const antiCheat = new AntiCheatSystem();

console.log('🛡️ Anti-cheat system loaded and active');