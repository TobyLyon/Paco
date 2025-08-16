#!/usr/bin/env node

/**
 * 💰 Money Arithmetic Validation
 * 
 * Scans codebase for dangerous money calculations using JavaScript Numbers
 * CRITICAL: All money operations must use BigInt or viem's parseEther/formatEther
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class MoneyArithmeticValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    
    // Dangerous patterns that indicate money arithmetic issues
    this.dangerousPatterns = [
      {
        pattern: /Number\s*\(\s*.*(?:wei|eth|balance|amount|price|value)\s*\)/gi,
        message: 'Use BigInt for money calculations, not Number()',
        severity: 'error'
      },
      {
        pattern: /parseFloat\s*\(\s*.*(?:wei|eth|balance|amount|price|value)\s*\)/gi,
        message: 'Use parseEther/formatEther for money, not parseFloat()',
        severity: 'error'
      },
      {
        pattern: /parseInt\s*\(\s*.*(?:wei|eth|balance|amount|price|value)\s*,\s*(?!10\s*\))/gi,
        message: 'Use BigInt for money, or specify radix 10 for parseInt()',
        severity: 'error'
      },
      {
        pattern: /(?:wei|eth|balance|amount|price|value)\s*[\+\-\*\/]\s*(?:wei|eth|balance|amount|price|value)/gi,
        message: 'Use explicit BigInt arithmetic for money calculations',
        severity: 'error',
        exclude: /class\s*=.*balance.*amount|id\s*=.*balance.*amount/gi // Skip HTML class/id attributes
      },
      {
        pattern: /Math\.(floor|ceil|round)\s*\(\s*.*(?:wei|eth|balance|amount|price|value)/gi,
        message: 'Use BigInt arithmetic instead of Math operations for money',
        severity: 'error'
      },
      {
        pattern: /(?:wei|eth|balance|amount|price|value).*\s*\*\s*1e18/gi,
        message: 'Use parseEther() instead of multiplying by 1e18',
        severity: 'warning'
      },
      {
        pattern: /(?:wei|eth|balance|amount|price|value).*\s*\/\s*1e18/gi,
        message: 'Use formatEther() instead of dividing by 1e18',
        severity: 'warning'
      }
    ];
  }

  /**
   * 🔍 Scan a file for dangerous money arithmetic
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, lineNumber) => {
        // Skip lines with UI/display exemptions (check current and previous line)
        const lowerLine = line.toLowerCase();
        const prevLine = lineNumber > 0 ? lines[lineNumber - 1].toLowerCase() : '';
        const exemptPatterns = [
          'ui conversion only',
          'display conversion only', 
          'ui display only',
          'display only',
          'for display purposes only',
          'multiplier.*not money',
          'crashvalue.*multiplier',
          'game logic',
          'ui.*tracking',
          'threshold check',
          'logging',
          'not money arithmetic',
          'proper bigint arithmetic'
        ];
        
        const isExempt = exemptPatterns.some(pattern => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(lowerLine) || regex.test(prevLine);
        });
        
        if (isExempt) {
          return; // Skip this line
        }
        
        this.dangerousPatterns.forEach(({ pattern, message, severity, exclude }) => {
          const matches = line.match(pattern);
          if (matches) {
            // Skip if exclude pattern matches
            if (exclude && line.match(exclude)) {
              return;
            }
            
            const issue = {
              file: filePath,
              line: lineNumber + 1,
              content: line.trim(),
              message,
              severity,
              match: matches[0]
            };
            
            if (severity === 'error') {
              this.errors.push(issue);
            } else {
              this.warnings.push(issue);
            }
          }
        });
      });
      
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  /**
   * 🔍 Scan directory recursively
   */
  async scanDirectory(baseDir = '.') {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx'
    ];
    
    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'public/**',
      '**/*.test.js',
      '**/*.spec.js',
      'reference-crash-game/**',
      'PacoGame/**',
      'scripts/**',
      'codemods/**',
      'src/lib/money.ts',
      'src/lib/money-ui.ts',
      'crash-casino/verification/**',
      'crash-casino/frontend/js/abstract-*.js',  // Gas price calculations are OK
      'crash-casino/frontend/js/manual-transaction-signer.js',  // Gas price calculations
      'crash-casino/frontend/js/*crash*.js',  // Crash multipliers are not money
      'crash-casino/backend/health-invariants-endpoint.js',  // Display formatting
      'crash-casino/backend/verify-seeds-endpoint.js',  // Multiplier math is not money
      'crash-casino/backend/proven-crash-engine.js',  // Multiplier math is not money
      'crash-casino/backend/provably-fair-rng.js',  // Multiplier math is not money
      'src/components/**',  // React components
      'src/trades/**',  // Different domain
      'server.js'  // Display-only conversions
    ];
    
    console.log('🔍 Scanning for dangerous money arithmetic...');
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: baseDir,
        ignore: excludePatterns,
        absolute: true
      });
      
      files.forEach(file => {
        this.scanFile(file);
      });
    }
  }

  /**
   * 📊 Generate report
   */
  generateReport() {
    console.log('\n💰 MONEY ARITHMETIC VALIDATION REPORT');
    console.log('=====================================');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ No dangerous money arithmetic detected!');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log(`\n🚨 ERRORS (${this.errors.length}):`);
      this.errors.forEach(error => {
        console.log(`❌ ${error.file}:${error.line}`);
        console.log(`   ${error.message}`);
        console.log(`   Code: ${error.content}`);
        console.log(`   Match: ${error.match}`);
        console.log('');
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(warning => {
        console.log(`⚠️  ${warning.file}:${warning.line}`);
        console.log(`   ${warning.message}`);
        console.log(`   Code: ${warning.content}`);
        console.log(`   Match: ${warning.match}`);
        console.log('');
      });
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n💥 VALIDATION FAILED - Fix errors before deployment!');
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   • Use parseEther() instead of multiplying by 1e18');
      console.log('   • Use formatEther() instead of dividing by 1e18');
      console.log('   • Use BigInt for all money arithmetic operations');
      console.log('   • Use viem utilities for wei ↔ ETH conversions');
      
      return false;
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  VALIDATION PASSED with warnings - Consider fixing warnings');
    }
    
    return true;
  }
}

// CLI usage
async function main() {
  const validator = new MoneyArithmeticValidator();
  await validator.scanDirectory();
  const passed = validator.generateReport();
  
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = MoneyArithmeticValidator;
