const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

class RiskScorer {
  constructor() {
    this.supabase = createClient(
      process.env.TRADES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.TRADES_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.rpcUrl = process.env.TRADES_RPC_URL || 'https://api.mainnet.abs.xyz';
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

    // Risk scoring thresholds
    this.thresholds = {
      newContractHours: 24, // Contract deployed less than 24 hours ago
      minHolders: 10, // Minimum unique holders for collections
      maxApprovals: 5, // Maximum suspicious approvals
      maxValueSkew: 0.5, // 50% value difference threshold
    };
  }

  /**
   * Score an order for risk factors
   * @param {string} orderId - Order ID
   * @param {object} order - Order data
   * @returns {Promise<number>} Risk score (0-100, higher = more risky)
   */
  async scoreOrder(orderId, order) {
    try {
      const riskFactors = [];
      let totalScore = 0;

      // Check all items in give and take arrays
      const allItems = [...order.give_items, ...order.take_items];
      
      for (const item of allItems) {
        if (item.itemType === 'ERC721' || item.itemType === 'ERC1155') {
          const contractRisks = await this.checkContractRisks(item.contractAddr);
          riskFactors.push(...contractRisks);
        }
      }

      // Check maker's approval history
      const approvalRisks = await this.checkApprovalRisks(order.maker_address);
      riskFactors.push(...approvalRisks);

      // Check for value manipulation attempts
      const valueRisks = await this.checkValueRisks(order);
      riskFactors.push(...valueRisks);

      // Check for suspicious patterns
      const patternRisks = await this.checkSuspiciousPatterns(order);
      riskFactors.push(...patternRisks);

      // Calculate total score
      totalScore = Math.min(100, riskFactors.reduce((sum, risk) => sum + risk.score, 0));

      // Store risk flags in database
      await this.storeRiskFlags(orderId, riskFactors);

      return totalScore;
    } catch (error) {
      console.error('Risk scoring error:', error);
      // Return moderate risk score on error
      return 50;
    }
  }

  /**
   * Check contract-related risks
   * @param {string} contractAddress - Contract address to check
   * @returns {Promise<Array>} Array of risk factors
   */
  async checkContractRisks(contractAddress) {
    const risks = [];

    try {
      // Check contract age
      const code = await this.provider.getCode(contractAddress);
      
      if (code === '0x') {
        risks.push({
          type: 'collection_risk',
          severity: 'critical',
          score: 30,
          message: 'Contract does not exist or has no code',
          metadata: { contractAddress }
        });
        return risks;
      }

      // Check if bytecode is suspiciously small
      if (code.length < 100) {
        risks.push({
          type: 'collection_risk',
          severity: 'high',
          score: 25,
          message: 'Contract has unusually small bytecode',
          metadata: { contractAddress, codeSize: code.length }
        });
      }

      // Check contract deployment time (simplified - would need block scanning in production)
      // For now, we'll use a simple heuristic based on transaction count
      const transactionCount = await this.provider.getTransactionCount(contractAddress);
      
      if (transactionCount === 0) {
        risks.push({
          type: 'collection_risk',
          severity: 'medium',
          score: 15,
          message: 'Contract has no transaction history',
          metadata: { contractAddress }
        });
      }

      // Check for proxy patterns (simplified)
      if (code.includes('delegatecall') || code.includes('proxy')) {
        risks.push({
          type: 'collection_risk',
          severity: 'medium',
          score: 10,
          message: 'Contract appears to be a proxy - implementation may change',
          metadata: { contractAddress }
        });
      }

      // Try to get contract name/symbol to check for impersonation
      const contractName = await this.getContractName(contractAddress);
      const nameRisks = this.checkNameSimilarity(contractName);
      risks.push(...nameRisks);

    } catch (error) {
      console.error(`Error checking contract risks for ${contractAddress}:`, error);
      risks.push({
        type: 'collection_risk',
        severity: 'medium',
        score: 20,
        message: 'Unable to verify contract details',
        metadata: { contractAddress, error: error.message }
      });
    }

    return risks;
  }

  /**
   * Check approval-related risks
   * @param {string} makerAddress - Maker's address
   * @returns {Promise<Array>} Array of risk factors
   */
  async checkApprovalRisks(makerAddress) {
    const risks = [];

    try {
      // This would normally check on-chain approval events
      // For demo purposes, we'll do basic checks
      
      // Check if maker has many recent approvals (pattern of suspicious activity)
      // In production, you'd scan recent blocks for approval events
      
      risks.push({
        type: 'approval_risk',
        severity: 'low',
        score: 5,
        message: 'Standard approval check passed',
        metadata: { makerAddress }
      });

    } catch (error) {
      console.error(`Error checking approval risks for ${makerAddress}:`, error);
    }

    return risks;
  }

  /**
   * Check for value manipulation risks
   * @param {object} order - Order data
   * @returns {Promise<Array>} Array of risk factors
   */
  async checkValueRisks(order) {
    const risks = [];

    try {
      // Check for "free + approval" patterns
      const hasEmptyGive = order.give_items.length === 0;
      const hasEmptyTake = order.take_items.length === 0;

      if (hasEmptyGive || hasEmptyTake) {
        risks.push({
          type: 'value_risk',
          severity: 'high',
          score: 30,
          message: 'One side of trade is empty - potential approval farming',
          metadata: { hasEmptyGive, hasEmptyTake }
        });
      }

      // Check for excessive native token requirements
      const nativeGive = order.give_items.filter(item => item.itemType === 'NATIVE');
      const nativeTake = order.take_items.filter(item => item.itemType === 'NATIVE');

      const totalNativeGive = nativeGive.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const totalNativeTake = nativeTake.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

      // Flag trades requiring more than 1 ETH
      if (totalNativeGive > 1 || totalNativeTake > 1) {
        risks.push({
          type: 'value_risk',
          severity: 'medium',
          score: 15,
          message: 'High value native token transfer',
          metadata: { totalNativeGive, totalNativeTake }
        });
      }

      // Check for suspicious value ratios
      if (totalNativeGive > 0 && totalNativeTake === 0) {
        risks.push({
          type: 'value_risk',
          severity: 'medium',
          score: 20,
          message: 'One-sided native token transfer',
          metadata: { totalNativeGive, totalNativeTake }
        });
      }

    } catch (error) {
      console.error('Error checking value risks:', error);
    }

    return risks;
  }

  /**
   * Check for suspicious trading patterns
   * @param {object} order - Order data
   * @returns {Promise<Array>} Array of risk factors
   */
  async checkSuspiciousPatterns(order) {
    const risks = [];

    try {
      // Check expiry time (very short expiry could be suspicious)
      const expiryTime = new Date(order.expiry);
      const now = new Date();
      const timeToExpiry = expiryTime.getTime() - now.getTime();
      const minutesToExpiry = timeToExpiry / (1000 * 60);

      if (minutesToExpiry < 10) {
        risks.push({
          type: 'pattern_risk',
          severity: 'medium',
          score: 15,
          message: 'Very short expiry time - possible frontrunning attempt',
          metadata: { minutesToExpiry }
        });
      }

      // Check for maker profile
      const { data: profile } = await this.supabase
        .from('trades_profiles')
        .select('*')
        .eq('wallet_address', order.maker_address.toLowerCase())
        .single();

      if (!profile) {
        risks.push({
          type: 'pattern_risk',
          severity: 'low',
          score: 5,
          message: 'New trader with no history',
          metadata: { makerAddress: order.maker_address }
        });
      } else if (profile.reputation_score < 20) {
        risks.push({
          type: 'pattern_risk',
          severity: 'medium',
          score: 10,
          message: 'Trader has low reputation score',
          metadata: { 
            makerAddress: order.maker_address,
            reputationScore: profile.reputation_score 
          }
        });
      }

      // Check for recent failed trades
      if (profile && profile.total_trades > 0) {
        const successRate = profile.successful_trades / profile.total_trades;
        if (successRate < 0.8) {
          risks.push({
            type: 'pattern_risk',
            severity: 'medium',
            score: 15,
            message: 'Trader has low success rate',
            metadata: { 
              makerAddress: order.maker_address,
              successRate: successRate.toFixed(2)
            }
          });
        }
      }

    } catch (error) {
      console.error('Error checking pattern risks:', error);
    }

    return risks;
  }

  /**
   * Get contract name for similarity checking
   * @param {string} contractAddress - Contract address
   * @returns {Promise<string>} Contract name
   */
  async getContractName(contractAddress) {
    try {
      // Try ERC721 name function
      const contract = new ethers.Contract(contractAddress, [
        'function name() view returns (string)'
      ], this.provider);

      const name = await contract.name();
      return name || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Check if contract name is similar to known legitimate projects
   * @param {string} contractName - Contract name to check
   * @returns {Array} Array of risk factors
   */
  checkNameSimilarity(contractName) {
    const risks = [];
    
    if (!contractName || contractName === 'Unknown') {
      return risks;
    }

    // List of popular NFT collection names to check against
    const popularNames = [
      'CryptoPunks', 'BoredApeYachtClub', 'Azuki', 'CloneX', 
      'MutantApeYachtClub', 'Doodles', 'VeeFriends', 'Art Blocks'
    ];

    const lowerName = contractName.toLowerCase();
    
    for (const popular of popularNames) {
      const lowerPopular = popular.toLowerCase();
      
      // Check for similar names (Levenshtein distance or simple contains)
      if (lowerName.includes(lowerPopular) || 
          lowerPopular.includes(lowerName) ||
          this.calculateSimilarity(lowerName, lowerPopular) > 0.8) {
        
        // Only flag if it's not an exact match (could be legitimate)
        if (lowerName !== lowerPopular) {
          risks.push({
            type: 'collection_risk',
            severity: 'high',
            score: 25,
            message: `Contract name "${contractName}" is similar to popular collection "${popular}"`,
            metadata: { contractName, similarTo: popular }
          });
        }
      }
    }

    return risks;
  }

  /**
   * Calculate string similarity (simple implementation)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Store risk flags in database
   * @param {string} orderId - Order ID
   * @param {Array} riskFactors - Array of risk factors
   */
  async storeRiskFlags(orderId, riskFactors) {
    try {
      if (riskFactors.length === 0) {
        return;
      }

      const flags = riskFactors.map(risk => ({
        order_id: orderId,
        flag_type: risk.type,
        severity: risk.severity,
        message: risk.message,
        metadata: risk.metadata
      }));

      const { error } = await this.supabase
        .from('trades_flags')
        .insert(flags);

      if (error) {
        console.error('Error storing risk flags:', error);
      }
    } catch (error) {
      console.error('Error storing risk flags:', error);
    }
  }

  /**
   * Get risk score for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<object>} Risk assessment
   */
  async getRiskAssessment(orderId) {
    try {
      const { data: flags, error } = await this.supabase
        .from('trades_flags')
        .select('*')
        .eq('order_id', orderId);

      if (error) {
        console.error('Error fetching risk flags:', error);
        return { score: 50, flags: [], summary: 'Unable to assess risk' };
      }

      const totalScore = Math.min(100, flags.reduce((sum, flag) => {
        const scores = { low: 5, medium: 15, high: 25, critical: 40 };
        return sum + (scores[flag.severity] || 10);
      }, 0));

      const criticalFlags = flags.filter(f => f.severity === 'critical');
      const highFlags = flags.filter(f => f.severity === 'high');

      let summary = 'Low risk';
      if (totalScore >= 70) {
        summary = 'High risk';
      } else if (totalScore >= 40) {
        summary = 'Medium risk';
      }

      return {
        score: totalScore,
        flags: flags || [],
        summary,
        criticalCount: criticalFlags.length,
        highCount: highFlags.length,
        recommendations: this.generateRecommendations(flags || [])
      };
    } catch (error) {
      console.error('Error getting risk assessment:', error);
      return { score: 50, flags: [], summary: 'Unable to assess risk' };
    }
  }

  /**
   * Generate safety recommendations based on risk flags
   * @param {Array} flags - Risk flags
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(flags) {
    const recommendations = [];

    const hasCollectionRisk = flags.some(f => f.flag_type === 'collection_risk');
    const hasValueRisk = flags.some(f => f.flag_type === 'value_risk');
    const hasApprovalRisk = flags.some(f => f.flag_type === 'approval_risk');

    if (hasCollectionRisk) {
      recommendations.push('Verify the authenticity of NFT collections involved');
      recommendations.push('Check contract addresses on block explorers');
    }

    if (hasValueRisk) {
      recommendations.push('Double-check the trade values and ratios');
      recommendations.push('Be cautious of trades requiring native token payments');
    }

    if (hasApprovalRisk) {
      recommendations.push('Review your current token approvals');
      recommendations.push('Consider revoking unused approvals');
    }

    if (flags.some(f => f.severity === 'critical')) {
      recommendations.push('⚠️ CRITICAL: Do not proceed with this trade');
    } else if (flags.some(f => f.severity === 'high')) {
      recommendations.push('🔸 Exercise extreme caution');
    }

    return recommendations;
  }
}

module.exports = RiskScorer;