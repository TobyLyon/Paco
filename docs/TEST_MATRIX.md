# 🧪 Test Matrix

## Testing Philosophy

Our testing strategy ensures **casino-grade reliability** through comprehensive coverage of critical paths, edge cases, and failure scenarios. Every test must pass before deployment.

## Test Categories

### 🔬 Unit Tests
**Purpose**: Verify individual component behavior in isolation  
**Coverage**: Critical business logic, mathematical calculations, utility functions

| Component | Test File | Coverage Areas | Why Critical |
|-----------|-----------|----------------|--------------|
| **ProvablyFairRNG** | `provably-fair-rng.test.js` | Seed generation, hash validation, crash calculation, statistical distribution | Ensures game fairness and 3% house edge |
| **MultiplierCalculator** | `multiplier-calculator.test.js` | Validation logic, payout calculations, profit/loss detection | Prevents invalid cashouts, accurate P&L |
| **NonceManager** | `nonce-manager.test.js` | Transaction sequencing, fee bumping, error recovery | Prevents stuck transactions |
| **MoneyArithmetic** | `validate-money-arithmetic.test.js` | BigInt usage, precision handling | Prevents floating-point money errors |

**Success Criteria**: 100% pass rate, >90% code coverage on critical paths

### 🔗 Integration Tests
**Purpose**: Verify component interactions and data flow  
**Coverage**: API endpoints, database operations, business workflows

| Test Suite | File | Scenario | Expected Outcome |
|------------|------|----------|------------------|
| **Balance API** | `production-balance-api.integration.test.js` | Place bet → lock funds → win settlement | Atomic operations, proper version bumping |
| **Deposit Flow** | `deposit-flow.integration.test.js` | ETH transfer → indexer detection → balance credit | Zero missed deposits, idempotency |
| **Bet Lifecycle** | `bet-lifecycle.integration.test.js` | Bet → round crash → settlement | Proper fund flow, no double spends |
| **OCC Conflicts** | `occ-conflicts.integration.test.js` | Concurrent bets with version conflicts | Graceful handling, retry logic |
| **Idempotency** | `idempotency.integration.test.js` | Duplicate operations with same client_id | No double processing |

**Success Criteria**: All happy and unhappy paths pass, proper error handling

### 🎭 End-to-End Tests
**Purpose**: Verify complete user journeys in realistic browser environment  
**Tool**: Playwright  
**Coverage**: Full user flows, UI interactions, edge cases

| Test Suite | File | User Journey | Validation Points |
|------------|------|--------------|-------------------|
| **Happy Path** | `casino-flow.spec.js` | Connect wallet → deposit → bet → cashout → withdraw | Balance consistency, UI updates |
| **Losing Bet** | `casino-flow.spec.js` | Place bet → round crashes → lose funds | Proper loss handling, balance update |
| **Reconnection** | `casino-flow.spec.js` | Disconnect → reconnect → event replay | No missed events, state consistency |
| **Race Conditions** | `casino-flow.spec.js` | Rapid bet attempts → prevent double spends | Only one bet processed |
| **Maintenance Mode** | `casino-flow.spec.js` | Feature flags → UI disabled → banners shown | Graceful degradation |
| **Error Handling** | `casino-flow.spec.js` | Network failures → error messages | User-friendly error display |

**Success Criteria**: All user flows work in Chrome, Firefox, Safari

### 🔍 Indexer Harness Tests
**Purpose**: Verify blockchain monitoring never misses transactions  
**Coverage**: Edge cases, failure scenarios, reorg handling

| Test Case | File | Scenario | Expected Behavior |
|-----------|------|----------|-------------------|
| **WebSocket Drop** | `deposit-indexer-tests.js` | WS disconnects → HTTP catches up | Zero missed deposits |
| **Reorg Handling** | `deposit-indexer-tests.js` | Blockchain reorg → reprocess buffer | No double credits |
| **Confirmation Threshold** | `deposit-indexer-tests.js` | Credit before 12 confirmations | Deposits wait for safety |
| **Duplicate Events** | `deposit-indexer-tests.js` | Same tx processed twice | Idempotency prevents double credit |
| **Mass Deposits** | `deposit-indexer-tests.js` | 100+ deposits in single block | All processed correctly |

**Success Criteria**: 100% deposit detection rate, zero double credits

### 🌊 Load Tests
**Purpose**: Verify system performance under realistic load  
**Tool**: Custom WebSocket stress tester  
**Coverage**: Concurrent users, bet throughput, connection stability

| Metric | Target | Test Scenario | Pass Criteria |
|--------|--------|---------------|---------------|
| **Concurrent Users** | 1000 | Simultaneous connections | >99.5% success rate |
| **Bet Latency** | <150ms | Place bet → confirmation | p95 under threshold |
| **Socket Stability** | >99% | Mass reconnections | Event replay works |
| **Throughput** | 100 bets/sec | High-frequency betting | No dropped requests |
| **Memory Usage** | <2GB | 6-hour sustained load | No memory leaks |

**Test Configuration**:
```bash
STRESS_CLIENTS=1000 STRESS_DURATION=300000 npm run test:load
```

**Success Criteria**: All performance targets met, no crashes

### 🌪️ Chaos Tests
**Purpose**: Verify graceful degradation under failure conditions  
**Coverage**: Database slowdowns, RPC failures, network partitions

| Chaos Type | Injection Method | Expected Behavior |
|------------|------------------|-------------------|
| **DB Slowdown** | Add 500ms delay | Circuit breaker activates |
| **RPC Failures** | 20% failure rate | Retries with backoff |
| **Memory Pressure** | Allocate 1GB | Graceful performance degradation |
| **Network Partition** | Drop connections | Reconnection with replay |
| **Maintenance Mode** | Feature flags | Operations paused, banners shown |

**Success Criteria**: No data loss, graceful degradation, clear user communication

## Test Data & Fixtures

### 🧪 Test Database
```sql
-- Isolated test environment
CREATE SCHEMA test_casino;
-- Same structure as production
-- Cleaned between test runs
```

### 💰 Test Wallets
```javascript
const TEST_WALLETS = {
  alice: '0x1234567890123456789012345678901234567890',
  bob: '0x2345678901234567890123456789012345678901',
  house: '0x3456789012345678901234567890123456789012',
  hot: '0x4567890123456789012345678901234567890123'
};
```

### 🎲 Test Seeds
```javascript
const TEST_SEEDS = {
  server: 'test_server_seed_deterministic',
  client: 'test_client_seed',
  expectedHash: 'known_sha256_hash',
  expectedCrash: 2.34 // Deterministic from seeds
};
```

## Continuous Integration

### 🔄 Pre-commit Checks
```bash
# Automatic on every commit
npm run validate:money  # No dangerous money arithmetic
npm run lint           # Code quality
npm run typecheck      # Type safety
```

### 🚀 CI Pipeline
```yaml
# .github/workflows/ci.yml
- Type checking (TypeScript strict mode)
- Lint (ESLint with money arithmetic rules)
- Unit tests (Jest with coverage)
- Integration tests (Supertest)
- E2E tests (Playwright)
- Load tests (WebSocket stress)
- Security audit (npm audit)
- SBOM generation (CycloneDX)
```

### ✅ Deployment Gates
All checks must pass before merge to main:
- [ ] Type checking: 0 errors
- [ ] Lint: 0 errors, 0 warnings
- [ ] Money validation: 0 dangerous patterns
- [ ] Unit tests: 100% pass, >90% coverage
- [ ] Integration tests: 100% pass
- [ ] E2E tests: 100% pass (Chrome, Firefox, Safari)
- [ ] Load tests: Performance targets met
- [ ] Security audit: No high/critical vulnerabilities

## Test Execution

### 🏃 Running Tests Locally
```bash
# Individual test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:indexer     # Indexer harness
npm run test:load        # Load/stress tests

# Full verification suite
npm run verify:all       # All tests + linting + validation
```

### 🎯 Debug Mode
```bash
# Run with debug output
DEBUG=true npm run test:unit
npm run test:watch       # Watch mode for development
restoreConsole()         # In tests to enable console output
```

## Performance Benchmarks

### ⚡ Latency Targets
| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Place Bet | <50ms | <100ms | <200ms |
| Cashout | <30ms | <80ms | <150ms |
| Balance Query | <20ms | <50ms | <100ms |
| Socket Event | <10ms | <25ms | <50ms |

### 🔢 Throughput Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| Bets/second | 100+ | Sustained load |
| Socket events/second | 1000+ | Broadcast efficiency |
| DB queries/second | 500+ | Connection pooling |
| Indexer blocks/minute | 300+ | Blockchain monitoring |

## Quality Gates

### 🚨 Blocker Issues
Tests fail deployment if:
- Any unit/integration test fails
- Money arithmetic validation fails
- E2E critical path fails
- Load test performance below threshold
- Security audit finds critical vulnerabilities

### ⚠️ Warning Issues
Tests warn but don't block:
- E2E flaky tests (retry 3x)
- Load test below optimal (but above minimum)
- Low test coverage on non-critical code
- ESLint warnings (but not errors)

### 📊 Coverage Requirements
| Component Type | Min Coverage | Target |
|----------------|--------------|--------|
| Money operations | 100% | 100% |
| Business logic | 90% | 95% |
| API endpoints | 85% | 90% |
| Utilities | 80% | 85% |

## Test Maintenance

### 🔄 Regular Updates
- **Weekly**: Update test dependencies
- **Monthly**: Review test performance and flaky tests
- **Quarterly**: Audit test coverage and add missing scenarios
- **Release**: Add regression tests for fixed bugs

### 📈 Metrics Tracking
- Test execution time trends
- Flaky test identification
- Coverage evolution
- Performance regression detection

### 🧹 Test Hygiene
- Remove obsolete tests
- Update test data for new features
- Maintain test environment parity with production
- Regular test database cleanup

This comprehensive test matrix ensures every critical path is verified before deployment, providing **casino-grade confidence** in system reliability.
