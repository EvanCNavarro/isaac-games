# Isaac's Games - Development Notes

## Project Overview
A collection of games built with Phaser 3 + TypeScript + Vite, deployed to Vercel.

**Live URL:** https://wheelchair-getaway.vercel.app
**GitHub:** https://github.com/EvanCNavarro/isaac-games

---

## Current Games

### 1. Wheelchair Getaway
- **Status:** Complete, playable
- **Genre:** Top-down endless runner
- **Controls:**
  - Desktop: WASD/Arrows to move, SPACE for oil slick
  - Mobile: Virtual joystick (left), oil slick button (right)
- **Features:**
  - Player escapes cop in electric wheelchair
  - Collectibles: coins, speed boost, shield
  - Obstacles: pothole, cone, puddle
  - Oil slicks stun the cop (4 seconds)
  - Score based on time survived

### 2. Alien Invasion
- **Status:** Playable, may need more polish
- **Genre:** DOOM-style FPS with raycasting
- **Controls:**
  - Desktop: WASD move, Arrows turn, Click shoot
  - Mobile: Joystick (move + turn), SHOOT button (auto-aim)
- **Features:**
  - Raycasting 3D engine
  - Green aliens, red boss aliens
  - Wave-based progression (boss every 3 waves)
  - Survivor rescue mechanic (1 survivor per alien killed)
  - Weapon pickups (Shotgun, Plasma)
- **Lore (from Isaac's notes):**
  - "You're in the army when aliens attack"
  - "You are the last person alive"
  - "Every time you beat an alien, you get a new human"
  - "After beating aliens, there's a giant boss"
  - Military base setting

---

## Project Structure
```
src/
├── main.ts                    # Entry point, registers all scenes
├── menu/
│   └── MenuScene.ts           # Game selector menu
├── games/
│   ├── wheelchair-getaway/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts   # WG_BootScene
│   │   │   └── PlayScene.ts   # WG_PlayScene
│   │   ├── entities/
│   │   │   ├── Player.ts
│   │   │   ├── Cop.ts
│   │   │   ├── Collectible.ts
│   │   │   └── Obstacle.ts
│   │   ├── ui/
│   │   │   └── VirtualJoystick.ts
│   │   └── config/
│   │       └── gameConfig.ts
│   └── alien-invasion/
│       ├── scenes/
│       │   ├── BootScene.ts   # AI_BootScene
│       │   └── PlayScene.ts   # AI_PlayScene
│       ├── ui/
│       │   └── MobileControls.ts
│       └── config/
│           └── gameConfig.ts
```

---

## Git Tags / Versions
- `v0.2-perspective` - Wheelchair Getaway with pseudo-3D perspective view (reverted to top-down)

---

## Recent Changes (Dec 23, 2025)

### Mobile Controls Fix for Alien Invasion
- Added simplified joystick (up/down = move, left/right = turn)
- Large SHOOT button with auto-aim
- Auto-targets closest visible alien
- Hit markers and damage numbers for feedback

### Balance Changes for Alien Invasion
- Alien speed: 1.5 → 0.6
- Aliens per wave: 5 → 3
- Alien health: 30 → 25
- Boss health: 200 → 150

---

## Known Issues / TODO

### Alien Invasion
- [ ] Test mobile controls more thoroughly on various devices
- [ ] Consider adding strafing to joystick (currently just forward/back + turn)
- [ ] Add sound effects
- [ ] Add more weapon variety
- [ ] Add minimap showing alien positions
- [ ] Consider adding health pickups
- [ ] Boss needs more dramatic intro/defeat

### Wheelchair Getaway
- [ ] Add more obstacle variety
- [ ] Add sound effects
- [ ] Consider adding high score persistence

### General
- [ ] Rename Vercel project from "wheelchair-getaway" to "isaac-games" (do in Vercel dashboard → Settings → Project Name)
- [ ] Add more games to the collection
- [ ] Add settings menu (sound toggle, etc.)

---

## Deployment Notes
- Auto-deploys from GitHub main branch via Vercel
- Build command: `npm run build`
- Output: `dist/`

---

## Tech Stack
- **Framework:** Phaser 3.90.0
- **Language:** TypeScript 5.9.3
- **Bundler:** Vite 7.3.0
- **Deployment:** Vercel
