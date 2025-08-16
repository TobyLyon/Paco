// Global test setup
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.HOT_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.HOUSE_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Restore console for debugging when needed
global.restoreConsole = () => {
  global.console = originalConsole;
};
