/**
 * 🔍 RENDER DEPLOYMENT VALIDATOR
 * 
 * Run this script to validate that your Render deployment matches your local environment
 * Usage: node validate-render-deployment.js [--local|--production]
 */

const https = require('https');
const http = require('http');
const WebSocket = require('ws');

class RenderDeploymentValidator {
    constructor(options = {}) {
        this.isLocal = options.local || false;
        this.baseUrl = this.isLocal ? 'http://localhost:3001' : 'https://paco-x57j.onrender.com';
        this.frontendUrl = this.isLocal ? 'http://localhost:3000' : 'https://pacothechicken.xyz';
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    /**
     * 🧪 Test HTTP Health Endpoint
     */
    async testHealthEndpoint() {
        console.log('🧪 Testing health endpoint...');
        
        return new Promise((resolve) => {
            const url = `${this.baseUrl}/health`;
            const client = this.baseUrl.startsWith('https') ? https : http;
            
            const req = client.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (res.statusCode === 200 && result.status === 'OK') {
                            this.results.passed.push(`Health endpoint: ${url}`);
                            console.log('✅ Health endpoint working');
                            resolve(true);
                        } else {
                            this.results.failed.push(`Health endpoint returned: ${res.statusCode}`);
                            console.log('❌ Health endpoint failed');
                            resolve(false);
                        }
                    } catch (error) {
                        this.results.failed.push(`Health endpoint parse error: ${error.message}`);
                        console.log('❌ Health endpoint response not JSON');
                        resolve(false);
                    }
                });
            });
            
            req.on('error', (error) => {
                this.results.failed.push(`Health endpoint connection error: ${error.message}`);
                console.log('❌ Health endpoint connection failed:', error.message);
                resolve(false);
            });
            
            req.setTimeout(10000, () => {
                this.results.failed.push('Health endpoint timeout');
                console.log('❌ Health endpoint timeout');
                resolve(false);
            });
        });
    }

    /**
     * 🧪 Test WebSocket Connection
     */
    async testWebSocketConnection() {
        console.log('🧪 Testing WebSocket connection...');
        
        return new Promise((resolve) => {
            const wsUrl = this.baseUrl.replace('http', 'ws') + '/crash-ws';
            console.log('🔗 Connecting to:', wsUrl);
            
            const ws = new WebSocket(wsUrl);
            let connected = false;
            
            const timeout = setTimeout(() => {
                if (!connected) {
                    this.results.failed.push('WebSocket connection timeout');
                    console.log('❌ WebSocket connection timeout');
                    ws.terminate();
                    resolve(false);
                }
            }, 10000);
            
            ws.on('open', () => {
                connected = true;
                clearTimeout(timeout);
                this.results.passed.push(`WebSocket connection: ${wsUrl}`);
                console.log('✅ WebSocket connection working');
                ws.close();
                resolve(true);
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.results.failed.push(`WebSocket error: ${error.message}`);
                console.log('❌ WebSocket connection failed:', error.message);
                resolve(false);
            });
        });
    }

    /**
     * 🧪 Test Frontend Accessibility
     */
    async testFrontendAccess() {
        console.log('🧪 Testing frontend accessibility...');
        
        const paths = [
            '/',
            '/pacorocko',
            '/crash-casino/frontend/pacorocko.html'
        ];
        
        for (const path of paths) {
            const success = await this.testPath(this.frontendUrl + path);
            if (success) {
                this.results.passed.push(`Frontend path: ${path}`);
            } else {
                this.results.failed.push(`Frontend path inaccessible: ${path}`);
            }
        }
    }

    /**
     * 🧪 Test API Endpoints
     */
    async testAPIEndpoints() {
        console.log('🧪 Testing API endpoints...');
        
        const endpoints = [
            '/api/crash/stats',
            '/api/crash/health',
            '/api/crash/history'
        ];
        
        for (const endpoint of endpoints) {
            const success = await this.testPath(this.baseUrl + endpoint);
            if (success) {
                this.results.passed.push(`API endpoint: ${endpoint}`);
            } else {
                this.results.failed.push(`API endpoint failed: ${endpoint}`);
            }
        }
    }

    /**
     * 🔧 Helper: Test Individual Path
     */
    async testPath(url) {
        return new Promise((resolve) => {
            const client = url.startsWith('https') ? https : http;
            
            const req = client.get(url, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    console.log(`✅ ${url} (${res.statusCode})`);
                    resolve(true);
                } else {
                    console.log(`❌ ${url} (${res.statusCode})`);
                    resolve(false);
                }
            });
            
            req.on('error', (error) => {
                console.log(`❌ ${url} (${error.message})`);
                resolve(false);
            });
            
            req.setTimeout(5000, () => {
                console.log(`❌ ${url} (timeout)`);
                resolve(false);
            });
        });
    }

    /**
     * 🧪 Test Environment Variables (via health endpoint)
     */
    async testEnvironmentConfig() {
        console.log('🧪 Testing environment configuration...');
        
        try {
            const url = `${this.baseUrl}/api/crash/stats`;
            const data = await this.fetchJSON(url);
            
            if (data && typeof data === 'object') {
                this.results.passed.push('Environment configuration accessible');
                console.log('✅ Environment configuration working');
                
                // Check for expected fields
                const expectedFields = ['serverTime', 'status', 'version'];
                const missingFields = expectedFields.filter(field => !(field in data));
                
                if (missingFields.length > 0) {
                    this.results.warnings.push(`Missing stats fields: ${missingFields.join(', ')}`);
                }
                
                return true;
            } else {
                this.results.failed.push('Environment configuration not accessible');
                console.log('❌ Environment configuration failed');
                return false;
            }
        } catch (error) {
            this.results.failed.push(`Environment config error: ${error.message}`);
            console.log('❌ Environment configuration error:', error.message);
            return false;
        }
    }

    /**
     * 🔧 Helper: Fetch JSON from URL
     */
    async fetchJSON(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            
            const req = client.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Timeout')));
        });
    }

    /**
     * 🚀 Run All Validation Tests
     */
    async runAllTests() {
        console.log(`🎯 VALIDATING ${this.isLocal ? 'LOCAL' : 'PRODUCTION'} DEPLOYMENT\n`);
        console.log(`Backend URL: ${this.baseUrl}`);
        console.log(`Frontend URL: ${this.frontendUrl}\n`);
        
        const tests = [
            this.testHealthEndpoint(),
            this.testWebSocketConnection(),
            this.testFrontendAccess(),
            this.testAPIEndpoints(),
            this.testEnvironmentConfig()
        ];
        
        await Promise.all(tests);
        
        this.generateReport();
    }

    /**
     * 📊 Generate Validation Report
     */
    generateReport() {
        console.log('\n📊 VALIDATION REPORT:');
        console.log('==================');
        
        console.log(`\n✅ PASSED (${this.results.passed.length}):`);
        this.results.passed.forEach(item => console.log(`  - ${item}`));
        
        if (this.results.warnings.length > 0) {
            console.log(`\n⚠️ WARNINGS (${this.results.warnings.length}):`);
            this.results.warnings.forEach(item => console.log(`  - ${item}`));
        }
        
        if (this.results.failed.length > 0) {
            console.log(`\n❌ FAILED (${this.results.failed.length}):`);
            this.results.failed.forEach(item => console.log(`  - ${item}`));
        }
        
        const totalTests = this.results.passed.length + this.results.failed.length;
        const successRate = totalTests > 0 ? (this.results.passed.length / totalTests * 100).toFixed(1) : 0;
        
        console.log(`\n📈 SUCCESS RATE: ${successRate}% (${this.results.passed.length}/${totalTests})`);
        
        if (this.results.failed.length === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Deployment is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the issues above.');
        }
        
        return {
            passed: this.results.passed.length,
            failed: this.results.failed.length,
            warnings: this.results.warnings.length,
            successRate: parseFloat(successRate)
        };
    }

    /**
     * 🔍 Compare Local vs Production
     */
    static async compareEnvironments() {
        console.log('🔍 COMPARING LOCAL VS PRODUCTION ENVIRONMENTS\n');
        
        const localValidator = new RenderDeploymentValidator({ local: true });
        const prodValidator = new RenderDeploymentValidator({ local: false });
        
        console.log('Testing LOCAL environment...');
        await localValidator.runAllTests();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        console.log('Testing PRODUCTION environment...');
        await prodValidator.runAllTests();
        
        console.log('\n' + '='.repeat(50));
        console.log('🔍 ENVIRONMENT COMPARISON:');
        console.log('='.repeat(50));
        
        const localResults = localValidator.generateReport();
        const prodResults = prodValidator.generateReport();
        
        console.log('\n📊 COMPARISON SUMMARY:');
        console.log(`Local Success Rate: ${localResults.successRate}%`);
        console.log(`Production Success Rate: ${prodResults.successRate}%`);
        
        if (localResults.successRate > prodResults.successRate) {
            console.log('\n⚠️ Production has lower success rate than local!');
            console.log('This indicates environment-specific issues.');
        } else if (localResults.successRate === prodResults.successRate && prodResults.successRate === 100) {
            console.log('\n🎉 Perfect parity! Local and production are identical.');
        } else {
            console.log('\n✅ Production environment is working well.');
        }
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--compare')) {
        RenderDeploymentValidator.compareEnvironments();
    } else if (args.includes('--local')) {
        const validator = new RenderDeploymentValidator({ local: true });
        validator.runAllTests();
    } else {
        const validator = new RenderDeploymentValidator({ local: false });
        validator.runAllTests();
    }
}

module.exports = RenderDeploymentValidator;
