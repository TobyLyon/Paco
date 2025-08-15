/**
 * 🛡️ Input Validation & Sanitization Utilities
 * 
 * Prevents injection attacks and validates all user inputs
 */

class InputValidator {
    /**
     * Sanitize and validate Ethereum address
     * @param {string} address - Raw address input
     * @returns {string} Sanitized lowercase address
     * @throws {Error} If address is invalid
     */
    static sanitizeAddress(address) {
        if (!address || typeof address !== 'string') {
            throw new Error('Invalid address format');
        }
        
        // Remove any non-hex characters except 0x prefix
        let cleaned = address.toLowerCase().trim();
        
        // Ensure 0x prefix
        if (!cleaned.startsWith('0x')) {
            if (cleaned.match(/^[0-9a-f]{40}$/)) {
                cleaned = '0x' + cleaned;
            } else {
                throw new Error('Invalid address format - missing 0x prefix');
            }
        }
        
        // Validate final format
        if (!cleaned.match(/^0x[0-9a-f]{40}$/)) {
            throw new Error('Invalid Ethereum address format');
        }
        
        return cleaned;
    }
    
    /**
     * Validate and sanitize bet amount
     * @param {any} amount - Raw amount input
     * @returns {number} Validated amount
     * @throws {Error} If amount is invalid
     */
    static validateAmount(amount) {
        let num;
        
        if (typeof amount === 'string') {
            // Remove any non-numeric characters except decimal point
            const cleaned = amount.replace(/[^0-9.]/g, '');
            num = parseFloat(cleaned);
        } else {
            num = parseFloat(amount);
        }
        
        if (isNaN(num) || num <= 0) {
            throw new Error('Amount must be a positive number');
        }
        
        if (num < 0.001) {
            throw new Error('Minimum bet amount is 0.001 ETH');
        }
        
        if (num > 100) {
            throw new Error('Maximum bet amount is 100 ETH');
        }
        
        // Round to 6 decimal places to prevent precision issues
        return Math.round(num * 1000000) / 1000000;
    }
    
    /**
     * Validate payout multiplier
     * @param {any} multiplier - Raw multiplier input
     * @returns {number} Validated multiplier
     * @throws {Error} If multiplier is invalid
     */
    static validateMultiplier(multiplier) {
        const num = parseFloat(multiplier);
        
        if (isNaN(num) || num < 1.01) {
            throw new Error('Multiplier must be at least 1.01x');
        }
        
        if (num > 1000) {
            throw new Error('Maximum multiplier is 1000x');
        }
        
        // Round to 2 decimal places
        return Math.round(num * 100) / 100;
    }
    
    /**
     * Validate round ID
     * @param {any} roundId - Raw round ID input
     * @returns {number} Validated round ID
     * @throws {Error} If round ID is invalid
     */
    static validateRoundId(roundId) {
        const num = parseInt(roundId);
        
        if (isNaN(num) || num < 1) {
            throw new Error('Invalid round ID');
        }
        
        return num;
    }
    
    /**
     * Sanitize string for database storage
     * @param {string} input - Raw string input
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} Sanitized string
     */
    static sanitizeString(input, maxLength = 100) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        
        // Remove potentially dangerous characters
        const sanitized = input
            .replace(/[<>'"]/g, '') // Remove HTML/SQL injection chars
            .replace(/\x00/g, '') // Remove null bytes
            .trim()
            .substring(0, maxLength);
        
        return sanitized;
    }
    
    /**
     * Validate transaction hash
     * @param {string} txHash - Transaction hash
     * @returns {string} Validated hash
     * @throws {Error} If hash is invalid
     */
    static validateTxHash(txHash) {
        if (!txHash || typeof txHash !== 'string') {
            throw new Error('Transaction hash is required');
        }
        
        const cleaned = txHash.toLowerCase();
        
        if (!cleaned.match(/^0x[0-9a-f]{64}$/)) {
            throw new Error('Invalid transaction hash format');
        }
        
        return cleaned;
    }
}

module.exports = InputValidator;
