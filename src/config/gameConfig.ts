/**
 * Game configuration constants
 * ELI5: These are the "rules" of our game world - how big it is, how gravity works, etc.
 */

// Game dimensions - wider for better landscape support, will scale to fit
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 900;

// Physics constants
export const PLAYER_SPEED = 220;
export const COP_SPEED = 140; // Much slower so player can actually escape
export const COP_ACCELERATION = 0.3; // Cop gets faster over time (slower ramp)

// Gameplay
export const STARTING_DISTANCE = 450; // More breathing room at start
export const CATCH_DISTANCE = 30; // How close cop needs to be to catch player

// Oil slick settings
export const OIL_SLICK_COUNT = 4; // Start with 4 oil slicks
export const OIL_SLICK_STUN_DURATION = 4000; // 4 seconds stun

// Spawn rates (lower = more frequent)
export const COLLECTIBLE_SPAWN_INTERVAL = 800; // Spawn collectibles more often
export const OBSTACLE_SPAWN_INTERVAL = 2500; // Obstacles spawn rate

// Colors (for placeholder graphics)
export const COLORS = {
  ROAD: 0x333333,
  ROAD_LINES: 0xffffff,
  GRASS: 0x228b22,
  PLAYER: 0x4a90d9,
  COP: 0xff0000,
  COIN: 0xffd700,
  BOOST: 0x00ff00,
  OIL: 0x1a1a1a,
  SHIELD: 0x00ffff,
};
