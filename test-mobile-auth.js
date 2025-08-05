// ===== MOBILE AUTHENTICATION TEST SCRIPT =====
// Test mobile authentication popup closing behavior
// Run this in your browser console

/**
 * Mobile Authentication Tester
 */
class MobileAuthTester {
    constructor() {
        this.results = [];
    }

    // Test mobile device detection
    testMobileDetection() {
        console.log('🧪 Testing mobile device detection...');
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const shouldUseMobileFlow = isMobile || (isSmallScreen && isTouchDevice);
        
        const detection = {
            userAgent: navigator.userAgent,
            isMobile,
            isSmallScreen,
            isTouchDevice,
            shouldUseMobileFlow,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            maxTouchPoints: navigator.maxTouchPoints
        };
        
        console.log('📱 MOBILE DETECTION RESULTS:', detection);
        
        if (shouldUseMobileFlow) {
            console.log('✅ Mobile flow will be used');
        } else {
            console.log('🖥️ Desktop popup flow will be used');
        }
        
        return detection;
    }

    // Test authentication callback data handling
    testCallbackDataHandling() {
        console.log('\n🧪 Testing callback data handling...');
        
        // Simulate mobile auth callback data
        const testData = {
            code: 'test_auth_code_12345',
            state: 'test_state_67890',
            timestamp: Date.now().toString()
        };
        
        // Store test data
        localStorage.setItem('twitter_auth_code', testData.code);
        localStorage.setItem('twitter_auth_state_mobile', testData.state);
        localStorage.setItem('twitter_auth_timestamp', testData.timestamp);
        
        console.log('📱 Stored test auth data:', testData);
        
        // Check if TwitterAuth would detect it
        if (window.TwitterAuth && typeof window.TwitterAuth.checkMobileAuthCallback === 'function') {
            console.log('✅ TwitterAuth.checkMobileAuthCallback method exists');
            
            // Note: Don't actually call it as it would process the fake data
            console.log('⚠️ Not calling actual method to avoid processing test data');
        } else {
            console.log('❌ TwitterAuth.checkMobileAuthCallback method not found');
        }
        
        // Clean up test data
        localStorage.removeItem('twitter_auth_code');
        localStorage.removeItem('twitter_auth_state_mobile');
        localStorage.removeItem('twitter_auth_timestamp');
        
        console.log('🧹 Cleaned up test data');
        
        return testData;
    }

    // Test popup closing mechanisms
    testPopupClosing() {
        console.log('\n🧪 Testing popup closing mechanisms...');
        
        const tests = [
            {
                name: 'window.close() availability',
                test: () => typeof window.close === 'function',
                expected: true
            },
            {
                name: 'postMessage availability',
                test: () => typeof window.postMessage === 'function',
                expected: true
            },
            {
                name: 'opener detection',
                test: () => window.opener !== undefined,
                expected: true
            },
            {
                name: 'location.href redirect',
                test: () => typeof window.location.href === 'string',
                expected: true
            }
        ];
        
        const results = tests.map(test => ({
            name: test.name,
            result: test.test(),
            passed: test.test() === test.expected
        }));
        
        results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.result}`);
        });
        
        return results;
    }

    // Test localStorage functionality
    testLocalStorage() {
        console.log('\n🧪 Testing localStorage functionality...');
        
        try {
            const testKey = 'mobile_auth_test';
            const testValue = 'test_data_' + Date.now();
            
            // Test write
            localStorage.setItem(testKey, testValue);
            console.log('✅ localStorage write: OK');
            
            // Test read
            const readValue = localStorage.getItem(testKey);
            const readOK = readValue === testValue;
            console.log(`${readOK ? '✅' : '❌'} localStorage read: ${readOK ? 'OK' : 'FAILED'}`);
            
            // Test remove
            localStorage.removeItem(testKey);
            const removedValue = localStorage.getItem(testKey);
            const removeOK = removedValue === null;
            console.log(`${removeOK ? '✅' : '❌'} localStorage remove: ${removeOK ? 'OK' : 'FAILED'}`);
            
            return { write: true, read: readOK, remove: removeOK };
            
        } catch (error) {
            console.log('❌ localStorage error:', error.message);
            return { write: false, read: false, remove: false, error: error.message };
        }
    }

    // Test Twitter authentication availability
    testTwitterAuthAvailability() {
        console.log('\n🧪 Testing Twitter authentication availability...');
        
        const checks = [
            {
                name: 'TwitterAuth global object',
                test: () => typeof window.TwitterAuth !== 'undefined',
                fix: 'Include twitter-auth.js script'
            },
            {
                name: 'TwitterAuth.authenticate method',
                test: () => window.TwitterAuth && typeof window.TwitterAuth.authenticate === 'function',
                fix: 'Check twitter-auth.js is loaded properly'
            },
            {
                name: 'TwitterAuth.checkMobileAuthCallback method',
                test: () => window.TwitterAuth && typeof window.TwitterAuth.checkMobileAuthCallback === 'function',
                fix: 'Update twitter-auth.js with mobile callback handling'
            }
        ];
        
        checks.forEach(check => {
            const result = check.test();
            const status = result ? '✅' : '❌';
            console.log(`${status} ${check.name}: ${result ? 'Available' : 'Missing'}`);
            if (!result) {
                console.log(`   💡 Fix: ${check.fix}`);
            }
        });
        
        return checks.map(check => ({ name: check.name, available: check.test() }));
    }

    // Test popup blocker
    testPopupBlocker() {
        console.log('\n🧪 Testing popup blocker...');
        
        try {
            const testPopup = window.open('', 'test_popup', 'width=1,height=1');
            
            if (testPopup) {
                console.log('✅ Popups allowed');
                testPopup.close();
                return { blocked: false };
            } else {
                console.log('❌ Popups blocked');
                return { blocked: true };
            }
        } catch (error) {
            console.log('❌ Popup error:', error.message);
            return { blocked: true, error: error.message };
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 ===== MOBILE AUTHENTICATION TEST SUITE =====');
        console.log('🧪 Testing mobile authentication functionality\n');
        
        const results = {
            mobileDetection: this.testMobileDetection(),
            callbackDataHandling: this.testCallbackDataHandling(),
            popupClosing: this.testPopupClosing(),
            localStorage: this.testLocalStorage(),
            twitterAuthAvailability: this.testTwitterAuthAvailability(),
            popupBlocker: this.testPopupBlocker()
        };
        
        this.printSummary(results);
        return results;
    }

    // Print test summary
    printSummary(results) {
        console.log('\n🧪 ===== MOBILE AUTH TEST SUMMARY =====');
        
        const mobileFlow = results.mobileDetection.shouldUseMobileFlow;
        console.log(`📱 Device Type: ${mobileFlow ? 'Mobile/Touch Device' : 'Desktop'}`);
        console.log(`🔄 Auth Flow: ${mobileFlow ? 'Same-window redirect' : 'Popup window'}`);
        
        const issues = [];
        
        // Check for issues
        if (results.popupBlocker.blocked) {
            issues.push('Popups are blocked');
        }
        
        if (!results.localStorage.write || !results.localStorage.read) {
            issues.push('localStorage not working');
        }
        
        const twitterAuthMissing = results.twitterAuthAvailability.some(check => !check.available);
        if (twitterAuthMissing) {
            issues.push('TwitterAuth components missing');
        }
        
        if (issues.length === 0) {
            console.log('✅ All systems ready for mobile authentication!');
            console.log('📱 Mobile devices will use same-window redirect');
            console.log('🖥️ Desktop devices will use popup windows');
        } else {
            console.log('⚠️ Issues found:');
            issues.forEach(issue => console.log(`   ❌ ${issue}`));
        }
        
        console.log('\n🔧 Test authentication by clicking "Connect with Twitter"');
    }

    // Quick test
    quickTest() {
        console.log('🧪 Running quick mobile auth test...');
        
        const detection = this.testMobileDetection();
        const storage = this.testLocalStorage();
        const popup = this.testPopupBlocker();
        
        const ready = storage.write && storage.read && !popup.blocked;
        
        console.log(`\n${ready ? '✅' : '⚠️'} Mobile Auth Status: ${ready ? 'READY' : 'ISSUES DETECTED'}`);
        
        if (detection.shouldUseMobileFlow) {
            console.log('📱 This device will use mobile authentication flow');
        } else {
            console.log('🖥️ This device will use desktop popup flow');
        }
        
        return { ready, detection, storage, popup };
    }
}

// Create global instance
window.MobileAuthTester = MobileAuthTester;
window.mobileAuthTester = new MobileAuthTester();

// Export quick functions
window.testMobileAuth = {
    async full() {
        return await mobileAuthTester.runAllTests();
    },
    
    quick() {
        return mobileAuthTester.quickTest();
    },
    
    detection() {
        return mobileAuthTester.testMobileDetection();
    },
    
    localStorage() {
        return mobileAuthTester.testLocalStorage();
    }
};

console.log('🧪 Mobile authentication tester loaded!');
console.log('🧪 Run: testMobileAuth.quick() for quick test');
console.log('🧪 Run: testMobileAuth.full() for complete test suite');
console.log('🧪 Run: testMobileAuth.detection() to check mobile detection');