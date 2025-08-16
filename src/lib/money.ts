/**
 * 💰 Core Money Helpers - All amounts in WEI as bigint
 * 
 * CRITICAL: Never use JavaScript Number for money calculations
 * All amounts are stored as wei (1e18 precision) using BigInt
 */

import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';

export const WAD = 10n ** 18n;           // 1e18 (Solidity-style fixed point)
export const BP  = 10_000n;              // basis points (100% = 10000)

export type Wei = bigint;

/** Parse user ETH string -> wei bigint (rejects junk) */
export function toWei(eth: string): Wei {
  // viem parseEther throws on invalid inputs; good.
  return parseEther(eth);
}

/** Format wei -> ETH string for display only */
export function fromWei(wei: Wei): string {
  return formatEther(wei);
}

/** Parse units with custom decimals (tokens) */
export function toUnits(amount: string, decimals: number): Wei {
  return parseUnits(amount, decimals);
}

export function fromUnits(wei: Wei, decimals: number): string {
  return formatUnits(wei, decimals);
}

/** Fixed-point multiply/divide (WAD = 1e18). Rounds half-up. */
export function wadMul(a: Wei, wad: Wei): Wei { 
  return (a * wad + WAD/2n) / WAD; 
}

export function wadDiv(a: Wei, wad: Wei): Wei { 
  return (a * WAD + wad/2n) / wad; 
}

/** Percentage in basis points (e.g., 300 = 3%) */
export function percentMul(a: Wei, bps: number | bigint): Wei {
  const n = typeof bps === 'bigint' ? bps : BigInt(bps);
  return (a * n) / BP;
}

/** Safe add/sub (readability) */
export const add = (a: Wei, b: Wei) => a + b;
export const sub = (a: Wei, b: Wei) => a - b;

/** Guards */
export const isNonNeg = (x: Wei) => x >= 0n;

/** Serialize for JSON (since BigInt can't cross the wire) */
export const weiToString  = (x: Wei) => x.toString();
export const stringToWei  = (s: string) => BigInt(s);

/** Convert multiplier (float) to WAD fixed-point for safe math */
export function multiplierToWad(mult: number): Wei {
  // Convert float -> fixed 1e18 with rounding to avoid drift
  return BigInt(Math.round(mult * 1e18));
}

/** Compute payout using fixed-point arithmetic */
export function computePayoutWei(betWei: Wei, cashoutMultiplier: number): Wei {
  const mWad = multiplierToWad(cashoutMultiplier);
  return wadMul(betWei, mWad);
}

/** Parse user input safely */
export function parseUserAmount(input: string): Wei {
  const trimmed = input.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('INVALID_AMOUNT');
  }
  return toWei(trimmed);
}

/** Format for UI display with specified decimals */
export function formatForDisplay(wei: Wei, decimals: number = 4): string {
  // UI display only - safe conversion to number for .toFixed()
  const ethString = fromWei(wei);
  return parseFloat(ethString).toFixed(decimals);
}

/** Convert wei string from database to BigInt */
export function dbStringToWei(dbValue: string | number): Wei {
  return BigInt(dbValue);
}

/** Convert wei BigInt to database string */
export function weiToDbString(wei: Wei): string {
  return wei.toString();
}
