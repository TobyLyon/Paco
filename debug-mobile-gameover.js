// ===== MOBILE GAME OVER SCREEN DEBUG SCRIPT =====
// Debug script for mobile game over screen not showing properly
// Run this in browser console to test overlay display

/**
 * Mobile Game Over Screen Debugger
 */
class MobileGameOverDebugger {
    constructor() {
        this.overlayElement = null;
        this.contentElement = null;
        this.canvasContainer = null;
        this.canvas = null;
    }

    // Initialize and find DOM elements
    init() {
        console.log('🔍 INITIALIZING MOBILE GAME OVER DEBUGGER...');
        
        this.overlayElement = document.getElementById('gameOverlay');
        this.contentElement = document.getElementById('overlayContent');
        this.canvasContainer = document.querySelector('.game-canvas-container');
        this.canvas = document.getElementById('gameCanvas');
        
        console.log('📍 DOM Elements Found:', {
            overlay: !!this.overlayElement,
            content: !!this.contentElement,
            canvasContainer: !!this.canvasContainer,
            canvas: !!this.canvas
        });
        
        return this;
    }

    // Check overlay visibility and positioning
    checkOverlayStatus() {
        console.log('\n🔍 CHECKING OVERLAY STATUS...');
        
        if (!this.overlayElement) {
            console.log('❌ Game overlay element not found!');
            return false;
        }
        
        const styles = window.getComputedStyle(this.overlayElement);
        const rect = this.overlayElement.getBoundingClientRect();
        
        console.log('📊 Overlay Element Status:', {
            exists: !!this.overlayElement,
            hasShowClass: this.overlayElement.classList.contains('show'),
            opacity: styles.opacity,
            visibility: styles.visibility,
            display: styles.display,
            position: styles.position,
            zIndex: styles.zIndex,
            dimensions: {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left
            }
        });
        
        console.log('📱 Container Status:', {
            containerExists: !!this.canvasContainer,
            containerPosition: this.canvasContainer ? window.getComputedStyle(this.canvasContainer).position : 'N/A',
            containerDimensions: this.canvasContainer ? this.canvasContainer.getBoundingClientRect() : 'N/A'
        });
        
        return this.overlayElement.classList.contains('show');
    }

    // Test showing the overlay manually
    testShowOverlay() {
        console.log('\n🧪 TESTING MANUAL OVERLAY DISPLAY...');
        
        if (!this.overlayElement || !this.contentElement) {
            console.log('❌ Overlay elements not found');
            return false;
        }
        
        // Create test content
        const testContent = `
            <div style="
                max-width: min(480px, 90vw); 
                width: 100%;
                margin: 0 auto; 
                text-align: center;
                font-family: Arial, sans-serif;
                background: linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 20, 0.9));
                border-radius: 20px;
                padding: min(20px, 4vw);
                border: 2px solid rgba(220, 38, 38, 0.4);
                position: relative;
                box-sizing: border-box;
                max-height: 70vh;
                overflow-y: auto;
                color: white;
            ">
                <button onclick="mobileGameOverDebug.hideTestOverlay()" style="
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    font-size: 16px;
                ">✕</button>
                
                <h2 style="color: #ef4444; margin: 0 0 20px 0;">🧪 TEST OVERLAY</h2>
                <p style="margin: 10px 0;">This is a test game over screen!</p>
                <p style="color: #fbbf24; font-size: 1.5rem; margin: 10px 0;">Score: 12,345</p>
                
                <div style="margin: 20px 0;">
                    <button onclick="mobileGameOverDebug.hideTestOverlay()" style="
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin: 5px;
                    ">Close Test</button>
                    
                    <button onclick="mobileGameOverDebug.fullDiagnostic()" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin: 5px;
                    ">Run Diagnostic</button>
                </div>
                
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 15px;">
                    Mobile Game Over Screen Test
                </div>
            </div>
        `;
        
        this.contentElement.innerHTML = testContent;
        this.overlayElement.classList.add('show');
        
        console.log('✅ Test overlay displayed');
        
        // Check if it's actually visible
        setTimeout(() => {
            const isVisible = this.checkOverlayStatus();
            console.log(isVisible ? '✅ Test overlay is visible!' : '❌ Test overlay not visible - check CSS');
        }, 100);
        
        return true;
    }

    // Hide test overlay
    hideTestOverlay() {
        console.log('🚪 Hiding test overlay...');
        if (this.overlayElement) {
            this.overlayElement.classList.remove('show');
            console.log('✅ Test overlay hidden');
        }
    }

    // Check mobile viewport and CSS
    checkMobileEnvironment() {
        console.log('\n📱 CHECKING MOBILE ENVIRONMENT...');
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        console.log('📊 Device Detection:', {
            userAgent: navigator.userAgent.substring(0, 80) + '...',
            isMobile,
            isSmallScreen,
            isTouchDevice,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            devicePixelRatio: window.devicePixelRatio,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        });
        
        console.log('🎨 CSS Environment:', {
            mobileCSSLoaded: !!document.querySelector('link[href*="mobile-fix.css"]'),
            hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
            documentScrollTop: document.documentElement.scrollTop,
            bodyScrollTop: document.body.scrollTop
        });
        
        return { isMobile, isSmallScreen, isTouchDevice };
    }

    // Check for CSS conflicts
    checkCSSConflicts() {
        console.log('\n🎨 CHECKING CSS CONFLICTS...');
        
        if (!this.overlayElement) {
            console.log('❌ No overlay element to check');
            return;
        }
        
        const overlayStyles = window.getComputedStyle(this.overlayElement);
        const contentStyles = this.contentElement ? window.getComputedStyle(this.contentElement) : null;
        
        console.log('🔍 Overlay CSS:', {
            position: overlayStyles.position,
            top: overlayStyles.top,
            left: overlayStyles.left,
            right: overlayStyles.right,
            bottom: overlayStyles.bottom,
            width: overlayStyles.width,
            height: overlayStyles.height,
            zIndex: overlayStyles.zIndex,
            display: overlayStyles.display,
            opacity: overlayStyles.opacity,
            visibility: overlayStyles.visibility,
            transform: overlayStyles.transform,
            overflow: overlayStyles.overflow
        });
        
        if (contentStyles) {
            console.log('🔍 Content CSS:', {
                maxWidth: contentStyles.maxWidth,
                maxHeight: contentStyles.maxHeight,
                padding: contentStyles.padding,
                margin: contentStyles.margin,
                boxSizing: contentStyles.boxSizing,
                overflow: contentStyles.overflow,
                transform: contentStyles.transform
            });
        }
        
        // Check container positioning
        if (this.canvasContainer) {
            const containerStyles = window.getComputedStyle(this.canvasContainer);
            console.log('🔍 Container CSS:', {
                position: containerStyles.position,
                width: containerStyles.width,
                height: containerStyles.height,
                overflow: containerStyles.overflow,
                zIndex: containerStyles.zIndex
            });
        }
    }

    // Force show actual game over screen
    forceGameOver() {
        console.log('\n🎮 FORCING GAME OVER SCREEN...');
        
        // Check if game object exists
        if (typeof window.game !== 'undefined' && window.game.showGameOverScreen) {
            console.log('🎮 Game object found, triggering game over...');
            try {
                window.game.showGameOverScreen();
                console.log('✅ Game over screen triggered');
                
                setTimeout(() => {
                    this.checkOverlayStatus();
                }, 500);
            } catch (error) {
                console.log('❌ Error triggering game over:', error.message);
            }
        } else {
            console.log('❌ Game object not found or showGameOverScreen method missing');
            console.log('💡 Try running this after the game has loaded');
        }
    }

    // Get CSS rule info
    getCSSRules() {
        console.log('\n📋 RELEVANT CSS RULES...');
        
        const styleSheets = Array.from(document.styleSheets);
        const relevantRules = [];
        
        styleSheets.forEach((sheet, sheetIndex) => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                rules.forEach(rule => {
                    if (rule.selectorText && (
                        rule.selectorText.includes('.game-overlay') ||
                        rule.selectorText.includes('.overlay-content') ||
                        rule.selectorText.includes('.game-canvas-container')
                    )) {
                        relevantRules.push({
                            sheet: sheetIndex,
                            selector: rule.selectorText,
                            styles: rule.style.cssText
                        });
                    }
                });
            } catch (e) {
                console.log(`⚠️ Could not read stylesheet ${sheetIndex}:`, e.message);
            }
        });
        
        console.log('📋 Found Rules:', relevantRules);
        return relevantRules;
    }

    // Full diagnostic
    fullDiagnostic() {
        console.log('🔬 FULL MOBILE GAME OVER DIAGNOSTIC');
        console.log('=' .repeat(50));
        
        this.init();
        this.checkMobileEnvironment();
        this.checkOverlayStatus();
        this.checkCSSConflicts();
        this.getCSSRules();
        
        console.log('\n🛠️ AVAILABLE COMMANDS:');
        console.log('mobileGameOverDebug.testShowOverlay() - Show test overlay');
        console.log('mobileGameOverDebug.forceGameOver() - Trigger actual game over');
        console.log('mobileGameOverDebug.hideTestOverlay() - Hide test overlay');
        console.log('mobileGameOverDebug.checkOverlayStatus() - Check overlay status');
        
        console.log('\n💡 QUICK FIXES:');
        console.log('If overlay not showing:');
        console.log('1. Check mobile CSS is loaded');
        console.log('2. Verify container positioning');
        console.log('3. Test with: mobileGameOverDebug.testShowOverlay()');
        console.log('4. Force game over with: mobileGameOverDebug.forceGameOver()');
    }

    // Quick fix attempts
    quickFix() {
        console.log('\n🚀 ATTEMPTING QUICK FIXES...');
        
        if (!this.overlayElement) {
            console.log('❌ No overlay element found');
            return;
        }
        
        // Fix 1: Ensure proper positioning
        this.overlayElement.style.position = 'absolute';
        this.overlayElement.style.top = '0';
        this.overlayElement.style.left = '0';
        this.overlayElement.style.right = '0';
        this.overlayElement.style.bottom = '0';
        this.overlayElement.style.zIndex = '1000';
        
        // Fix 2: Ensure container has relative positioning
        if (this.canvasContainer) {
            this.canvasContainer.style.position = 'relative';
        }
        
        // Fix 3: Ensure content sizing
        if (this.contentElement) {
            this.contentElement.style.maxWidth = '90vw';
            this.contentElement.style.maxHeight = '80vh';
            this.contentElement.style.boxSizing = 'border-box';
        }
        
        console.log('✅ Quick fixes applied');
        console.log('🧪 Test with: mobileGameOverDebug.testShowOverlay()');
    }
}

// Create global instance
window.MobileGameOverDebugger = MobileGameOverDebugger;
window.mobileGameOverDebug = new MobileGameOverDebugger();

// Auto-initialize
mobileGameOverDebug.init();

console.log('🛠️ Mobile Game Over debugger loaded!');
console.log('🧪 Run: mobileGameOverDebug.fullDiagnostic()');
console.log('🧪 Test: mobileGameOverDebug.testShowOverlay()');
console.log('🎮 Force: mobileGameOverDebug.forceGameOver()');
console.log('🚀 Quick fix: mobileGameOverDebug.quickFix()');

// Auto-run diagnostic on mobile devices
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    console.log('📱 Mobile device detected - running auto-diagnostic...');
    setTimeout(() => {
        mobileGameOverDebug.fullDiagnostic();
    }, 1000);
}