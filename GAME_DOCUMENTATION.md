# 🎮 Paco Jump - Game Documentation

## Overview

Paco Jump is a Doodle Jump-style mini-game integrated into Paco's Chicken Palace. Players control Paco the chicken as he jumps between platforms to reach new heights, with scores tracked on a daily leaderboard requiring Twitter authentication.

## 🏗️ Architecture

### Modular System Design
- **`game-assets.js`** - Visual assets, theming, and art management
- **`game-physics.js`** - Physics engine, collision detection, and movement
- **`twitter-auth.js`** - OAuth integration and user authentication
- **`leaderboard.js`** - Score tracking and ranking system
- **`game.js`** - Main game engine and coordination

### Tab System
- Seamless switching between PFP Generator and Game
- Maintains restaurant theme consistency
- Mobile-optimized navigation

## 🎯 Game Features

### Core Gameplay
- **Doodle Jump Mechanics**: Automatic upward scrolling with gravity-based physics
- **Platform Types**: 
  - Normal (brown) - Standard platforms
  - Spring (green) - Extra bounce height
  - Moving (orange) - Horizontal movement
  - Breaking (red) - Disappear after touch
  - Cloud (white) - Soft landing platforms
  - Evil (brown) - Dangerous! Kills player unless defeated with corn power-up

### Controls
- **Desktop**: Arrow keys or A/D keys for movement
- **Mobile**: Tap left/right sides of screen for movement
- **Hidden**: Spacebar timing mechanic for skilled players (desktop only)
- **Hidden**: Hold center screen briefly for timing bounce (mobile only)

### Scoring System
- Points based on height reached (1 point per 10 pixels)
- Platform bonuses for special platform types
- Real-time score tracking with best score persistence

## 🏆 Leaderboard System

### Authentication
- Twitter OAuth 2.0 with PKCE for security
- Users must connect Twitter to compete
- Anonymous gameplay allowed without leaderboard access

### Daily Rankings
- Leaderboards reset every 24 hours at UTC midnight
- Users can submit multiple scores, best score counts
- Real-time updates when other players submit scores
- Top 50 players displayed

### Database Schema
- `game_scores` table with user info and scores
- Daily partitioning by `game_date`
- Real-time subscriptions for live updates
- Automatic cleanup after 30 days

## 📱 Mobile Optimization

### Performance
- 60fps target with frame limiting
- Efficient canvas rendering with viewport culling
- Particle system optimization
- Touch-friendly controls (44px minimum targets)

### Responsive Design
- Adaptive canvas sizing
- Mobile-specific UI layouts
- Touch gesture support
- Reduced particle effects on mobile

## 🎨 Custom Asset System

### Pluggable Asset Integration
The game now uses your custom sprites from the `game/` directory:

- **`jump.png`** - Main character sprite (centered/neutral)
- **`left_jump.png`** - Character jumping/moving left  
- **`right_jump.png`** - Character jumping/moving right
- **`walk.gif`** - Walking animation (future feature)
- **`corn.png`** - Decorates spring platforms (gives extra bounce)
- **`taco.png`** - Decorates moving platforms
- **`evil-flocko.png`** - Dangerous enemy on evil platforms (kills player unless defeated with corn power-up)

### Asset Loading System
- **Async loading** with progress indicator
- **Graceful fallback** to procedural drawing if assets fail
- **Automatic sprite selection** based on player movement direction
- **Optimized rendering** with proper aspect ratio maintenance

### Platform Types Enhanced
- **Spring (Corn)**: 1.5x jump force, decorated with corn sprite
- **Moving (Taco)**: Horizontal movement, decorated with taco sprite  
- **Evil (Flocko)**: 0.6x jump force, decorated with evil-flocko sprite
- **Breaking**: Cracks and disappears after touch
- **Cloud**: Soft landing platforms
- **Normal**: Standard brown platforms

### Customization Guide

#### Adding New Sprites
1. Place image files in the `game/` directory
2. Update `assetPaths` object in `game-assets.js`
3. Add sprite loading to `loadAssets()` function
4. Use sprites in drawing functions with fallback logic

#### Updating Existing Art
1. Replace image files in `game/` directory (maintain same filenames)
2. Game automatically uses new sprites on next load
3. Maintain aspect ratios for best visual results

#### Creating New Platform Types
1. Add sprite to `game/` directory
2. Update `assetPaths` in `game-assets.js`
3. Add type to color palette
4. Include in platform generation logic
5. Add physics behavior in `handlePlatformJump()`
6. Add drawing logic in `drawPlatform()`

## 🔧 Setup Instructions

### Database Setup
1. Run the SQL schema from `database-schema.sql` in Supabase
2. Enable real-time for `game_scores` table
3. Configure Row Level Security policies

### Twitter OAuth Setup
1. Create Twitter App at [developer.twitter.com](https://developer.twitter.com)
2. Configure OAuth 2.0 with PKCE
3. Update `clientId` in `twitter-auth.js`
4. Set up backend endpoints for token exchange (production)

### Environment Configuration
- Development: Uses demo mode for Twitter auth
- Production: Requires proper OAuth endpoints and secrets

## 🚀 Deployment Notes

### Files to Deploy
- All new JavaScript modules
- Updated `index.html`, `styles.css`, `script.js`
- Updated `database-schema.sql`
- Existing build process handles all files

### Performance Considerations
- Game runs entirely client-side
- Database calls only for leaderboard operations
- Graceful degradation when Supabase unavailable
- Local score storage as fallback

## 🎮 Game States

### State Management
- `menu` - Initial state, showing start button
- `playing` - Active gameplay
- `paused` - Game paused (desktop only)
- `gameOver` - Score submission and restart options

### User Flow
1. Switch to Game tab
2. Connect Twitter (optional, for leaderboard)
3. Start game with play button
4. Control Paco with keyboard/touch
5. Game over triggers score submission
6. View leaderboard and play again

## 🔍 Debug Features

### Development Tools
- FPS counter (visible in debug mode)
- Console logging for all major events
- Error handling with user-friendly messages
- Performance monitoring

### Testing
- Demo mode for Twitter auth (development)
- Local leaderboard fallback
- Platform generation testing
- Mobile touch testing

## 📊 Analytics & Monitoring

### Metrics Tracked
- Game sessions and duration
- Score distributions
- Platform interaction patterns
- User authentication rates
- Mobile vs desktop usage

### Real-time Features
- Live score submissions
- Leaderboard updates
- User rank changes
- Daily reset notifications

---

**Built with ❤️ for the $PACO community** 🐔🎮