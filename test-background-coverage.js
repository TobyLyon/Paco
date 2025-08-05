// ===== BACKGROUND COVERAGE TEST SCRIPT =====
// Test that sky and background extend to all edges of the game screen
// Run this in your browser console while playing the game

/**
 * Background Coverage Tester
 */
class BackgroundCoverageTester {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.game = null;
    }

    // Initialize test with game canvas
    init() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('❌ Game canvas not found');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.game = window.game || window.pacoGame;
        
        console.log('🧪 Background Coverage Tester initialized');
        console.log('📱 Canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        return true;
    }

    // Test background coverage by checking pixel colors at edges
    testBackgroundCoverage() {
        if (!this.init()) return;
        
        console.log('🧪 Testing background coverage...');
        
        // Sample points around the edges and corners
        const testPoints = [
            // Corners
            { x: 0, y: 0, name: 'Top-left corner' },
            { x: this.canvas.width - 1, y: 0, name: 'Top-right corner' },
            { x: 0, y: this.canvas.height - 1, name: 'Bottom-left corner' },
            { x: this.canvas.width - 1, y: this.canvas.height - 1, name: 'Bottom-right corner' },
            
            // Edge midpoints
            { x: this.canvas.width / 2, y: 0, name: 'Top edge center' },
            { x: this.canvas.width / 2, y: this.canvas.height - 1, name: 'Bottom edge center' },
            { x: 0, y: this.canvas.height / 2, name: 'Left edge center' },
            { x: this.canvas.width - 1, y: this.canvas.height / 2, name: 'Right edge center' },
            
            // Quarter points for thorough testing
            { x: this.canvas.width / 4, y: 0, name: 'Top edge quarter' },
            { x: (this.canvas.width * 3) / 4, y: 0, name: 'Top edge three-quarter' },
            { x: this.canvas.width / 4, y: this.canvas.height - 1, name: 'Bottom edge quarter' },
            { x: (this.canvas.width * 3) / 4, y: this.canvas.height - 1, name: 'Bottom edge three-quarter' }
        ];
        
        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        let passedTests = 0;
        let failedTests = 0;
        
        testPoints.forEach(point => {
            const pixelIndex = (Math.floor(point.y) * this.canvas.width + Math.floor(point.x)) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Check if pixel has color (not transparent black)
            const hasColor = (r > 0 || g > 0 || b > 0) && a > 0;
            
            if (hasColor) {
                console.log(`✅ ${point.name}: RGB(${r},${g},${b},${a}) - Background present`);
                passedTests++;
            } else {
                console.log(`❌ ${point.name}: RGB(${r},${g},${b},${a}) - No background detected`);
                failedTests++;
            }
        });
        
        console.log(`\n📊 Background Coverage Test Results:`);
        console.log(`✅ Passed: ${passedTests}/${testPoints.length} points`);
        console.log(`❌ Failed: ${failedTests}/${testPoints.length} points`);
        
        if (failedTests === 0) {
            console.log('🎉 Perfect background coverage! Sky extends to all edges.');
        } else {
            console.log('⚠️ Background gaps detected at some edges.');
        }
        
        return {
            passed: passedTests,
            failed: failedTests,
            total: testPoints.length,
            coverage: (passedTests / testPoints.length) * 100
        };
    }

    // Test during gameplay for different camera positions
    testDuringGameplay() {
        if (!this.init() || !this.game) {
            console.log('❌ Game not running or not accessible');
            return;
        }
        
        console.log('🧪 Testing background coverage during gameplay...');
        console.log('🎮 Jump around and watch for background coverage reports');
        
        let testCount = 0;
        const maxTests = 10;
        
        const testInterval = setInterval(() => {
            testCount++;
            
            const cameraY = this.game.camera ? this.game.camera.y : 0;
            const score = this.game.score || 0;
            
            console.log(`\n🧪 Test ${testCount} - Camera Y: ${Math.floor(cameraY)}, Score: ${score}`);
            
            const result = this.testBackgroundCoverage();
            
            if (result.coverage < 100) {
                console.log(`⚠️ Coverage issue detected at camera position ${Math.floor(cameraY)}`);
            }
            
            if (testCount >= maxTests) {
                clearInterval(testInterval);
                console.log('\n🧪 Gameplay background test completed');
            }
        }, 2000); // Test every 2 seconds
        
        // Stop test after 20 seconds
        setTimeout(() => {
            clearInterval(testInterval);
            console.log('\n⏰ Background test timeout - stopped after 20 seconds');
        }, 20000);
    }

    // Test mobile vs desktop coverage
    testMobileDesktopCoverage() {
        if (!this.init()) return;
        
        console.log('🧪 Testing mobile vs desktop coverage...');
        
        const isMobile = window.innerWidth <= 768;
        const deviceType = isMobile ? 'Mobile' : 'Desktop';
        
        console.log(`📱 Device type: ${deviceType}`);
        console.log(`📏 Screen size: ${window.innerWidth}x${window.innerHeight}`);
        console.log(`🎮 Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`📐 Canvas ratio: ${(this.canvas.width / this.canvas.height).toFixed(2)}`);
        
        const result = this.testBackgroundCoverage();
        
        console.log(`\n📊 ${deviceType} Background Coverage: ${result.coverage.toFixed(1)}%`);
        
        return result;
    }

    // Visual debug overlay
    addVisualDebugOverlay() {
        if (!this.init()) return;
        
        console.log('🎨 Adding visual debug overlay...');
        
        // Create overlay canvas
        const overlay = document.createElement('canvas');
        overlay.width = this.canvas.width;
        overlay.height = this.canvas.height;
        overlay.style.position = 'absolute';
        overlay.style.top = this.canvas.offsetTop + 'px';
        overlay.style.left = this.canvas.offsetLeft + 'px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';
        overlay.id = 'background-debug-overlay';
        
        // Remove existing overlay
        const existing = document.getElementById('background-debug-overlay');
        if (existing) existing.remove();
        
        document.body.appendChild(overlay);
        
        const overlayCtx = overlay.getContext('2d');
        
        // Draw debug grid
        overlayCtx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        overlayCtx.lineWidth = 1;
        
        // Draw border
        overlayCtx.strokeRect(0, 0, overlay.width, overlay.height);
        
        // Draw corner markers
        const markerSize = 20;
        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        
        // Top-left
        overlayCtx.fillRect(0, 0, markerSize, 2);
        overlayCtx.fillRect(0, 0, 2, markerSize);
        
        // Top-right
        overlayCtx.fillRect(overlay.width - markerSize, 0, markerSize, 2);
        overlayCtx.fillRect(overlay.width - 2, 0, 2, markerSize);
        
        // Bottom-left
        overlayCtx.fillRect(0, overlay.height - 2, markerSize, 2);
        overlayCtx.fillRect(0, overlay.height - markerSize, 2, markerSize);
        
        // Bottom-right
        overlayCtx.fillRect(overlay.width - markerSize, overlay.height - 2, markerSize, 2);
        overlayCtx.fillRect(overlay.width - 2, overlay.height - markerSize, 2, markerSize);
        
        console.log('🎨 Debug overlay added - red markers show canvas edges');
        console.log('🔧 Remove with: document.getElementById("background-debug-overlay").remove()');
        
        return overlay;
    }

    // Quick comprehensive test
    quickTest() {
        console.log('🧪 Running quick background coverage test...');
        
        if (!this.init()) {
            console.log('❌ Cannot access game canvas');
            return false;
        }
        
        const result = this.testBackgroundCoverage();
        
        if (result.coverage >= 100) {
            console.log('✅ PERFECT: Background covers entire screen!');
        } else if (result.coverage >= 90) {
            console.log('⚠️ GOOD: Minor coverage issues detected');
        } else {
            console.log('❌ POOR: Significant background gaps detected');
        }
        
        return result;
    }
}

// Create global instance
window.BackgroundCoverageTester = BackgroundCoverageTester;
window.backgroundTester = new BackgroundCoverageTester();

// Export quick functions
window.testBackground = {
    quick() {
        return backgroundTester.quickTest();
    },
    
    coverage() {
        return backgroundTester.testBackgroundCoverage();
    },
    
    gameplay() {
        return backgroundTester.testDuringGameplay();
    },
    
    mobile() {
        return backgroundTester.testMobileDesktopCoverage();
    },
    
    debug() {
        return backgroundTester.addVisualDebugOverlay();
    }
};

console.log('🧪 Background coverage tester loaded!');
console.log('🧪 Run: testBackground.quick() for quick test');
console.log('🧪 Run: testBackground.coverage() for detailed coverage test');
console.log('🧪 Run: testBackground.gameplay() to test during gameplay');
console.log('🧪 Run: testBackground.debug() to add visual debug overlay');