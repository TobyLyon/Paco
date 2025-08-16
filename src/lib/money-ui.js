/**
 * 💰 UI Money Helpers - Bridge BigInt <-> strings safely
 * 
 * UI-specific utilities for handling money in frontend components
 * Keeps BigInt precision in business logic, converts only at display boundaries
 */

const { toWei, fromWei, stringToWei, weiToString } = require('./money');

/**
 * Parse ETH input from user, throw on invalid
 */
function parseEthInputOrThrow(s) {
  return toWei(s.trim());
}

/**
 * Display ETH amount for UI (safe conversion to number for display only)
 */
function displayEth(wei, decimals = 4) {
  // UI ONLY: safe conversion to number for .toFixed; money stays bigint elsewhere
  const ethString = fromWei(wei);
  return parseFloat(ethString).toFixed(decimals);
}

/**
 * Safe input parsing with validation
 */
function parseUserInput(input) {
  try {
    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, error: 'Amount required' };
    }
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      return { valid: false, error: 'Invalid amount format' };
    }
    const wei = toWei(trimmed);
    return { valid: true, wei };
  } catch (error) {
    return { valid: false, error: 'Invalid amount' };
  }
}

/**
 * Format wei for different UI contexts
 */
function formatWeiForUI(wei, context = 'display') {
  switch (context) {
    case 'balance':
      return displayEth(wei, 6); // Higher precision for balances
    case 'bet':
      return displayEth(wei, 4); // Standard precision for bets
    case 'display':
    default:
      return displayEth(wei, 4); // Standard display
  }
}

/**
 * JSON helpers for API payloads (BigInt can't be serialized)
 */
const toJsonWei = (x) => weiToString(x);
const fromJsonWei = (s) => stringToWei(s);

/**
 * Convert API response to wei safely
 */
function apiResponseToWei(value) {
  return stringToWei(value.toString());
}

/**
 * Prepare wei for API request
 */
function weiToApiPayload(wei) {
  return weiToString(wei);
}

/**
 * Safe comparison for UI (convert to numbers only for comparison)
 */
function compareWeiForUI(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

/**
 * Check if amount is valid for betting
 */
function isValidBetAmount(wei, balance, minBet = toWei('0.001')) {
  if (wei <= 0n) {
    return { valid: false, error: 'Bet amount must be positive' };
  }
  if (wei < minBet) {
    return { valid: false, error: `Minimum bet is ${displayEth(minBet)} ETH` };
  }
  if (wei > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  return { valid: true };
}

module.exports = {
  parseEthInputOrThrow,
  displayEth,
  parseUserInput,
  formatWeiForUI,
  toJsonWei,
  fromJsonWei,
  apiResponseToWei,
  weiToApiPayload,
  compareWeiForUI,
  isValidBetAmount
};
