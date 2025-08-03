# 🚀 Universal Leaderboard System Migration Guide

This guide will help you implement the comprehensive universal point tracking and leaderboard system across your entire Paco site.

## 📋 Overview

The new system provides:
- **Universal Points & XP** - Earn points across all site activities
- **Level System** - User progression with unlockable perks
- **Achievement System** - Unlockable achievements across the site
- **Cross-Platform Leaderboards** - Game scores, PFP creation, social activities
- **Real-time Updates** - Live leaderboard and achievement notifications
- **Analytics** - Comprehensive user engagement tracking

## 🗄️ Step 1: Database Setup

### Deploy the SQL Schema

**IMPORTANT: Choose the correct deployment order based on your current setup:**

#### Option A: Fresh Setup (No existing tables)
1. Open your Supabase Dashboard
2. Go to SQL Editor  
3. Copy and paste the contents of `universal-leaderboard-schema.sql`
4. Run the entire script
5. Later, when you want to add your existing game/PFP tables, run `database-schema.sql`
6. Then run `universal-leaderboard-upgrade.sql` for full integration

#### Option B: You already have game_scores and paco_orders tables
1. First, deploy your existing `database-schema.sql` if you haven't already
2. Then deploy `universal-leaderboard-schema.sql` 
3. Finally, run `universal-leaderboard-upgrade.sql` for full integration

#### Option C: Universal system first, existing tables later
1. Deploy `universal-leaderboard-schema.sql` (works standalone)
2. Later when ready, deploy `database-schema.sql`
3. Run `universal-leaderboard-upgrade.sql` to connect everything

### Verify Installation

```sql
-- Quick verification queries:
SELECT * FROM user_levels ORDER BY xp_required;
SELECT * FROM activity_types WHERE is_active = true;
SELECT * FROM achievements WHERE is_active = true;
```

### Expected Tables Created:
- `user_profiles` - Enhanced user management
- `user_levels` - Level system (6 levels from Chicken Scratch to Legendary Paco)
- `activity_types` - Point/XP rewards for different activities
- `user_activities` - Track all user actions
- `daily_leaderboards` - Daily rankings and stats
- `achievements` - Unlockable achievements
- `user_achievements` - User progress tracking

## 🔧 Step 2: Integration Setup

### Add the Universal System to Your Site

1. **Copy Integration File**
   ```bash
   # Add the integration module to your project
   cp universal-leaderboard-integration.js /path/to/your/project/
   ```

2. **Include in HTML**
   ```html
   <!-- Add after your existing Supabase client setup -->
   <script src="universal-leaderboard-integration.js"></script>
   ```

3. **Initialize the System**
   ```javascript
   // After your Supabase client is ready
   universalLeaderboard.initialize(supabaseClient);
   ```

## 🎮 Step 3: Game Integration

### Update Your Game Score Submission

**Old Code (game.js):**
```javascript
// OLD: Basic leaderboard submission
await leaderboard.submitScore(this.score);
```

**New Code (enhanced tracking):**
```javascript
// NEW: Universal system with detailed tracking
const gameStats = {
    evil_flockos_defeated: this.enemiesDefeated || 0,
    perfect_bounces: this.perfectBounces || 0,
    power_ups_collected: this.powerUpsCollected || 0,
    session_duration: this.getSessionDuration(),
    platforms_jumped: this.platformsJumped || 0
};

await universalLeaderboard.submitGameScore(this.score, gameStats);
```

### Track Game Events

Add these calls throughout your game:

```javascript
// When player defeats evil flocko (already implemented in your combat system)
await universalLeaderboard.awardActivity('game_evil_defeat');

// When perfect timing bounce occurs  
await universalLeaderboard.awardActivity('game_perfect_bounce');

// Daily play bonus (call once per session)
await universalLeaderboard.awardActivity('game_daily_play');

// When reaching milestones
if (this.score >= 1000) {
    await universalLeaderboard.awardActivity('score_master', { score: this.score });
}
```

## 🎨 Step 4: PFP System Integration

### Update Order Creation

**In your script.js where PFP orders are processed:**

```javascript
// After successfully creating a PFP order
const orderData = {
    order_id: newOrderId,
    hat_name: selectedHat.name,
    item_name: selectedItem.name,
    total_price: totalPrice,
    traits_count: getUniqueTraitsCount(),
    is_rare_combo: isRareTraitCombination(selectedHat, selectedItem)
};

await universalLeaderboard.trackPFPOrder(orderData);
```

### Track PFP Achievements

```javascript
// Award achievements for PFP milestones
if (userOrderCount === 1) {
    // First PFP automatically awarded by trackPFPOrder
} else if (userOrderCount >= 25) {
    await universalLeaderboard.awardActivity('paco_artist');
}
```

## 👤 Step 5: User Authentication Integration

### Update Twitter Auth Flow

**In your twitter-auth.js:**

```javascript
// After successful Twitter authentication
async function handleAuthSuccess(twitterUserData) {
    // Create/update universal user profile
    const userProfile = await universalLeaderboard.createOrUpdateUser(twitterUserData);
    
    // Award first-time login bonus
    await universalLeaderboard.awardActivity('game_daily_play');
    
    // Load and display user stats
    const stats = await universalLeaderboard.getUserStats();
    updateUserUI(stats);
}
```

## 📊 Step 6: Leaderboard UI Updates

### Replace Existing Leaderboard Displays

**Old leaderboard call:**
```javascript
const scores = await leaderboard.getDailyLeaderboard();
```

**New universal leaderboard:**
```javascript
// Get different leaderboard types
const pointsLeaderboard = await universalLeaderboard.getLeaderboard('points', 'daily');
const gameLeaderboard = await universalLeaderboard.getLeaderboard('game', 'daily');
const xpLeaderboard = await universalLeaderboard.getLeaderboard('xp', 'all_time');
```

### Enhanced Leaderboard Display

```javascript
function displayUniversalLeaderboard(leaderboardData) {
    const html = leaderboardData.map((entry, index) => `
        <div class="leaderboard-entry">
            <span class="rank">#${entry.rank}</span>
            <img src="${entry.profile_image}" alt="${entry.username}" class="avatar">
            <div class="user-info">
                <span class="username">${entry.display_name}</span>
                <span class="level" style="color: ${entry.level_color}">
                    ${entry.level_icon} ${entry.level_name}
                </span>
            </div>
            <span class="score">${entry.score_value.toLocaleString()}</span>
        </div>
    `).join('');
    
    document.getElementById('leaderboard-container').innerHTML = html;
}
```

## 🏆 Step 7: Achievement System

### Display User Achievements

```javascript
async function loadUserAchievements() {
    const achievements = await universalLeaderboard.getUserAchievements();
    const allAchievements = await universalLeaderboard.getAchievements();
    
    displayAchievements(achievements, allAchievements);
}

function displayAchievements(userAchievements, allAchievements) {
    const container = document.getElementById('achievements-container');
    
    const html = allAchievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
        const isUnlocked = userAchievement?.is_completed || false;
        
        return `
            <div class="achievement ${isUnlocked ? 'unlocked' : 'locked'}">
                <span class="icon">${achievement.icon_emoji}</span>
                <div class="info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                    ${isUnlocked ? `<small>Unlocked: ${new Date(userAchievement.unlocked_at).toLocaleDateString()}</small>` : ''}
                </div>
                ${isUnlocked ? '<span class="badge">✓</span>' : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}
```

## 🔴 Step 8: Real-time Updates

### Set Up Event Listeners

```javascript
// Listen for real-time updates
document.addEventListener('universal-leaderboard:leaderboardUpdate', (event) => {
    console.log('📊 Leaderboard updated!');
    refreshLeaderboardDisplay();
});

document.addEventListener('universal-leaderboard:achievementUnlock', (event) => {
    console.log('🏆 Achievement unlocked!', event.detail);
    showAchievementPopup(event.detail);
});

// Set up user stats display
async function updateUserStatsDisplay() {
    const stats = universalLeaderboard.getUserStats();
    
    if (stats.user) {
        document.getElementById('user-points').textContent = stats.user.total_points.toLocaleString();
        document.getElementById('user-level').textContent = stats.user.level.name;
        document.getElementById('user-level').style.color = stats.user.level.color_hex;
        document.getElementById('daily-points').textContent = stats.daily_stats.today_points;
    }
}
```

## 📈 Step 9: Analytics & Insights

### Track Custom Events

```javascript
// Track any custom activity across your site
await universalLeaderboard.awardActivity('custom_activity_id', {
    custom_data: 'any relevant context',
    value: 123
});
```

### Get User Statistics

```javascript
// Comprehensive user stats
const userStats = await universalLeaderboard.getUserStats();

/*
Returns:
{
    user: { id, username, total_points, total_xp, level: {...} },
    daily_stats: { today_points, today_xp, today_activities },
    achievements: { total_unlocked, recent_achievements },
    rankings: { points_rank, game_rank }
}
*/
```

## 🎯 Step 10: Testing & Verification

### Test the Complete Flow

1. **User Registration**
   ```javascript
   // Test user creation
   await universalLeaderboard.createOrUpdateUser(mockTwitterData);
   ```

2. **Point Awards**
   ```javascript
   // Test various activities
   await universalLeaderboard.awardActivity('game_score_submit', { score: 750 });
   await universalLeaderboard.awardActivity('pfp_order_create', { hat: 'crown' });
   ```

3. **Leaderboard Rankings**
   ```javascript
   // Test leaderboard generation
   const leaderboard = await universalLeaderboard.getLeaderboard('points', 'daily');
   console.log('Daily points leaderboard:', leaderboard);
   ```

4. **Achievement Unlocks**
   ```javascript
   // Test achievement progression
   const achievements = await universalLeaderboard.getUserAchievements();
   console.log('User achievements:', achievements);
   ```

### Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check user profiles
SELECT username, total_points, total_xp, level_id FROM user_profiles;

-- Check recent activities  
SELECT ua.*, at.name FROM user_activities ua
JOIN activity_types at ON at.id = ua.activity_type_id
ORDER BY ua.created_at DESC LIMIT 10;

-- Check daily leaderboard
SELECT * FROM get_universal_leaderboard('points', 'daily', 10);

-- Check user stats for a specific user
SELECT get_user_stats(1); -- Replace 1 with actual user ID
```

## 🚀 Step 11: Go Live

### Deployment Checklist

- [ ] SQL schema deployed to production Supabase
- [ ] Integration module added to production site
- [ ] Game score submission updated
- [ ] PFP order tracking implemented
- [ ] User authentication flow updated
- [ ] Leaderboard UI updated
- [ ] Achievement system integrated
- [ ] Real-time subscriptions working
- [ ] Test all user flows
- [ ] Monitor for errors in production

### Optional: Data Migration

If you want to migrate existing data:

```sql
-- Migrate existing Twitter users to user_profiles
INSERT INTO user_profiles (twitter_id, username, display_name, registration_source)
SELECT DISTINCT user_id, username, display_name, 'game'
FROM game_scores 
WHERE user_id IS NOT NULL
ON CONFLICT (twitter_id) DO NOTHING;

-- Award retroactive points for existing scores
-- (Run this carefully in batches)
```

## 🎉 Benefits After Migration

- **Unified User Experience** - One account, multiple activities
- **Increased Engagement** - Points, levels, and achievements across the site
- **Better Analytics** - Comprehensive user behavior tracking
- **Scalable System** - Easy to add new activities and features
- **Real-time Competition** - Live leaderboards and social features
- **Cross-Platform Growth** - Game players discover PFPs, PFP users try the game

## 🆘 Troubleshooting

### Common Issues

1. **RLS Policies**: Make sure Row Level Security policies allow your operations
2. **User Not Found**: Always call `createOrUpdateUser()` after authentication
3. **Missing Points**: Check that activity_types exist and are active
4. **Real-time Not Working**: Verify Supabase real-time is enabled for tables

### Support

- Check Supabase logs for detailed error messages
- Use browser dev tools to debug JavaScript integration
- Test with sample data before production deployment

---

🎮 **Ready to level up your user engagement system!** 🍗✨