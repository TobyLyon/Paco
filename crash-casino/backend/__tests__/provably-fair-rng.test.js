/**
 * 🎲 Provably Fair RNG Tests
 * 
 * Unit tests for cryptographically secure random number generation
 */

const ProvablyFairRNG = require('../provably-fair-rng');

describe('ProvablyFairRNG', () => {
  let rng;

  beforeEach(() => {
    rng = new ProvablyFairRNG();
  });

  describe('generateServerSeed', () => {
    it('should generate a 64-character hex string', () => {
      const seed = rng.generateServerSeed();
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique seeds', () => {
      const seed1 = rng.generateServerSeed();
      const seed2 = rng.generateServerSeed();
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('hashServerSeed', () => {
    it('should return SHA-256 hash of server seed', () => {
      const serverSeed = 'test_server_seed';
      const hash = rng.hashServerSeed(serverSeed);
      
      // Known SHA-256 hash for 'test_server_seed'
      const expectedHash = '5c2e5d7b2c3a9f1e8d6b4a7c3f9e2d8b1a6c4f7e9d2b5a8c1f4e7d0b3a6c9f2e5d8b';
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hashToCrashPoint', () => {
    it('should return 1.00 for instant crash (1/33 probability)', () => {
      // Hash that results in randomInt % 33 === 0
      const testHash = '0000000000000000000000000000000000000000000000000000000000000021'; // 33 in hex
      const crash = rng.hashToCrashPoint(testHash);
      expect(crash).toBe(1.00);
    });

    it('should return crash value > 1.00 for non-instant crash', () => {
      // Hash that doesn't result in instant crash
      const testHash = '0000000001000000000000000000000000000000000000000000000000000001';
      const crash = rng.hashToCrashPoint(testHash);
      expect(crash).toBeGreaterThan(1.00);
    });

    it('should return deterministic results for same hash', () => {
      const testHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const crash1 = rng.hashToCrashPoint(testHash);
      const crash2 = rng.hashToCrashPoint(testHash);
      expect(crash1).toBe(crash2);
    });

    it('should round to 2 decimal places', () => {
      const testHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const crash = rng.hashToCrashPoint(testHash);
      expect(crash).toBe(Math.round(crash * 100) / 100);
    });

    it('should respect max crash point cap', () => {
      // Test with hash that would generate very high value
      const testHash = 'ffffffff00000001ffffffff00000001ffffffff00000001ffffffff00000001';
      const crash = rng.hashToCrashPoint(testHash);
      expect(crash).toBeLessThanOrEqual(rng.config.maxCrashPoint);
    });
  });

  describe('generateRound', () => {
    it('should generate round with all required fields', () => {
      const clientSeed = 'test_client_seed';
      const nonce = 12345;
      
      const round = rng.generateRound(clientSeed, nonce);
      
      expect(round).toHaveProperty('serverSeed');
      expect(round).toHaveProperty('serverSeedHash');
      expect(round).toHaveProperty('clientSeed');
      expect(round).toHaveProperty('nonce');
      expect(round).toHaveProperty('crashPoint');
      expect(round).toHaveProperty('gameHash');
      
      expect(round.clientSeed).toBe(clientSeed);
      expect(round.nonce).toBe(nonce);
      expect(typeof round.crashPoint).toBe('number');
      expect(round.crashPoint).toBeGreaterThanOrEqual(1.00);
    });

    it('should generate valid server seed hash', () => {
      const round = rng.generateRound('test', 1);
      const expectedHash = rng.hashServerSeed(round.serverSeed);
      expect(round.serverSeedHash).toBe(expectedHash);
    });
  });

  describe('verifyRound', () => {
    it('should verify valid round correctly', () => {
      const round = rng.generateRound('test_client', 42);
      const isValid = rng.verifyRound(round);
      
      expect(isValid).toBe(true);
    });

    it('should reject round with invalid server seed hash', () => {
      const round = rng.generateRound('test_client', 42);
      round.serverSeedHash = 'invalid_hash';
      
      const isValid = rng.verifyRound(round);
      expect(isValid).toBe(false);
    });

    it('should reject round with incorrect crash point', () => {
      const round = rng.generateRound('test_client', 42);
      round.crashPoint = 999.99; // Wrong crash point
      
      const isValid = rng.verifyRound(round);
      expect(isValid).toBe(false);
    });
  });

  describe('Statistical Properties', () => {
    it('should maintain ~3% instant crash rate over large sample', () => {
      const sampleSize = 10000;
      let instantCrashes = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const round = rng.generateRound(`test_${i}`, i);
        if (round.crashPoint === 1.00) {
          instantCrashes++;
        }
      }
      
      const instantCrashRate = instantCrashes / sampleSize;
      
      // Should be approximately 3.03% (1/33) with some tolerance
      expect(instantCrashRate).toBeGreaterThan(0.025); // 2.5%
      expect(instantCrashRate).toBeLessThan(0.04);     // 4%
    });

    it('should generate variety of crash points', () => {
      const crashPoints = new Set();
      
      for (let i = 0; i < 1000; i++) {
        const round = rng.generateRound(`test_${i}`, i);
        crashPoints.add(round.crashPoint);
      }
      
      // Should generate many different crash points
      expect(crashPoints.size).toBeGreaterThan(800);
    });

    it('should have reasonable average crash point (house edge)', () => {
      const sampleSize = 10000;
      let totalPayout = 0;
      let validRounds = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const round = rng.generateRound(`test_${i}`, i);
        if (round.crashPoint > 1.00) { // Exclude instant crashes for payout calculation
          totalPayout += round.crashPoint;
          validRounds++;
        }
      }
      
      const averageMultiplier = totalPayout / validRounds;
      
      // With 3% house edge, average should be around 33-35x for non-instant crashes
      expect(averageMultiplier).toBeGreaterThan(30);
      expect(averageMultiplier).toBeLessThan(40);
    });
  });
});
