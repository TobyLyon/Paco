// ===== CAMERA ZOOM TESTING SCRIPT =====
// Test script for adjusting camera zoom levels in real-time
// Run this in browser console to test different zoom values

/**
 * Camera Zoom Tester
 */
class CameraZoomTester {
    constructor() {
        this.game = null;
        this.originalZoom = 1.0;
        this.currentZoom = 1.3;
    }

    // Initialize and find the game instance
    init() {
        console.log('🎥 INITIALIZING CAMERA ZOOM TESTER...');
        
        this.game = window.game;
        if (!this.game) {
            console.log('❌ Game instance not found! Make sure the game is running.');
            return false;
        }
        
        if (!this.game.camera) {
            console.log('❌ Camera not found in game instance!');
            return false;
        }
        
        this.originalZoom = this.game.camera.zoom || 1.0;
        this.currentZoom = this.originalZoom;
        
        console.log('✅ Camera zoom tester initialized!');
        console.log('📊 Current zoom:', this.currentZoom);
        
        return true;
    }

    // Set zoom level
    setZoom(zoomLevel) {
        if (!this.game || !this.game.camera) {
            console.log('❌ Game or camera not available');
            return false;
        }
        
        // Clamp zoom between reasonable values
        zoomLevel = Math.max(0.5, Math.min(3.0, zoomLevel));
        
        this.game.camera.zoom = zoomLevel;
        this.currentZoom = zoomLevel;
        
        console.log(`🎥 Zoom set to: ${zoomLevel.toFixed(2)}x`);
        console.log(`📏 Effect: ${zoomLevel > 1 ? 'Closer view' : zoomLevel < 1 ? 'Farther view' : 'Normal view'}`);
        
        return true;
    }

    // Test different zoom presets
    testPresets() {
        console.log('\n🎥 TESTING ZOOM PRESETS...');
        
        const presets = [
            { name: 'Far Out', zoom: 0.8, description: 'Wide view of the action' },
            { name: 'Normal', zoom: 1.0, description: 'Original zoom level' },
            { name: 'Close', zoom: 1.2, description: 'Slightly closer' },
            { name: 'Closer', zoom: 1.3, description: 'More focused on Paco' },
            { name: 'Very Close', zoom: 1.5, description: 'Very tight on action' },
            { name: 'Too Close', zoom: 1.8, description: 'Might be too close' }
        ];
        
        console.log('🎮 Available presets:');
        presets.forEach((preset, index) => {
            console.log(`${index + 1}. ${preset.name} (${preset.zoom}x) - ${preset.description}`);
        });
        
        console.log('\n🎯 Use: cameraZoomTest.setPreset(number) to test');
        console.log('🎯 Use: cameraZoomTest.setZoom(value) for custom zoom');
        
        return presets;
    }

    // Set a preset zoom level
    setPreset(presetNumber) {
        const presets = [
            0.8, 1.0, 1.2, 1.3, 1.5, 1.8
        ];
        
        if (presetNumber < 1 || presetNumber > presets.length) {
            console.log(`❌ Invalid preset. Use 1-${presets.length}`);
            return false;
        }
        
        const zoomLevel = presets[presetNumber - 1];
        return this.setZoom(zoomLevel);
    }

    // Gradually adjust zoom for smooth testing
    animateZoom(targetZoom, duration = 2000) {
        if (!this.game || !this.game.camera) {
            console.log('❌ Game or camera not available');
            return;
        }
        
        const startZoom = this.currentZoom;
        const startTime = Date.now();
        
        console.log(`🎬 Animating zoom from ${startZoom.toFixed(2)}x to ${targetZoom.toFixed(2)}x over ${duration}ms`);
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentZoom = startZoom + (targetZoom - startZoom) * easeProgress;
            this.setZoom(currentZoom);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✅ Zoom animation complete!');
            }
        };
        
        animate();
    }

    // Reset to original zoom
    reset() {
        console.log('🔄 Resetting to original zoom...');
        return this.setZoom(this.originalZoom);
    }

    // Get current zoom info
    getZoomInfo() {
        if (!this.game || !this.game.camera) {
            console.log('❌ Game or camera not available');
            return null;
        }
        
        const info = {
            currentZoom: this.game.camera.zoom,
            originalZoom: this.originalZoom,
            effect: this.game.camera.zoom > 1 ? 'Closer' : this.game.camera.zoom < 1 ? 'Farther' : 'Normal',
            recommendation: this.getRecommendation(this.game.camera.zoom)
        };
        
        console.log('📊 Current Zoom Info:');
        console.log(`   Current: ${info.currentZoom.toFixed(2)}x`);
        console.log(`   Original: ${info.originalZoom.toFixed(2)}x`);
        console.log(`   Effect: ${info.effect}`);
        console.log(`   Recommendation: ${info.recommendation}`);
        
        return info;
    }

    // Get recommendation based on zoom level
    getRecommendation(zoom) {
        if (zoom < 0.9) return 'Too far out - players might feel disconnected';
        if (zoom < 1.1) return 'Good for seeing more of the level';
        if (zoom < 1.3) return 'Nice balance of closeness and context';
        if (zoom < 1.6) return 'Close focus on action - good for mobile';
        return 'Very close - might feel claustrophobic';
    }

    // Test zoom impact on gameplay
    testGameplayImpact() {
        console.log('\n🎮 TESTING GAMEPLAY IMPACT...');
        
        if (!this.game || !this.game.player) {
            console.log('❌ Game or player not available');
            return;
        }
        
        const playerPos = {
            x: this.game.player.x,
            y: this.game.player.y
        };
        
        const cameraPos = this.game.camera.y;
        const zoom = this.game.camera.zoom;
        
        console.log('📊 Current State:');
        console.log(`   Player: (${playerPos.x.toFixed(0)}, ${playerPos.y.toFixed(0)})`);
        console.log(`   Camera Y: ${cameraPos.toFixed(0)}`);
        console.log(`   Zoom: ${zoom.toFixed(2)}x`);
        
        // Calculate effective viewport
        const effectiveViewHeight = this.game.canvas.height / zoom;
        const effectiveViewWidth = this.game.canvas.width / zoom;
        
        console.log('📏 Effective Viewport:');
        console.log(`   Width: ${effectiveViewWidth.toFixed(0)}px (${zoom > 1 ? 'narrower' : 'wider'} than normal)`);
        console.log(`   Height: ${effectiveViewHeight.toFixed(0)}px (${zoom > 1 ? 'shorter' : 'taller'} than normal)`);
        
        // Gameplay recommendations
        console.log('\n💡 Gameplay Considerations:');
        if (zoom > 1.4) {
            console.log('   ⚠️ High zoom might make platforming harder (less preview)');
        }
        if (zoom < 0.9) {
            console.log('   ⚠️ Low zoom might make Paco too small to see clearly');
        }
        if (zoom >= 1.2 && zoom <= 1.4) {
            console.log('   ✅ Good zoom range for focused gameplay');
        }
    }

    // Comprehensive test
    fullTest() {
        console.log('🎥 FULL CAMERA ZOOM TEST');
        console.log('=' .repeat(50));
        
        if (!this.init()) {
            return;
        }
        
        this.getZoomInfo();
        this.testGameplayImpact();
        this.testPresets();
        
        console.log('\n🛠️ AVAILABLE COMMANDS:');
        console.log('cameraZoomTest.setZoom(1.3) - Set custom zoom');
        console.log('cameraZoomTest.setPreset(4) - Use preset zoom');
        console.log('cameraZoomTest.animateZoom(1.5) - Smooth zoom transition');
        console.log('cameraZoomTest.reset() - Reset to original');
        console.log('cameraZoomTest.getZoomInfo() - Get current info');
        
        console.log('\n🎯 RECOMMENDED ZOOM LEVELS:');
        console.log('Desktop: 1.2x - 1.3x (good balance)');
        console.log('Mobile: 1.3x - 1.5x (closer for touch)');
        console.log('Competitive: 1.0x - 1.2x (more preview)');
    }
}

// Create global instance
window.CameraZoomTester = CameraZoomTester;
window.cameraZoomTest = new CameraZoomTester();

// Convenient shorthand functions
window.setZoom = (zoom) => cameraZoomTest.setZoom(zoom);
window.testZoom = (preset) => cameraZoomTest.setPreset(preset);

console.log('🎥 Camera zoom tester loaded!');
console.log('🧪 Run: cameraZoomTest.fullTest()');
console.log('🎯 Quick test: setZoom(1.3) or testZoom(4)');

// Auto-run if game is already loaded
if (typeof window.game !== 'undefined' && window.game.camera) {
    console.log('🎮 Game detected - running auto-test...');
    setTimeout(() => {
        cameraZoomTest.fullTest();
    }, 1000);
} else {
    console.log('⏳ Load the game first, then run: cameraZoomTest.fullTest()');
}