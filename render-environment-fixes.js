/**
 * 🔧 RENDER ENVIRONMENT FIXES
 * 
 * This file contains patches to make the application work identically
 * on Render as it does locally.
 */

const fs = require('fs');
const path = require('path');

class RenderEnvironmentFixer {
    constructor() {
        this.fixes = [];
        this.errors = [];
    }

    /**
     * 🔍 Fix 1: Environment Variable Consistency
     */
    async fixEnvironmentVariables() {
        console.log('🔧 Applying Environment Variable Fixes...');
        
        // Ensure both SUPABASE_URL variants exist
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
            process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
            console.log('✅ Fixed: Added SUPABASE_URL from NEXT_PUBLIC_SUPABASE_URL');
        }
        
        if (process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
            console.log('✅ Fixed: Added NEXT_PUBLIC_SUPABASE_URL from SUPABASE_URL');
        }

        // Ensure JWT_SECRET has a fallback
        if (!process.env.JWT_SECRET) {
            process.env.JWT_SECRET = 'paco-crash-production-key-2025';
            console.log('⚠️ Warning: JWT_SECRET not found, using fallback');
        }

        // Ensure PORT is set
        if (!process.env.PORT) {
            process.env.PORT = '3001';
            console.log('✅ Fixed: Set default PORT to 3001');
        }

        // Ensure CORS_ORIGIN is set for production
        if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === 'production') {
            process.env.CORS_ORIGIN = 'https://pacothechicken.xyz';
            console.log('✅ Fixed: Set production CORS_ORIGIN');
        }

        this.fixes.push('Environment variables normalized');
    }

    /**
     * 🔍 Fix 2: Module Path Resolution
     */
    async fixModulePaths() {
        console.log('🔧 Checking Module Paths...');
        
        const criticalFiles = [
            './crash-casino/backend/src/game-engine-compiled.js',
            './crash-casino/backend/src/websocket-server-compiled.js',
            './crash-casino/backend/wallet-integration-abstract.js',
            './crash-casino/backend/house-wallet.js'
        ];

        for (const filePath of criticalFiles) {
            try {
                const fullPath = path.resolve(filePath);
                if (fs.existsSync(fullPath)) {
                    console.log(`✅ Found: ${filePath}`);
                } else {
                    console.error(`❌ Missing: ${filePath}`);
                    this.errors.push(`Missing critical file: ${filePath}`);
                }
            } catch (error) {
                console.error(`❌ Error checking ${filePath}:`, error.message);
                this.errors.push(`Error checking ${filePath}: ${error.message}`);
            }
        }

        this.fixes.push('Module paths verified');
    }

    /**
     * 🔍 Fix 3: Enhanced Cache Clearing
     */
    clearRequireCache() {
        console.log('🔧 Clearing Enhanced Module Cache...');
        
        const modulePatterns = [
            './crash-casino/backend/src/game-engine-compiled.js',
            './crash-casino/backend/src/websocket-server-compiled.js',
            './crash-casino/backend/wallet-integration-abstract.js',
            './crash-casino/backend/wallet-integration.js',
            './crash-casino/backend/house-wallet.js',
            './crash-casino/production-integration.js'
        ];

        let clearedCount = 0;
        modulePatterns.forEach(pattern => {
            try {
                const resolved = require.resolve(pattern);
                if (require.cache[resolved]) {
                    delete require.cache[resolved];
                    clearedCount++;
                    console.log(`🧹 Cleared cache: ${pattern}`);
                }
            } catch (e) {
                console.log(`⚠️ Could not clear cache for ${pattern}: ${e.message}`);
            }
        });

        console.log(`✅ Cleared ${clearedCount} cached modules`);
        this.fixes.push(`Cleared ${clearedCount} cached modules`);
    }

    /**
     * 🔍 Fix 4: Database Connection Test
     */
    async testDatabaseConnection() {
        console.log('🔧 Testing Database Connection...');
        
        try {
            // Only test if we have the required environment variables
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            }

            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Test with a simple query
            const { data, error } = await supabase
                .from('crash_rounds')
                .select('count')
                .limit(1);

            if (error) {
                throw error;
            }

            console.log('✅ Database connection successful');
            this.fixes.push('Database connection verified');
            
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.errors.push(`Database connection failed: ${error.message}`);
        }
    }

    /**
     * 🔍 Fix 5: WebSocket Configuration
     */
    validateWebSocketConfig() {
        console.log('🔧 Validating WebSocket Configuration...');
        
        const requiredVars = ['CORS_ORIGIN'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Missing WebSocket env vars:', missingVars);
            this.errors.push(`Missing WebSocket environment variables: ${missingVars.join(', ')}`);
        } else {
            console.log('✅ WebSocket configuration looks good');
            this.fixes.push('WebSocket configuration validated');
        }
    }

    /**
     * 🔍 Fix 6: Wallet Integration Check
     */
    async testWalletIntegration() {
        console.log('🔧 Testing Wallet Integration...');
        
        try {
            // Check if wallet environment variables exist
            const walletVars = [
                'HOUSE_WALLET_ADDRESS',
                'HOUSE_WALLET_PRIVATE_KEY',
                'ABSTRACT_NETWORK'
            ];
            
            const missingWalletVars = walletVars.filter(varName => !process.env[varName]);
            
            if (missingWalletVars.length > 0) {
                throw new Error(`Missing wallet variables: ${missingWalletVars.join(', ')}`);
            }

            // Try to load house wallet
            const { getHouseWallet } = require('./crash-casino/backend/house-wallet.js');
            const houseWallet = getHouseWallet();
            
            if (!houseWallet) {
                throw new Error('House wallet failed to initialize');
            }

            console.log('✅ Wallet integration working');
            console.log('🏦 House wallet address:', houseWallet.address);
            this.fixes.push('Wallet integration verified');
            
        } catch (error) {
            console.error('❌ Wallet integration failed:', error.message);
            this.errors.push(`Wallet integration failed: ${error.message}`);
        }
    }

    /**
     * 🚀 Run All Fixes
     */
    async runAllFixes() {
        console.log('🎯 STARTING RENDER ENVIRONMENT FIXES...\n');
        
        // Clear cache first
        this.clearRequireCache();
        
        // Apply fixes
        await this.fixEnvironmentVariables();
        await this.fixModulePaths();
        await this.testDatabaseConnection();
        this.validateWebSocketConfig();
        await this.testWalletIntegration();
        
        // Report results
        console.log('\n📊 RENDER FIXES SUMMARY:');
        console.log('✅ Fixes Applied:', this.fixes.length);
        this.fixes.forEach(fix => console.log(`  - ${fix}`));
        
        if (this.errors.length > 0) {
            console.log('\n❌ Issues Found:', this.errors.length);
            this.errors.forEach(error => console.log(`  - ${error}`));
            return false;
        } else {
            console.log('\n🎉 All fixes applied successfully!');
            return true;
        }
    }

    /**
     * 🔍 Generate Environment Report
     */
    generateEnvironmentReport() {
        const report = {
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            cwd: process.cwd(),
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT,
            fixes: this.fixes,
            errors: this.errors,
            environmentVariables: {
                supabaseUrl: !!process.env.SUPABASE_URL,
                supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                jwtSecret: !!process.env.JWT_SECRET,
                corsOrigin: !!process.env.CORS_ORIGIN,
                houseWallet: !!process.env.HOUSE_WALLET_ADDRESS,
                abstractNetwork: process.env.ABSTRACT_NETWORK
            }
        };

        console.log('\n📋 ENVIRONMENT REPORT:');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }
}

module.exports = RenderEnvironmentFixer;

// If running directly, execute the fixes
if (require.main === module) {
    const fixer = new RenderEnvironmentFixer();
    fixer.runAllFixes().then(success => {
        fixer.generateEnvironmentReport();
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Render fixes failed:', error);
        process.exit(1);
    });
}
