// ===== PACO JUMP - TROPHY GRAPHIC GENERATOR =====

/**
 * Generate sharable trophy graphics for high scores
 * Creates social media-ready images with player stats
 */

class TrophyGenerator {
    constructor() {
        this.trophyImage = null;
        this.canvas = null;
        this.ctx = null;
        this.isLoaded = false;
        
        this.loadTrophyImage();
        console.log('🏆 Trophy generator initialized');
    }

    // Load the trophy background image
    async loadTrophyImage() {
        try {
            this.trophyImage = new Image();
            this.trophyImage.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                this.trophyImage.onload = () => {
                    this.isLoaded = true;
                    console.log('✅ Trophy image loaded');
                    resolve();
                };
                
                this.trophyImage.onerror = (error) => {
                    console.error('❌ Failed to load trophy image:', error);
                    reject(error);
                };
                
                this.trophyImage.src = 'public/PACO-TROPHY-WINNER.png';
            });
            
        } catch (error) {
            console.error('Trophy image loading failed:', error);
        }
    }

    // Generate trophy graphic with player stats
    async generateTrophyGraphic(playerData) {
        if (!this.isLoaded) {
            console.warn('Trophy image not loaded yet');
            return null;
        }

        const {
            score,
            username,
            rank = null,
            gameMode = 'Daily Contest',
            date = new Date().toLocaleDateString()
        } = playerData;

        // Create canvas sized for social media (1200x630 for Twitter/Facebook)
        const socialWidth = 1200;
        const socialHeight = 630;
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = socialWidth;
        this.canvas.height = socialHeight;
        this.ctx = this.canvas.getContext('2d');

        // Enable high quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, socialWidth, socialHeight);
        gradient.addColorStop(0, '#dc2626'); // restaurant red
        gradient.addColorStop(0.5, '#f97316'); // restaurant orange  
        gradient.addColorStop(1, '#fbbf24'); // restaurant yellow
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, socialWidth, socialHeight);

        // Add subtle pattern overlay
        this.addPatternOverlay();

        // Calculate trophy image dimensions (centered, taking up about 40% of width)
        const trophySize = Math.min(socialWidth * 0.4, socialHeight * 0.6);
        const trophyX = (socialWidth - trophySize) / 2;
        const trophyY = socialHeight * 0.15;

        // Draw trophy image
        this.ctx.drawImage(
            this.trophyImage,
            trophyX,
            trophyY,
            trophySize,
            trophySize
        );

        // Add game title at top
        this.drawGameTitle();

        // Add score display
        this.drawScoreDisplay(score, rank);

        // Add player info
        this.drawPlayerInfo(username, gameMode, date);

        // Add call to action
        this.drawCallToAction();

        // Add decorative elements
        this.addDecorativeElements();

        return this.canvas;
    }

    // Add subtle background pattern
    addPatternOverlay() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#ffffff';
        
        // Draw chicken silhouettes pattern
        for (let x = 0; x < this.canvas.width; x += 100) {
            for (let y = 0; y < this.canvas.height; y += 100) {
                this.drawChickenSilhouette(x, y, 20);
            }
        }
        
        this.ctx.restore();
    }

    // Draw simple chicken silhouette
    drawChickenSilhouette(x, y, size) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Simple chicken shape
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size * 0.6, size * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Head
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.3, -size * 0.5, size * 0.4, size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    // Draw game title
    drawGameTitle() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Main title with shadow
        this.ctx.font = 'bold 48px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillText('PACO JUMP', this.canvas.width / 2 + 3, 63);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('PACO JUMP', this.canvas.width / 2, 60);
        
        // Subtitle
        this.ctx.font = 'bold 24px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText('🐔 CHAMPION ACHIEVED! 🐔', this.canvas.width / 2, 100);
        
        this.ctx.restore();
    }

    // Draw score display with rank
    drawScoreDisplay(score, rank) {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const scoreY = this.canvas.height * 0.75;
        
        // Score background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(this.canvas.width * 0.2, scoreY - 40, this.canvas.width * 0.6, 80);
        
        // Score border
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.canvas.width * 0.2, scoreY - 40, this.canvas.width * 0.6, 80);
        
        // Score text with shadow
        this.ctx.font = 'bold 42px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillText(score.toLocaleString(), this.canvas.width / 2 + 2, scoreY + 2);
        
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillText(score.toLocaleString(), this.canvas.width / 2, scoreY);
        
        // Rank display if provided
        if (rank) {
            this.ctx.font = 'bold 24px "Fredoka", sans-serif';
            this.ctx.fillStyle = '#ffffff';
            const rankText = rank === 1 ? '🥇 #1 CHAMPION' : 
                           rank === 2 ? '🥈 #2 RUNNER-UP' : 
                           rank === 3 ? '🥉 #3 BRONZE' : 
                           `🏅 RANK #${rank}`;
            this.ctx.fillText(rankText, this.canvas.width / 2, scoreY + 35);
        }
        
        this.ctx.restore();
    }

    // Draw player information
    drawPlayerInfo(username, gameMode, date) {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const infoY = this.canvas.height * 0.88;
        
        // Player info background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(50, infoY - 25, this.canvas.width - 100, 50);
        
        // Username
        this.ctx.font = 'bold 28px "Fredoka", sans-serif';
        this.ctx.fillStyle = '#ffffff';
        const displayText = username ? `@${username}` : 'Anonymous Champion';
        this.ctx.fillText(displayText, this.canvas.width / 2, infoY - 5);
        
        // Game mode and date
        this.ctx.font = '20px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(`${gameMode} • ${date}`, this.canvas.width / 2, infoY + 18);
        
        this.ctx.restore();
    }

    // Draw call to action
    drawCallToAction() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const ctaY = this.canvas.height - 30;
        
        this.ctx.font = 'bold 20px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillText('🎮 Play PACO JUMP and beat this score! 🎮', this.canvas.width / 2, ctaY);
        
        this.ctx.restore();
    }

    // Add decorative star elements
    addDecorativeElements() {
        this.ctx.save();
        
        // Draw stars around the trophy area
        const stars = [
            { x: 150, y: 200, size: 8 },
            { x: this.canvas.width - 150, y: 200, size: 8 },
            { x: 100, y: 350, size: 6 },
            { x: this.canvas.width - 100, y: 350, size: 6 },
            { x: 200, y: 450, size: 10 },
            { x: this.canvas.width - 200, y: 450, size: 10 }
        ];
        
        stars.forEach(star => {
            this.drawStar(star.x, star.y, star.size);
        });
        
        this.ctx.restore();
    }

    // Draw decorative star
    drawStar(x, y, size) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? size : size * 0.5;
            const pointX = Math.cos(angle) * radius;
            const pointY = Math.sin(angle) * radius;
            
            if (i === 0) this.ctx.moveTo(pointX, pointY);
            else this.ctx.lineTo(pointX, pointY);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    // Download the generated image
    downloadTrophyImage(canvas, filename = 'paco-trophy-winner.png') {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('🏆 Trophy image downloaded:', filename);
            return true;
        } catch (error) {
            console.error('Failed to download trophy image:', error);
            return false;
        }
    }

    // Copy to clipboard (modern browsers)
    async copyTrophyToClipboard(canvas) {
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                console.log('🏆 Trophy image copied to clipboard');
                return true;
            } else {
                console.warn('Clipboard API not supported');
                return false;
            }
        } catch (error) {
            console.error('Failed to copy trophy to clipboard:', error);
            return false;
        }
    }

    // Generate and share trophy (main public method)
    async generateAndShare(playerData, options = {}) {
        const {
            download = true,
            copyToClipboard = false,
            filename = null
        } = options;

        try {
            const canvas = await this.generateTrophyGraphic(playerData);
            if (!canvas) return false;

            const results = {};

            if (download) {
                const downloadFilename = filename || 
                    `paco-champion-${playerData.username || 'anonymous'}-${playerData.score}.png`;
                results.downloaded = this.downloadTrophyImage(canvas, downloadFilename);
            }

            if (copyToClipboard) {
                results.copied = await this.copyTrophyToClipboard(canvas);
            }

            return { success: true, canvas, ...results };
            
        } catch (error) {
            console.error('Trophy generation failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const trophyGenerator = new TrophyGenerator();

// Global helper function for easy access
function generateTrophyGraphic(score, username, rank = null) {
    const playerData = {
        score,
        username,
        rank,
        gameMode: 'Daily Contest',
        date: new Date().toLocaleDateString()
    };
    
    return trophyGenerator.generateAndShare(playerData, {
        download: true,
        copyToClipboard: true
    });
}

console.log('🏆 Trophy generator module loaded');