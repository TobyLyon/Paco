# Paco Trades Operations Runbook

This document provides operational procedures for managing the Paco Trades platform in production.

## Table of Contents

- [Emergency Procedures](#emergency-procedures)
- [Monitoring](#monitoring)
- [Incident Response](#incident-response)
- [Maintenance Tasks](#maintenance-tasks)
- [Configuration Management](#configuration-management)
- [Deployment Procedures](#deployment-procedures)

## Emergency Procedures

### 🚨 Critical: Pause Trading (Kill Switch)

**When to use**: Security breach, exploit detected, or system malfunction

**Steps**:

1. **Immediate Response** (< 5 minutes):
```sql
-- Connect to Supabase and update config
UPDATE trades_config 
SET value = 'false' 
WHERE key = 'TRADES_ENABLED';

-- Verify the kill switch is active
SELECT * FROM trades_config WHERE key = 'TRADES_ENABLED';
```

2. **Contract-Level Pause** (if needed):
```bash
# Connect to the SwapEscrow contract as owner
cast send $SWAP_ESCROW_ADDRESS "setPaused(bool)" true \
  --rpc-url https://api.mainnet.abs.xyz \
  --private-key $OWNER_PRIVATE_KEY
```

3. **Verify Systems Stopped**:
   - Check `/trades` returns disabled state
   - Verify no new orders can be created
   - Confirm existing orders cannot be filled

4. **Communication** (< 15 minutes):
   - Post status update on Twitter
   - Update Discord with brief explanation
   - Notify core team via emergency contacts

### 🔄 Resume Trading

**Prerequisites**: Issue resolved, systems verified, security audit complete

**Steps**:

1. **Contract-Level Resume** (if paused):
```bash
cast send $SWAP_ESCROW_ADDRESS "setPaused(bool)" false \
  --rpc-url https://api.mainnet.abs.xyz \
  --private-key $OWNER_PRIVATE_KEY
```

2. **Database Re-enable**:
```sql
UPDATE trades_config 
SET value = 'true' 
WHERE key = 'TRADES_ENABLED';
```

3. **Verification**:
   - Test order creation with small amounts
   - Verify all systems operational
   - Monitor for 30 minutes post-resume

4. **Communication**:
   - Announce resumption on social channels
   - Provide brief explanation of resolution

## Monitoring

### Key Metrics to Monitor

**Trading Volume**:
```sql
-- Daily trading volume
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'filled') as filled_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
FROM trades_orders 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Risk Flags**:
```sql
-- High-risk orders in last 24h
SELECT 
  COUNT(*) as high_risk_orders,
  AVG(risk_score) as avg_risk_score
FROM trades_order_book 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND risk_score > 70;
```

**System Health**:
```sql
-- Error rates and system status
SELECT 
  key,
  value,
  updated_at
FROM trades_config 
WHERE key IN ('TRADES_ENABLED', 'API_STATUS', 'LAST_HEALTH_CHECK');
```

### Alerts Configuration

Set up monitoring alerts for:

1. **High Risk Activity** (threshold: >10 high-risk orders/hour):
```sql
SELECT COUNT(*) 
FROM trades_orders 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND risk_score > 70;
```

2. **Failed Transactions** (threshold: >5% failure rate):
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM trades_fills 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

3. **API Response Time** (threshold: >2s average):
```bash
# Set up HTTP monitoring for key endpoints
curl -w "@curl-format.txt" -s -o /dev/null $API_URL/api/trades/orders
```

4. **Contract Balance** (unexpected ETH accumulation):
```bash
cast balance $SWAP_ESCROW_ADDRESS --rpc-url https://api.mainnet.abs.xyz
```

### Dashboard Queries

**Trading Overview**:
```sql
-- 24-hour trading summary
WITH stats AS (
  SELECT 
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'filled') as filled,
    COUNT(*) FILTER (WHERE status = 'open') as open,
    AVG(risk_score) as avg_risk,
    MAX(risk_score) as max_risk
  FROM trades_order_book 
  WHERE created_at > NOW() - INTERVAL '24 hours'
)
SELECT 
  total_orders,
  filled,
  open,
  ROUND(avg_risk, 2) as avg_risk_score,
  max_risk as highest_risk_score,
  ROUND(filled * 100.0 / NULLIF(total_orders, 0), 2) as fill_rate_percent
FROM stats;
```

## Incident Response

### Incident Classification

**P0 - Critical**:
- Trading platform down
- Security vulnerability exploited
- Data breach
- Smart contract exploit

**P1 - High**:
- Significant feature degradation
- High error rates (>10%)
- Risk system malfunction

**P2 - Medium**:
- Minor feature issues
- Performance degradation
- Non-critical bugs

**P3 - Low**:
- UI/UX improvements
- Documentation issues
- Feature requests

### Incident Response Process

1. **Detection** (0-5 minutes):
   - Automated alerts or user reports
   - Initial triage and classification
   - Escalate to on-call engineer

2. **Response** (5-15 minutes):
   - Assess impact and scope
   - Implement immediate mitigations
   - Engage additional team members if needed

3. **Resolution** (varies by incident):
   - Implement permanent fix
   - Verify resolution
   - Monitor for regression

4. **Post-Incident** (within 24 hours):
   - Document lessons learned
   - Update runbooks and procedures
   - Implement preventive measures

### Common Incident Scenarios

**High Risk Order Volume**:
```bash
# Check for suspicious patterns
psql $SUPABASE_DATABASE_URL -c "
SELECT 
  maker_address,
  COUNT(*) as order_count,
  AVG(risk_score) as avg_risk
FROM trades_orders 
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY maker_address 
HAVING COUNT(*) > 10 OR AVG(risk_score) > 80
ORDER BY order_count DESC;
"
```

**API Rate Limiting Issues**:
```bash
# Check rate limit violations
grep "rate limit" /var/log/trades-api.log | tail -50

# Adjust rate limits if needed
psql $SUPABASE_DATABASE_URL -c "
UPDATE trades_config 
SET value = '150' 
WHERE key = 'API_RATE_LIMIT_PER_MINUTE';
"
```

**Smart Contract Issues**:
```bash
# Check contract events for anomalies
cast logs $SWAP_ESCROW_ADDRESS \
  --from-block latest-100 \
  --rpc-url https://api.mainnet.abs.xyz

# Verify contract state
cast call $SWAP_ESCROW_ADDRESS "paused()(bool)" \
  --rpc-url https://api.mainnet.abs.xyz
```

## Maintenance Tasks

### Daily Tasks

1. **Health Check**:
```bash
# Automated health check script
#!/bin/bash
set -e

echo "Checking API health..."
curl -f $API_URL/health || exit 1

echo "Checking database connectivity..."
psql $SUPABASE_DATABASE_URL -c "SELECT 1;" || exit 1

echo "Checking contract accessibility..."
cast call $SWAP_ESCROW_ADDRESS "VERSION()(string)" \
  --rpc-url https://api.mainnet.abs.xyz || exit 1

echo "All systems healthy ✓"
```

2. **Risk Score Calibration**:
```sql
-- Review risk score distribution
SELECT 
  CASE 
    WHEN risk_score < 30 THEN 'Low (0-29)'
    WHEN risk_score < 70 THEN 'Medium (30-69)'
    ELSE 'High (70-100)'
  END as risk_level,
  COUNT(*) as order_count,
  COUNT(*) FILTER (WHERE status = 'filled') as filled_count
FROM trades_orders 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

### Weekly Tasks

1. **Database Maintenance**:
```sql
-- Clean up old expired orders (>30 days)
DELETE FROM trades_orders 
WHERE status = 'expired' 
  AND created_at < NOW() - INTERVAL '30 days';

-- Update statistics
ANALYZE trades_orders;
ANALYZE trades_fills;
```

2. **Performance Review**:
```sql
-- Slow query analysis
SELECT 
  calls,
  total_time,
  mean_time,
  query
FROM pg_stat_statements 
WHERE query LIKE '%trades_%'
ORDER BY total_time DESC 
LIMIT 10;
```

### Monthly Tasks

1. **Security Audit**:
   - Review high-risk orders and patterns
   - Update risk scoring parameters
   - Validate contract permissions

2. **Backup Verification**:
   - Test database restore procedures
   - Verify contract state backups
   - Update disaster recovery plans

## Configuration Management

### Environment Variables

**Production Environment**:
```bash
# Critical settings
export TRADES_ENABLED=true
export TRADES_MAX_EXPIRY_HOURS=24
export TRADES_RISK_SCORE_HIGH_THRESHOLD=70
export TRADES_API_RATE_LIMIT_PER_MINUTE=100

# Update configuration
curl -X POST $API_URL/admin/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"TRADES_RISK_SCORE_HIGH_THRESHOLD": 75}'
```

### Risk Scoring Parameters

**Adjusting Risk Thresholds**:
```sql
-- Update risk scoring parameters
UPDATE trades_config SET value = '30' WHERE key = 'MIN_HOLDER_COUNT_THRESHOLD';
UPDATE trades_config SET value = '7' WHERE key = 'MAX_CONTRACT_AGE_DAYS';
UPDATE trades_config SET value = '80' WHERE key = 'MAX_VALUE_SKEW_PERCENT';
```

**Adding New Risk Rules**:
```javascript
// Update risk scoring service
const newRule = {
  name: 'EXCESSIVE_APPROVALS',
  weight: 25,
  check: (order) => {
    // Implementation
    return order.excessiveApprovals ? 25 : 0;
  }
};

// Add to risk scorer configuration
```

### Fee Management

**Update Protocol Fees**:
```bash
# Current fee: 0%
cast call $SWAP_ESCROW_ADDRESS "feeBps()(uint256)" \
  --rpc-url https://api.mainnet.abs.xyz

# Update to 0.5% (50 basis points)
cast send $SWAP_ESCROW_ADDRESS "setFeeBps(uint256)" 50 \
  --rpc-url https://api.mainnet.abs.xyz \
  --private-key $OWNER_PRIVATE_KEY
```

## Deployment Procedures

### Frontend Deployment

1. **Pre-deployment**:
```bash
# Run tests
npm run test
npm run test:e2e

# Build and verify
npm run build
npm run preview
```

2. **Deployment**:
```bash
# Deploy to staging
git push staging main

# Verify staging deployment
curl $STAGING_URL/trades

# Deploy to production
git push production main
```

3. **Post-deployment**:
```bash
# Smoke test critical paths
npm run test:smoke

# Monitor for 30 minutes
tail -f /var/log/nginx/access.log | grep "/trades"
```

### API Deployment

1. **Rolling Deployment**:
```bash
# Deploy with zero downtime
render deploy --service trades-api --wait

# Health check
curl $API_URL/health
```

2. **Database Migrations**:
```bash
# Run migrations
psql $SUPABASE_DATABASE_URL -f migrations/new_migration.sql

# Verify migration
psql $SUPABASE_DATABASE_URL -c "\d trades_orders"
```

### Smart Contract Updates

**Note**: SwapEscrow is non-upgradeable. New features require new deployment.

1. **New Contract Deployment**:
```bash
# Deploy new version
forge script script/DeploySwapEscrowV2.s.sol \
  --rpc-url https://api.mainnet.abs.xyz \
  --broadcast --verify

# Update environment variables
export TRADES_SWAP_ESCROW_ADDRESS_V2=0x...
```

2. **Migration Strategy**:
   - Deploy new contract
   - Update frontend to support both versions
   - Gradually migrate users
   - Deprecate old contract

## Contact Information

### Emergency Contacts

- **On-call Engineer**: [phone number]
- **Technical Lead**: [email/phone]
- **Security Team**: security@paco.xyz
- **DevOps**: devops@paco.xyz

### External Services

- **Render Support**: [support channel]
- **Supabase Support**: [support channel]
- **Abstract Network**: [support channel]

---

**Last Updated**: [Date]
**Review Schedule**: Monthly
**Next Review**: [Date + 1 month]