/**
 * 🧮 Multiplier Calculator Tests
 * 
 * Unit tests for multiplier validation and payout calculations
 */

const MultiplierCalculator = require('../multiplier-calculator');

describe('MultiplierCalculator', () => {
  describe('validateMultiplier', () => {
    it('should allow multipliers well before crash point', () => {
      const result = MultiplierCalculator.validateMultiplier(2.50, 5.00);
      expect(result).toBe(true);
    });

    it('should reject multipliers too close to crash point', () => {
      const result = MultiplierCalculator.validateMultiplier(4.99, 5.00);
      expect(result).toBe(false);
    });

    it('should reject multipliers equal to crash point', () => {
      const result = MultiplierCalculator.validateMultiplier(5.00, 5.00);
      expect(result).toBe(false);
    });

    it('should reject multipliers above crash point', () => {
      const result = MultiplierCalculator.validateMultiplier(5.50, 5.00);
      expect(result).toBe(false);
    });

    it('should handle edge case with small buffer', () => {
      const result = MultiplierCalculator.validateMultiplier(1.00, 1.01);
      expect(result).toBe(true);
    });

    it('should reject negative multipliers', () => {
      const result = MultiplierCalculator.validateMultiplier(-1.0, 5.00);
      expect(result).toBe(false);
    });

    it('should reject zero multiplier', () => {
      const result = MultiplierCalculator.validateMultiplier(0, 5.00);
      expect(result).toBe(false);
    });
  });

  describe('calculateCashoutResult', () => {
    it('should calculate profitable cashout correctly', () => {
      const result = MultiplierCalculator.calculateCashoutResult(1.0, 2.5);
      
      expect(result.isProfit).toBe(true);
      expect(result.payout).toBe(2.5);
      expect(result.netResult).toBe(1.5);
      expect(result.percentage).toBe(150);
      expect(result.originalBet).toBe(1.0);
    });

    it('should calculate losing cashout correctly', () => {
      const result = MultiplierCalculator.calculateCashoutResult(1.0, 0.8);
      
      expect(result.isProfit).toBe(false);
      expect(result.payout).toBe(0.8);
      expect(result.netResult).toBe(0.2); // Always positive for display
      expect(result.percentage).toBe(20);
      expect(result.originalBet).toBe(1.0);
    });

    it('should handle breakeven cashout (1x)', () => {
      const result = MultiplierCalculator.calculateCashoutResult(1.0, 1.0);
      
      expect(result.isProfit).toBe(false); // 1x is not profit
      expect(result.payout).toBe(1.0);
      expect(result.netResult).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle small bet amounts', () => {
      const result = MultiplierCalculator.calculateCashoutResult(0.001, 2.0);
      
      expect(result.isProfit).toBe(true);
      expect(result.payout).toBe(0.002);
      expect(result.netResult).toBe(0.001);
      expect(result.percentage).toBe(100);
    });

    it('should handle large multipliers', () => {
      const result = MultiplierCalculator.calculateCashoutResult(0.1, 100.0);
      
      expect(result.isProfit).toBe(true);
      expect(result.payout).toBe(10.0);
      expect(result.netResult).toBe(9.9);
      expect(result.percentage).toBe(9900);
    });

    it('should handle precision correctly', () => {
      const result = MultiplierCalculator.calculateCashoutResult(0.001, 1.23456789);
      
      expect(result.payout).toBeCloseTo(0.00123456789, 10);
      expect(result.netResult).toBeCloseTo(0.00023456789, 10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small numbers', () => {
      const result = MultiplierCalculator.calculateCashoutResult(0.000001, 2.0);
      
      expect(result.isProfit).toBe(true);
      expect(result.payout).toBe(0.000002);
      expect(result.netResult).toBe(0.000001);
    });

    it('should handle very large numbers', () => {
      const result = MultiplierCalculator.calculateCashoutResult(1000, 1.5);
      
      expect(result.isProfit).toBe(true);
      expect(result.payout).toBe(1500);
      expect(result.netResult).toBe(500);
    });

    it('should validate against invalid inputs', () => {
      expect(() => {
        MultiplierCalculator.calculateCashoutResult(-1, 2.0);
      }).toThrow();

      expect(() => {
        MultiplierCalculator.calculateCashoutResult(1, -1);
      }).toThrow();

      expect(() => {
        MultiplierCalculator.calculateCashoutResult(0, 2.0);
      }).toThrow();
    });
  });

  describe('Profit Threshold', () => {
    it('should correctly identify 2x as first profitable multiplier', () => {
      const result1 = MultiplierCalculator.calculateCashoutResult(1.0, 1.99);
      const result2 = MultiplierCalculator.calculateCashoutResult(1.0, 2.0);
      const result3 = MultiplierCalculator.calculateCashoutResult(1.0, 2.01);
      
      expect(result1.isProfit).toBe(false);
      expect(result2.isProfit).toBe(false); // 2x exactly breaks even
      expect(result3.isProfit).toBe(true);
    });

    it('should handle floating point precision around 2x', () => {
      const result = MultiplierCalculator.calculateCashoutResult(1.0, 2.000000001);
      expect(result.isProfit).toBe(true);
      expect(result.netResult).toBeGreaterThan(0);
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate loss percentages correctly', () => {
      const result50 = MultiplierCalculator.calculateCashoutResult(1.0, 0.5);
      const result75 = MultiplierCalculator.calculateCashoutResult(1.0, 0.25);
      
      expect(result50.percentage).toBe(50); // 50% loss
      expect(result75.percentage).toBe(75); // 75% loss
    });

    it('should calculate profit percentages correctly', () => {
      const result50 = MultiplierCalculator.calculateCashoutResult(1.0, 1.5);
      const result100 = MultiplierCalculator.calculateCashoutResult(1.0, 2.0);
      
      expect(result50.percentage).toBe(50);  // 50% profit
      expect(result100.percentage).toBe(100); // 100% profit (but still not isProfit due to house edge)
    });
  });
});
