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
                    console.warn('⚠️ Trophy image failed to load, will use fallback:', error);
                    this.isLoaded = false;
                    resolve(); // Don't reject, just use fallback
                };
                
                this.trophyImage.src = 'PACO-TROPHY-WINNER.png';
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

        // Calculate trophy image dimensions (better proportioned and positioned)
        const trophySize = Math.min(socialWidth * 0.35, socialHeight * 0.45);
        const trophyX = (socialWidth - trophySize) / 2;
        const trophyY = socialHeight * 0.22;

        // Draw trophy image or fallback
        if (this.isLoaded && this.trophyImage) {
            this.ctx.drawImage(
                this.trophyImage,
                trophyX,
                trophyY,
                trophySize,
                trophySize
            );
        } else {
            // Fallback: Draw a custom trophy shape
            this.drawFallbackTrophy(trophyX, trophyY, trophySize);
        }

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
        
        // Main title with enhanced shadow
        this.ctx.font = 'bold 52px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillText('PACO JUMP', this.canvas.width / 2 + 3, 48);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('PACO JUMP', this.canvas.width / 2, 45);
        
        // Subtitle with better spacing
        this.ctx.font = 'bold 22px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillText('🐔 CHAMPION ACHIEVEMENT 🐔', this.canvas.width / 2, 80);
        
        this.ctx.restore();
    }

    // Draw score display with rank
    drawScoreDisplay(score, rank) {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const scoreY = this.canvas.height * 0.72;
        
        // Score background with better proportions
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width * 0.15, scoreY - 45, this.canvas.width * 0.7, 90);
        
        // Score border with rounded corners effect
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.canvas.width * 0.15, scoreY - 45, this.canvas.width * 0.7, 90);
        
        // Score text with enhanced shadow
        this.ctx.font = 'bold 48px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillText(score.toLocaleString(), this.canvas.width / 2 + 3, scoreY + 3);
        
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillText(score.toLocaleString(), this.canvas.width / 2, scoreY);
        
        // Rank display if provided with better spacing
        if (rank) {
            this.ctx.font = 'bold 22px "Fredoka", sans-serif';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            const rankText = rank === 1 ? '🥇 #1 CHAMPION' : 
                           rank === 2 ? '🥈 #2 RUNNER-UP' : 
                           rank === 3 ? '🥉 #3 BRONZE' : 
                           `🏅 RANK #${rank}`;
            this.ctx.fillText(rankText, this.canvas.width / 2, scoreY + 40);
        }
        
        this.ctx.restore();
    }

    // Draw player information
    drawPlayerInfo(username, gameMode, date) {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const infoY = this.canvas.height * 0.86;
        
        // Player info background with better spacing
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(40, infoY - 30, this.canvas.width - 80, 60);
        
        // Username with better sizing
        this.ctx.font = 'bold 26px "Fredoka", sans-serif';
        this.ctx.fillStyle = '#ffffff';
        const displayText = username ? `@${username}` : 'Anonymous Champion';
        this.ctx.fillText(displayText, this.canvas.width / 2, infoY - 8);
        
        // Game mode and date with improved spacing
        this.ctx.font = '18px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.fillText(`${gameMode} • ${date}`, this.canvas.width / 2, infoY + 16);
        
        this.ctx.restore();
    }

    // Draw call to action with website URL
    drawCallToAction() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        const ctaY = this.canvas.height - 45;
        
        // Main call to action with better spacing
        this.ctx.font = 'bold 19px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillText('🎮 Play PACO JUMP and beat this score! 🎮', this.canvas.width / 2, ctaY);
        
        // Website URL below with proper spacing
        this.ctx.font = 'bold 16px "Fredoka", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText('🌐 PacoTheChicken.xyz', this.canvas.width / 2, ctaY + 25);
        
        this.ctx.restore();
    }

    // Add decorative star elements with better positioning
    addDecorativeElements() {
        this.ctx.save();
        
        // Draw stars around the trophy area with updated positions
        const stars = [
            { x: 120, y: 120, size: 8 },
            { x: this.canvas.width - 120, y: 120, size: 8 },
            { x: 80, y: 280, size: 6 },
            { x: this.canvas.width - 80, y: 280, size: 6 },
            { x: 160, y: 420, size: 10 },
            { x: this.canvas.width - 160, y: 420, size: 10 },
            { x: 220, y: 180, size: 5 },
            { x: this.canvas.width - 220, y: 180, size: 5 }
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

    // Generate and show preview (new primary method)
    async generateAndPreview(playerData) {
        try {
            const canvas = await this.generateTrophyGraphic(playerData);
            if (!canvas) return { success: false, error: 'Failed to generate trophy' };

            // Show the preview modal
            this.showTrophyPreview(canvas, playerData);
            return { success: true, canvas };
            
        } catch (error) {
            console.error('Trophy generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate and share trophy (now used by preview actions)
    async generateAndShare(playerData, options = {}) {
        const {
            download = false, // Changed default to false since preview handles this
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

    // Draw fallback trophy when image fails to load
    drawFallbackTrophy(x, y, size) {
        const ctx = this.ctx;
        
        // Save context
        ctx.save();
        
        // Draw trophy cup
        const cupWidth = size * 0.6;
        const cupHeight = size * 0.4;
        const cupX = x + (size - cupWidth) / 2;
        const cupY = y + size * 0.1;
        
        // Trophy cup body (golden gradient)
        const cupGradient = ctx.createLinearGradient(cupX, cupY, cupX, cupY + cupHeight);
        cupGradient.addColorStop(0, '#FFD700');
        cupGradient.addColorStop(0.5, '#FFA500');
        cupGradient.addColorStop(1, '#FF8C00');
        
        ctx.fillStyle = cupGradient;
        ctx.fillRect(cupX, cupY, cupWidth, cupHeight);
        
        // Trophy handles
        const handleSize = cupWidth * 0.15;
        const handleY = cupY + cupHeight * 0.2;
        
        // Left handle
        ctx.beginPath();
        ctx.arc(cupX - handleSize/2, handleY, handleSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Right handle
        ctx.beginPath();
        ctx.arc(cupX + cupWidth + handleSize/2, handleY, handleSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Trophy base
        const baseWidth = cupWidth * 1.2;
        const baseHeight = size * 0.15;
        const baseX = x + (size - baseWidth) / 2;
        const baseY = cupY + cupHeight;
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
        
        // Add "PACO" text in the center
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${size * 0.08}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('PACO', x + size/2, cupY + cupHeight/2);
        
        // Add trophy emoji at the top
        ctx.font = `${size * 0.15}px Arial`;
        ctx.fillText('🏆', x + size/2, cupY - size * 0.05);
        
        // Restore context
        ctx.restore();
    }

    // Show trophy preview modal
    showTrophyPreview(canvas, playerData) {
        // Remove existing preview if any
        const existingPreview = document.getElementById('trophy-preview-modal');
        if (existingPreview) {
            existingPreview.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'trophy-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-radius: 20px;
            padding: 24px;
            max-width: 90%;
            max-height: 90%;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            border: 2px solid #475569;
            position: relative;
        `;

        // Create preview image
        const previewImg = document.createElement('img');
        previewImg.src = canvas.toDataURL('image/png');
        previewImg.style.cssText = `
            max-width: 500px;
            max-height: 300px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            margin-bottom: 20px;
        `;

        // Create title
        const title = document.createElement('h2');
        title.textContent = '🏆 Your Trophy is Ready!';
        title.style.cssText = `
            color: #fbbf24;
            text-align: center;
            margin: 0 0 16px 0;
            font-size: 1.5rem;
            font-weight: bold;
        `;

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
        `;

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '📥 Download';
        downloadBtn.style.cssText = `
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 20px;
            color: white;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        `;
        downloadBtn.onmouseover = () => downloadBtn.style.transform = 'translateY(-2px)';
        downloadBtn.onmouseout = () => downloadBtn.style.transform = 'translateY(0)';
        downloadBtn.onclick = () => {
            this.downloadTrophyImage(canvas, `paco-champion-${playerData.username || 'anonymous'}-${playerData.score}.png`);
            modal.remove();
        };

        // Twitter share button
        const twitterBtn = document.createElement('button');
        twitterBtn.innerHTML = '🐦 Share on Twitter';
        twitterBtn.style.cssText = `
            background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 20px;
            color: white;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);
        `;
        twitterBtn.onmouseover = () => twitterBtn.style.transform = 'translateY(-2px)';
        twitterBtn.onmouseout = () => twitterBtn.style.transform = 'translateY(0)';
        twitterBtn.onclick = async () => {
            modal.remove();
            // Trigger Twitter sharing through the game
            if (typeof game !== 'undefined' && game.shareOnTwitter) {
                await game.shareOnTwitter();
            } else {
                console.error('Game Twitter sharing not available');
            }
        };

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '❌';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            color: white;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.onclick = () => modal.remove();

        // Assemble modal
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(previewImg);
        modalContent.appendChild(buttonsContainer);
        buttonsContainer.appendChild(downloadBtn);
        buttonsContainer.appendChild(twitterBtn);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
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