We're building a 2D pixel farming simulator called "Paco's Farm" on Abstract L2 (Ethereum). The game is inspired by Wolf Game and will use NFTs and staking mechanics to make it competitive and onchain.

Here’s the core game logic and structure we want to build:

---

### 🐣 Base Gameplay

- Each player has a **chicken coop NFT** (1 per wallet) that serves as their farm base.
- Players can **stake Chicken NFTs** inside their coop. The more chickens they stake, the more **PACO tokens they earn** over time (yield farming).
- PACO tokens are an off-chain soft currency at first (can be bridged/minted to chain later if needed).
- Chickens have tiers: common, uncommon, rare, legendary. Higher tiers = more yield.

---

### 🐺 Coyote NFTs – Competitive Stealing Mechanic

- Players who own **Coyote NFTs** can raid coops.
- When a player **unstakes chickens or claims yield**, there's a % chance of **yield being stolen** by a random Coyote holder.
- Each successful raid earns the Coyote owner a portion of the stolen yield (taken from claim tax or random events).
- Coyotes have cooldowns and probabilistic outcomes. Higher-tier Coyotes = higher success rate.

---

### 🛡️ Optional Future NFTs (Phase 2)

- **Farmhand NFTs** can reduce raid success chance.
- **Land plots** or “Farm Upgrades” can increase yield or allow more chickens.
- Only launch this after base game loop works.

---

### 🔧 Development Notes

- All core assets (sprites, animations) will be made custom in a pixel art style.
- All yield/staking/raiding logic should be simulated in the frontend and validated onchain with smart contracts.
- Needs full wallet connection + NFT ownership validation for game logic access.

---

### ❓Important Build Requirement

The main site is already live and gaining momentum. We do NOT want to affect it during this new game build.

Please answer the following:

1. What’s the **best way to build this game secretly** without affecting the current website?
   - Should we build it in a new folder within the same repo?
   - Or should it be on a completely **separate private repo**?
   - Can we safely build it in a feature branch and later merge it without downtime?

2. Once the game is ready, what’s the **cleanest way to deploy it alongside the current site**?
   - We’d like to host it as a **subroute**, like `/game` or `/farm`, but only make it public after the game launch.
   - How do we merge it into the main repo while keeping both environments clean and easy to maintain?

---

Please generate a clear project file structure, suggest a tech stack for the 2D front-end (React, Phaser, or similar), and outline how to modularize this game so it can live safely alongside the current site once we merge.

Prioritize:
- Security
- Modularity
- Token/NFT holder gating
- Easy front-end/backend split for scaling
