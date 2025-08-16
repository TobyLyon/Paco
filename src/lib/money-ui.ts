/**
 * 💰 UI Money Helpers - Bridge BigInt <-> strings safely
 * 
 * UI-specific utilities for handling money in frontend components
 * Keeps BigInt precision in business logic, converts only at display boundaries
 */

import { toWei, fromWei, stringToWei, weiToString, Wei } from './money';

/**
 * Parse ETH input from user, throw on invalid
 */
export function parseEthInputOrThrow(s: string): Wei {
  return toWei(s.trim());
}

/**
 * Display ETH amount for UI (safe conversion to number for display only)
 */
export function displayEth(wei: Wei, decimals: number = 4): string {
  // UI ONLY: safe conversion to number for .toFixed; money stays bigint elsewhere
  const ethString = fromWei(wei);
  return parseFloat(ethString).toFixed(decimals);
}

/**
 * Safe input parsing with validation
 */
export function parseUserInput(input: string): { valid: boolean; wei?: Wei; error?: string } {
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
export function formatWeiForUI(wei: Wei, context: 'balance' | 'bet' | 'display' = 'display'): string {
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
export const toJsonWei = (x: Wei): string => weiToString(x);
export const fromJsonWei = (s: string): Wei => stringToWei(s);

/**
 * Convert API response to wei safely
 */
export function apiResponseToWei(value: string | number): Wei {
  return stringToWei(value.toString());
}

/**
 * Prepare wei for API request
 */
export function weiToApiPayload(wei: Wei): string {
  return weiToString(wei);
}

/**
 * Safe comparison for UI (convert to numbers only for comparison)
 */
export function compareWeiForUI(a: Wei, b: Wei): number {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

/**
 * Check if amount is valid for betting
 */
export function isValidBetAmount(wei: Wei, balance: Wei, minBet: Wei = toWei('0.001')): { valid: boolean; error?: string } {
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
