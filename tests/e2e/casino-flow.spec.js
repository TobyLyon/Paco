/**
 * 🎰 Casino E2E Flow Tests
 * 
 * End-to-end tests for complete user flows
 */

const { test, expect } = require('@playwright/test');

test.describe('Casino Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to casino page
    await page.goto('/crash-casino/frontend/pacorocko.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('complete deposit → bet → cashout → withdraw flow', async ({ page }) => {
    // Step 1: Connect wallet (mock)
    await page.click('[data-testid="connect-wallet"]');
    
    // Mock wallet connection
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true,
        request: async ({ method }) => {
          if (method === 'eth_accounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_sendTransaction') {
            return '0xtxhash123';
          }
          return null;
        }
      };
      
      // Trigger wallet connected event
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });

    // Wait for balance UI to appear
    await expect(page.locator('#balanceSection')).toBeVisible();

    // Step 2: Deposit funds
    await page.click('#depositBtn');
    await page.fill('[data-testid="deposit-amount"]', '1.0');
    await page.click('[data-testid="deposit-confirm"]');
    
    // Wait for deposit confirmation
    await expect(page.locator('.success-message')).toContainText('Deposit successful');

    // Step 3: Wait for round to start
    await page.waitForSelector('[data-testid="betting-phase"]', { timeout: 30000 });
    
    // Step 4: Place bet
    await page.fill('#betAmount', '0.1');
    await page.click('#placeBetBtn');
    
    // Verify bet placed
    await expect(page.locator('#activeBet')).toContainText('0.1 ETH');
    
    // Step 5: Wait for round to start
    await page.waitForSelector('[data-testid="round-running"]', { timeout: 20000 });
    
    // Step 6: Cash out early (profitable)
    await page.waitForTimeout(2000); // Wait for multiplier to increase
    await page.click('#cashOutBtn');
    
    // Verify cashout success
    await expect(page.locator('.cashout-celebration')).toBeVisible();
    await expect(page.locator('.cashout-celebration')).toContainText('CASHED OUT');
    
    // Step 7: Verify balance updated
    const balanceText = await page.locator('#userBalance').textContent();
    const balance = parseFloat(balanceText.split(' ')[0]);
    expect(balance).toBeGreaterThan(0.9); // Should have more than initial balance minus bet
    
    // Step 8: Withdraw funds
    await page.click('#withdrawBtn');
    await page.fill('[data-testid="withdraw-amount"]', '0.5');
    await page.click('[data-testid="withdraw-confirm"]');
    
    // Wait for withdrawal confirmation
    await expect(page.locator('.success-message')).toContainText('Withdrawal initiated');
  });

  test('losing bet flow', async ({ page }) => {
    // Mock wallet and deposit
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });

    // Wait for balance UI and deposit funds
    await expect(page.locator('#balanceSection')).toBeVisible();
    
    // Mock balance
    await page.evaluate(() => {
      if (window.betInterface) {
        window.betInterface.userBalance = 1.0;
        window.betInterface.updateBalanceDisplay();
      }
    });

    // Place bet
    await page.fill('#betAmount', '0.1');
    await page.click('#placeBetBtn');
    
    // Wait for round to crash without cashing out
    await page.waitForSelector('[data-testid="round-crashed"]', { timeout: 30000 });
    
    // Verify loss
    await expect(page.locator('#activeBet')).not.toBeVisible();
    
    // Verify balance decreased
    const balanceText = await page.locator('#userBalance').textContent();
    const balance = parseFloat(balanceText.split(' ')[0]);
    expect(balance).toBeLessThan(1.0);
  });
});

test.describe('Mass Reconnection', () => {
  test('client resumes via lastEventId replay', async ({ page, context }) => {
    // Connect to casino
    await page.goto('/crash-casino/frontend/pacorocko.html');
    
    // Mock wallet connection
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
    });

    // Wait for socket connection
    await page.waitForFunction(() => window.crashGame && window.crashGame.socket);
    
    // Get initial event ID
    const initialEventId = await page.evaluate(() => window.crashGame?.lastEventId || 0);
    
    // Simulate disconnect
    await page.evaluate(() => {
      if (window.crashGame?.socket) {
        window.crashGame.socket.disconnect();
      }
    });
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Reconnect
    await page.evaluate(() => {
      if (window.crashGame) {
        window.crashGame.connect();
      }
    });
    
    // Verify reconnection with event replay
    await page.waitForFunction(() => 
      window.crashGame && 
      window.crashGame.socket && 
      window.crashGame.socket.connected
    );
    
    // Verify event ID continuity
    const newEventId = await page.evaluate(() => window.crashGame?.lastEventId || 0);
    expect(newEventId).toBeGreaterThanOrEqual(initialEventId);
  });
});

test.describe('Race Conditions', () => {
  test('rapid bets prevent double spends', async ({ page }) => {
    // Mock wallet connection
    await page.goto('/crash-casino/frontend/pacorocko.html');
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });

    // Mock high balance
    await page.evaluate(() => {
      if (window.betInterface) {
        window.betInterface.userBalance = 10.0;
        window.betInterface.updateBalanceDisplay();
      }
    });

    // Wait for betting phase
    await page.waitForSelector('[data-testid="betting-phase"]', { timeout: 30000 });
    
    // Fill bet amount
    await page.fill('#betAmount', '1.0');
    
    // Rapidly click bet button multiple times
    await Promise.all([
      page.click('#placeBetBtn'),
      page.click('#placeBetBtn'),
      page.click('#placeBetBtn')
    ]);
    
    // Wait for bet processing
    await page.waitForTimeout(2000);
    
    // Verify only one bet was placed
    const activeBets = await page.locator('#activeBet').count();
    expect(activeBets).toBeLessThanOrEqual(1);
    
    // Verify balance is consistent
    const balanceText = await page.locator('#userBalance').textContent();
    const balance = parseFloat(balanceText.split(' ')[0]);
    expect(balance).toBeGreaterThan(8.0); // Should not have lost more than 1 bet worth
  });
});

test.describe('Maintenance Mode', () => {
  test('maintenance flags pause operations with banners', async ({ page }) => {
    // Set maintenance mode via environment
    await page.addInitScript(() => {
      window.maintenanceMode = true;
    });
    
    await page.goto('/crash-casino/frontend/pacorocko.html');
    
    // Should show maintenance banner
    await expect(page.locator('.maintenance-banner')).toBeVisible();
    await expect(page.locator('.maintenance-banner')).toContainText('maintenance');
    
    // Mock wallet connection
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });
    
    // Betting should be disabled
    await expect(page.locator('#placeBetBtn')).toBeDisabled();
    
    // Deposits should be disabled
    await expect(page.locator('#depositBtn')).toBeDisabled();
    
    // Withdrawals should be disabled
    await expect(page.locator('#withdrawBtn')).toBeDisabled();
  });
});

test.describe('Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/crash-casino/frontend/pacorocko.html');
    
    // Mock network failure
    await page.route('**/api/**', route => route.abort());
    
    // Mock wallet connection
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });
    
    // Try to place bet
    await page.fill('#betAmount', '0.1');
    await page.click('#placeBetBtn');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('network');
  });

  test('handles insufficient balance gracefully', async ({ page }) => {
    await page.goto('/crash-casino/frontend/pacorocko.html');
    
    // Mock wallet with zero balance
    await page.evaluate(() => {
      window.ethereum = {
        selectedAddress: '0x1234567890123456789012345678901234567890',
        isConnected: () => true
      };
      document.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
      
      if (window.betInterface) {
        window.betInterface.userBalance = 0.0;
        window.betInterface.updateBalanceDisplay();
      }
    });
    
    // Try to place bet with insufficient balance
    await page.fill('#betAmount', '1.0');
    await page.click('#placeBetBtn');
    
    // Should show insufficient balance error
    await expect(page.locator('.error-message')).toContainText('Insufficient balance');
  });
});
