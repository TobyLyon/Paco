/**
 * 🏦 Production Balance API Integration Tests
 * 
 * Tests the complete balance flow including ledger consistency
 */

const ProductionBalanceAPI = require('../production-balance-api');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client
jest.mock('@supabase/supabase-js');

describe('ProductionBalanceAPI Integration', () => {
  let balanceAPI;
  let mockSupabase;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    createClient.mockReturnValue(mockSupabase);
    
    balanceAPI = new ProductionBalanceAPI(
      'https://test.supabase.co',
      'test-service-key'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return balance with proper format', async () => {
      const mockBalanceData = {
        available: '1000000000000000000', // 1 ETH in wei
        locked: '500000000000000000',    // 0.5 ETH in wei
        version: '5'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockBalanceData],
        error: null
      });

      const result = await balanceAPI.getBalance('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        available: 1.0,
        locked: 0.5,
        total: 1.5,
        version: 5,
        availableWei: '1000000000000000000',
        lockedWei: '500000000000000000'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_get_balance', {
        p_user: '0x1234567890123456789012345678901234567890'
      });
    });

    it('should handle empty balance (new user)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await balanceAPI.getBalance('0xnewuser');

      expect(result).toEqual({
        available: 0,
        locked: 0,
        total: 0,
        version: 0,
        availableWei: '0',
        lockedWei: '0'
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(balanceAPI.getBalance('0xtest')).rejects.toThrow('Database connection failed');
    });
  });

  describe('placeBet', () => {
    it('should place bet successfully with optimistic concurrency control', async () => {
      const mockResult = {
        new_available: '500000000000000000', // 0.5 ETH remaining
        new_locked: '500000000000000000',    // 0.5 ETH locked
        new_version: '6'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockResult],
        error: null
      });

      const result = await balanceAPI.placeBet(
        '0xuser',
        0.5, // 0.5 ETH bet
        'round-123',
        'client-456',
        5 // expected version
      );

      expect(result.success).toBe(true);
      expect(result.newBalance).toEqual({
        available: 0.5,
        locked: 0.5,
        version: 6,
        availableWei: '500000000000000000',
        lockedWei: '500000000000000000'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_place_bet', {
        p_user: '0xuser',
        p_amount: '500000000000000000',
        p_round: 'round-123',
        p_client: 'client-456',
        p_expected_version: 5
      });
    });

    it('should handle version conflicts', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'VERSION_CONFLICT: Expected 5, got 6' }
      });

      await expect(balanceAPI.placeBet('0xuser', 0.5, 'round-123', 'client-456', 5))
        .rejects.toThrow('VERSION_CONFLICT');
    });

    it('should handle insufficient funds', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'INSUFFICIENT_FUNDS: Need 1000000000000000000, have 500000000000000000' }
      });

      await expect(balanceAPI.placeBet('0xuser', 1.0, 'round-123', 'client-456', 5))
        .rejects.toThrow('INSUFFICIENT_FUNDS');
    });

    it('should convert ETH to wei correctly', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ new_available: '0', new_locked: '1000000000000000000', new_version: '1' }],
        error: null
      });

      await balanceAPI.placeBet('0xuser', 1.0, 'round-123', 'client-456', 0);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_place_bet', {
        p_user: '0xuser',
        p_amount: '1000000000000000000', // 1 ETH in wei
        p_round: 'round-123',
        p_client: 'client-456',
        p_expected_version: 0
      });
    });
  });

  describe('processWin', () => {
    beforeEach(() => {
      // Mock the processWinPayout method
      balanceAPI.processWinPayout = jest.fn().mockResolvedValue({
        success: true,
        txHash: '0xtxhash'
      });
    });

    it('should process win with payout transfer', async () => {
      const mockResult = {
        new_available: '2000000000000000000', // 2 ETH (original + winnings)
        new_locked: '0',
        new_version: '7'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockResult],
        error: null
      });

      const result = await balanceAPI.processWin(
        '0xuser',
        2.0,    // win amount
        1.0,    // original bet
        'round-123',
        'client-456'
      );

      // Should first transfer from house to hot wallet
      expect(balanceAPI.processWinPayout).toHaveBeenCalledWith(2.0);

      // Then update database
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_process_win', {
        p_user: '0xuser',
        p_win_amount: '2000000000000000000',
        p_bet_amount: '1000000000000000000',
        p_round: 'round-123',
        p_client: 'client-456'
      });

      expect(result.success).toBe(true);
      expect(result.newBalance.available).toBe(2.0);
    });

    it('should handle payout transfer failure', async () => {
      balanceAPI.processWinPayout.mockRejectedValue(
        new Error('Insufficient house wallet balance')
      );

      await expect(balanceAPI.processWin('0xuser', 2.0, 1.0, 'round-123', 'client-456'))
        .rejects.toThrow('Insufficient house wallet balance');

      // Database should not be updated if payout fails
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('rpc_process_win', expect.anything());
    });
  });

  describe('processLoss', () => {
    it('should process loss correctly', async () => {
      const mockResult = {
        new_available: '0',
        new_locked: '0',  // Locked amount released (goes to house)
        new_version: '7'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockResult],
        error: null
      });

      const result = await balanceAPI.processLoss(
        '0xuser',
        1.0,    // bet amount lost
        'round-123',
        'client-456'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_process_loss', {
        p_user: '0xuser',
        p_bet_amount: '1000000000000000000',
        p_round: 'round-123',
        p_client: 'client-456'
      });

      expect(result.success).toBe(true);
      expect(result.newBalance.locked).toBe(0);
    });
  });

  describe('recordDeposit', () => {
    it('should record deposit idempotently', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: null
      });

      const result = await balanceAPI.recordDeposit(
        '0xtxhash',
        0,
        '0xuser',
        '1000000000000000000'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_record_deposit', {
        p_tx: '0xtxhash',
        p_idx: 0,
        p_user: '0xuser',
        p_amount: '1000000000000000000'
      });

      expect(result.success).toBe(true);
    });

    it('should handle duplicate deposits gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'duplicate key value violates unique constraint' }
      });

      const result = await balanceAPI.recordDeposit(
        '0xtxhash',
        0,
        '0xuser',
        '1000000000000000000'
      );

      // Should not throw error for duplicates
      expect(result.success).toBe(true);
    });

    it('should handle other errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'Database connection failed' }
      });

      await expect(balanceAPI.recordDeposit('0xtxhash', 0, '0xuser', '1000000000000000000'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all tables accessible', async () => {
      mockSupabase.from.mockImplementation((table) => {
        return {
          select: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [] })
        };
      });

      const result = await balanceAPI.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.accounts_accessible).toBeDefined();
      expect(result.ledger_accessible).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status on database error', async () => {
      mockSupabase.from.mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          limit: jest.fn().mockRejectedValue(new Error('Database unavailable'))
        };
      });

      const result = await balanceAPI.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Database unavailable');
    });
  });
});
