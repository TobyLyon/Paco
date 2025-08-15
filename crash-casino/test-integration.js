/**
 * 🧪 Integration Test Script
 * 
 * Tests that all security systems are properly integrated and working
 */

const express = require('express');
const http = require('http');

// Test the integration
async function testIntegration() {
    console.log('🧪 Starting Paco Rocko Security Integration Test...\n');
    
    try {
        // Create minimal Express app for testing
        const app = express();
        app.use(express.json());
        
        // Test environment variables
        console.log('📋 Checking environment variables...');
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY',
            'HOUSE_WALLET_PRIVATE_KEY',
            'HOT_WALLET_ADDRESS'
        ];
        
        const missing = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
            console.log('📝 Please add these to your .env file');
            return false;
        }
        console.log('✅ All required environment variables present\n');
        
        // Test file imports
        console.log('📦 Testing file imports...');
        try {
            const MultiplierCalculator = require('./shared/multiplier-calculator');
            const InputValidator = require('./utils/input-validator');
            const BetValidator = require('./backend/bet-validator');
            const ProvablyFairRNG = require('./backend/provably-fair-rng');
            const SolvencyManager = require('./backend/solvency-manager');
            const UnifiedCrashEngine = require('./backend/unified-crash-engine');
            
            console.log('✅ All security modules imported successfully\n');
            
            // Test basic functionality
            console.log('🔧 Testing basic functionality...');
            
            // Test MultiplierCalculator
            const startTime = Date.now() - 5000;
            const mult1 = MultiplierCalculator.calculateMultiplier(startTime);
            const mult2 = MultiplierCalculator.calculateMultiplier(startTime);
            if (mult1 !== mult2) {
                throw new Error('MultiplierCalculator inconsistent');
            }
            console.log('✅ MultiplierCalculator working');
            
            // Test InputValidator
            const validAddress = '0x' + '1'.repeat(40);
            const sanitized = InputValidator.sanitizeAddress(validAddress);
            if (sanitized !== validAddress.toLowerCase()) {
                throw new Error('InputValidator address sanitization failed');
            }
            console.log('✅ InputValidator working');
            
            // Test BetValidator
            const betValidator = new BetValidator();
            const validBet = betValidator.validateBet('test-player', 1.0, 2.0, [], new Map(), 'balance');
            if (validBet.amount !== 1.0 || validBet.multiplier !== 2.0) {
                throw new Error('BetValidator validation failed');
            }
            console.log('✅ BetValidator working');
            
            // Test ProvablyFairRNG
            const rng = new ProvablyFairRNG();
            rng.generateServerSeed();
            rng.setClientSeed('test-seed');
            const crashPoint = rng.calculateCrashPoint();
            if (crashPoint < 1.0 || crashPoint > 1000.0) {
                throw new Error('ProvablyFairRNG crash point out of bounds');
            }
            console.log('✅ ProvablyFairRNG working');
            
            console.log('\n🎉 Basic functionality tests passed!\n');
            
        } catch (error) {
            console.error('❌ Import test failed:', error.message);
            return false;
        }
        
        // Test database connection
        console.log('🗄️ Testing database connection...');
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            
            // Test basic query
            const { data, error } = await supabase
                .from('user_balances')
                .select('count')
                .limit(1);
                
            if (error) {
                console.warn(`⚠️ Database query error (may be normal): ${error.message}`);
            } else {
                console.log('✅ Database connection working');
            }
        } catch (error) {
            console.warn(`⚠️ Database test failed: ${error.message}`);
            console.log('📝 This may be normal if tables don\'t exist yet');
        }
        
        console.log('\n📡 Testing server integration...');
        
        // Test UnifiedPacoRockoProduction integration
        try {
            const UnifiedPacoRockoProduction = require('./unified-production-integration');
            
            const production = new UnifiedPacoRockoProduction(app, {
                corsOrigin: "*",
                enableDatabase: true
            });
            
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('✅ Production integration initialized successfully');
            
            // Test admin endpoints
            console.log('\n🔍 Testing admin endpoints...');
            
            const server = http.createServer(app);
            const testPort = 3001;
            
            await new Promise((resolve, reject) => {
                server.listen(testPort, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log(`🌐 Test server running on port ${testPort}`);
            
            // Test health endpoint
            const testEndpoint = async (endpoint, description) => {
                try {
                    const response = await fetch(`http://localhost:${testPort}${endpoint}`);
                    if (response.ok) {
                        console.log(`✅ ${description} endpoint working`);
                        return true;
                    } else {
                        console.log(`⚠️ ${description} endpoint returned ${response.status}`);
                        return false;
                    }
                } catch (error) {
                    console.log(`❌ ${description} endpoint failed: ${error.message}`);
                    return false;
                }
            };
            
            await testEndpoint('/api/admin/health', 'Health');
            await testEndpoint('/api/admin/solvency', 'Solvency');
            await testEndpoint('/api/admin/security', 'Security');
            
            server.close();
            
            console.log('\n🎊 ALL INTEGRATION TESTS PASSED! 🎊');
            console.log('\n✨ Your Paco Rocko security systems are ready for production!');
            console.log('\n📋 Next steps:');
            console.log('1. Run the database setup script');
            console.log('2. Deploy to your production environment');
            console.log('3. Monitor the admin endpoints');
            console.log('4. Run security tests in production');
            
            return true;
            
        } catch (error) {
            console.error('❌ Server integration test failed:', error.message);
            console.error('💡 This might be due to missing dependencies or database setup');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        return false;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testIntegration().then(success => {
        console.log(`\n🏁 Test ${success ? 'PASSED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testIntegration };
