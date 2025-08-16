#!/usr/bin/env node

/**
 * 🎯 Master Verification Script
 * 
 * Runs all verification checks required for production deployment
 * RED/GREEN summary for deployment readiness
 */

const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

class MasterVerification {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  /**
   * 🏃 Run a command and capture results
   */
  async runCommand(name, command, args = [], options = {}) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = performance.now() - startTime;
        this.results.push({
          name,
          passed: code === 0,
          duration: duration.toFixed(0),
          stdout,
          stderr,
          exitCode: code
        });
        resolve();
      });

      child.on('error', (error) => {
        const duration = performance.now() - startTime;
        this.results.push({
          name,
          passed: false,
          duration: duration.toFixed(0),
          stdout,
          stderr: stderr + error.message,
          exitCode: -1
        });
        resolve();
      });
    });
  }

  /**
   * 🧪 Run all verification checks
   */
  async runAllChecks() {
    console.log('🎯 Starting Master Verification...\n');

    // 1. Type checking
    console.log('1️⃣ Type checking...');
    await this.runCommand('TypeScript Check', 'npx', ['tsc', '--noEmit']);

    // 2. Linting
    console.log('2️⃣ Linting code...');
    await this.runCommand('ESLint', 'npx', ['eslint', '.', '--ext', '.js,.ts,.jsx,.tsx', '--max-warnings', '0']);

    // 3. Money arithmetic validation
    console.log('3️⃣ Validating money arithmetic...');
    await this.runCommand('Money Arithmetic', 'node', ['scripts/validate-money-arithmetic.js']);

    // 4. Unit tests
    console.log('4️⃣ Running unit tests...');
    await this.runCommand('Unit Tests', 'npm', ['run', 'test:unit']);

    // 5. Integration tests
    console.log('5️⃣ Running integration tests...');
    await this.runCommand('Integration Tests', 'npm', ['run', 'test:integration']);

    // 6. Indexer tests
    console.log('6️⃣ Testing indexer harness...');
    await this.runCommand('Indexer Tests', 'npm', ['run', 'test:indexer']);

    // 7. Check if server is running for health checks
    console.log('7️⃣ Checking health endpoints...');
    await this.runCommand('Health Check', 'curl', ['-f', 'http://localhost:3000/internal/health/invariants'], {
      timeout: 5000
    });

    // 8. Load test (quick smoke test)
    console.log('8️⃣ Running load smoke test...');
    await this.runCommand('Load Test', 'node', ['scripts/ws-stress.js'], {
      env: {
        ...process.env,
        STRESS_CLIENTS: '10',
        STRESS_DURATION: '10000'
      }
    });

    // Generate final report
    this.generateReport();
  }

  /**
   * 📊 Generate final verification report
   */
  generateReport() {
    const totalDuration = performance.now() - this.startTime;
    const passed = this.results.filter(r => r.passed);
    const failed = this.results.filter(r => !r.passed);

    console.log('\n' + '='.repeat(80));
    console.log('🎯 MASTER VERIFICATION REPORT');
    console.log('='.repeat(80));

    // Summary table
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('┌─────────────────────────────┬──────────┬──────────┬──────────┐');
    console.log('│ Check                       │ Status   │ Duration │ Exit Code│');
    console.log('├─────────────────────────────┼──────────┼──────────┼──────────┤');
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const name = result.name.padEnd(27);
      const duration = (result.duration + 'ms').padEnd(8);
      const exitCode = result.exitCode.toString().padEnd(8);
      
      console.log(`│ ${name} │ ${status}  │ ${duration} │ ${exitCode} │`);
    });
    
    console.log('└─────────────────────────────┴──────────┴──────────┴──────────┘');

    // Detailed results
    if (failed.length > 0) {
      console.log('\n🚨 FAILED CHECKS:');
      failed.forEach(result => {
        console.log(`\n❌ ${result.name}:`);
        if (result.stderr) {
          console.log('Error output:');
          console.log(result.stderr.substring(0, 500) + (result.stderr.length > 500 ? '...' : ''));
        }
      });
    }

    // Final verdict
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FINAL VERDICT:');
    console.log(`   Total checks: ${this.results.length}`);
    console.log(`   Passed: ${passed.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (failed.length === 0) {
      console.log('\n🎉 ✅ ALL VERIFICATIONS PASSED!');
      console.log('🚀 System is ready for production deployment!');
      console.log('\n✅ ACCEPTANCE CRITERIA MET:');
      console.log('   ✅ Type checking: 0 errors');
      console.log('   ✅ Linting: 0 errors, 0 warnings');
      console.log('   ✅ Money arithmetic: No dangerous patterns');
      console.log('   ✅ Unit tests: 100% pass rate');
      console.log('   ✅ Integration tests: 100% pass rate');
      console.log('   ✅ Indexer tests: Zero-miss validation');
      console.log('   ✅ Health checks: All invariants clean');
      console.log('   ✅ Load tests: Performance targets met');
      
      process.exit(0);
    } else {
      console.log('\n💥 ❌ VERIFICATION FAILED!');
      console.log('🛑 System NOT ready for production deployment!');
      console.log('\n🔧 REQUIRED FIXES:');
      
      failed.forEach(result => {
        console.log(`   ❌ ${result.name}: Exit code ${result.exitCode}`);
      });
      
      console.log('\n📋 REMEDIATION STEPS:');
      console.log('   1. Fix all failed checks listed above');
      console.log('   2. Re-run: npm run verify:all');
      console.log('   3. Ensure all checks pass before deployment');
      
      process.exit(1);
    }
  }

  /**
   * 📋 Print pre-flight checklist
   */
  static printPreflightChecklist() {
    console.log('🚀 PRE-FLIGHT CHECKLIST');
    console.log('=======================');
    console.log('Before running verification, ensure:');
    console.log('□ Dependencies installed: npm ci');
    console.log('□ Environment configured: .env files');
    console.log('□ Database schema applied: production-ledger-schema.sql');
    console.log('□ Server running (for health checks): npm run dev');
    console.log('□ Test database available');
    console.log('');
  }
}

// CLI execution
async function main() {
  // Show pre-flight checklist
  MasterVerification.printPreflightChecklist();

  // Run all verifications
  const verification = new MasterVerification();
  await verification.runAllChecks();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Master verification script failed:', error);
    process.exit(1);
  });
}

module.exports = MasterVerification;
