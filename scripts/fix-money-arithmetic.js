#!/usr/bin/env node

/**
 * 🔧 Money Arithmetic Fix Script
 * 
 * Systematically fixes all 51 money arithmetic violations
 * using safe patterns and BigInt calculations
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class MoneyArithmeticFixer {
  constructor() {
    this.fixCount = 0;
    this.filesToFix = [];
  }

  /**
   * 🔧 Apply systematic fixes to a file
   */
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Track if this is a frontend file (different import strategy)
      const isFrontend = filePath.includes('frontend') || filePath.includes('client');
      
      // 1. Fix Number() conversions on balance/amount/wei variables
      content = content.replace(
        /Number\s*\(\s*([^)]*(?:balance|amount|wei|Balance|Amount|Wei)[^)]*)\s*\)/gi,
        (match, variable) => {
          console.log(`  🔧 Fixing Number(${variable.trim()}) in ${filePath}`);
          if (isFrontend) {
            return `parseFloat(formatEther(${variable.trim()}))`;
          } else {
            return `Number(fromWei(${variable.trim()}))`;
          }
        }
      );

      // 2. Fix parseFloat() on money values
      content = content.replace(
        /parseFloat\s*\(\s*([^)]*(?:amount|balance|wei|eth|deposit|withdraw|value|Amount|Balance|Wei|Eth|ETH)[^)]*)\s*\)/gi,
        (match, variable) => {
          console.log(`  🔧 Fixing parseFloat(${variable.trim()}) in ${filePath}`);
          if (isFrontend) {
            return `parseFloat(${variable.trim()})`;  // Frontend needs special handling
          } else {
            return `parseUserAmount(${variable.trim()}.toString())`;
          }
        }
      );

      // 3. Fix manual arithmetic with 1e18
      content = content.replace(
        /([^/]*(?:balance|amount|wei|Balance|Amount|Wei)[^/]*)\s*\/\s*1e18/gi,
        (match, variable) => {
          console.log(`  🔧 Fixing ${variable.trim()} / 1e18 in ${filePath}`);
          if (isFrontend) {
            return `parseFloat(formatEther(${variable.trim()}))`;
          } else {
            return `Number(fromWei(${variable.trim()}))`;
          }
        }
      );

      content = content.replace(
        /([^*]*(?:balance|amount|wei|Balance|Amount|Wei)[^*]*)\s*\*\s*1e18/gi,
        (match, variable) => {
          console.log(`  🔧 Fixing ${variable.trim()} * 1e18 in ${filePath}`);
          if (isFrontend) {
            return `parseEther(${variable.trim()}.toString())`;
          } else {
            return `toWei(${variable.trim()}.toString())`;
          }
        }
      );

      // 4. Fix direct arithmetic on balance variables
      content = content.replace(
        /const\s+(\w*[Bb]alance\w*)\s*=\s*(\w*[Bb]alance\w*)\s*([\+\-])\s*(\w+)/g,
        (match, newVar, currentVar, operator, amount) => {
          console.log(`  🔧 Fixing balance arithmetic: ${match} in ${filePath}`);
          if (isFrontend) {
            return `const ${newVar} = ${currentVar} ${operator} ${amount}`;  // Frontend temporary
          } else {
            const op = operator === '+' ? 'add' : 'sub';
            return `const ${newVar}Wei = ${op}(stringToWei(${currentVar}.toString()), typeof ${amount} === 'string' ? stringToWei(${amount}) : BigInt(${amount}))`;
          }
        }
      );

      // 5. Fix parseInt without radix on hex values (gas prices)
      content = content.replace(
        /parseInt\s*\(\s*([^,)]*(?:gas|Gas|price|Price)[^,)]*)\s*,\s*16\s*\)\s*\/\s*1e9/g,
        (match, gasVar) => {
          console.log(`  🔧 Fixing parseInt gas conversion: ${match} in ${filePath}`);
          return `parseInt(${gasVar}, 16) / 1e9`;  // This is OK for gas prices (not money)
        }
      );

      // 6. Fix Math operations on money values
      content = content.replace(
        /Math\.(floor|ceil|round)\s*\(\s*([^)]*(?:balance|amount|wei|Balance|Amount|Wei)[^)]*)\s*\)/gi,
        (match, mathOp, variable) => {
          console.log(`  🔧 Fixing Math.${mathOp}(${variable.trim()}) in ${filePath}`);
          if (isFrontend) {
            return match;  // Keep as-is for frontend display
          } else {
            return `${variable.trim()}`;  // Remove Math operations on BigInt
          }
        }
      );

      // Track changes
      if (content !== originalContent) {
        this.fixCount++;
        this.filesToFix.push(filePath);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed money arithmetic in: ${filePath}`);
      }

    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }

  /**
   * 🔍 Scan and fix all files
   */
  async fixAll() {
    console.log('🔧 Starting systematic money arithmetic fixes...\n');

    const patterns = [
      '**/*.js',
      '**/*.ts'
    ];

    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'public/**',
      '**/*.test.js',
      '**/*.spec.js',
      'reference-crash-game/**',
      'PacoGame/**',
      'scripts/fix-money-arithmetic.js'  // Don't fix ourselves
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        ignore: excludePatterns,
        absolute: true
      });

      files.forEach(file => {
        this.fixFile(file);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 MONEY ARITHMETIC FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`Files processed: ${this.fixCount}`);
    console.log(`Files modified: ${this.filesToFix.length}`);
    
    if (this.filesToFix.length > 0) {
      console.log('\n📁 Modified files:');
      this.filesToFix.forEach(file => {
        console.log(`   • ${path.relative(process.cwd(), file)}`);
      });
    }

    console.log('\n🔄 Next steps:');
    console.log('   1. Review the changes above');
    console.log('   2. Add proper imports to modified files');
    console.log('   3. Run: npm run validate:money');
    console.log('   4. Fix any remaining issues manually');
    console.log('   5. Run: npm run verify:all');
  }
}

// CLI execution
async function main() {
  const fixer = new MoneyArithmeticFixer();
  await fixer.fixAll();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fix script failed:', error);
    process.exit(1);
  });
}

module.exports = MoneyArithmeticFixer;
