module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'crash-casino/backend/**/*.js',
    'crash-casino/frontend/js/**/*.js',
    'crash-casino/shared/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Prevent race conditions in tests
};
