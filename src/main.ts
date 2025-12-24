import Phaser from 'phaser';

// Menu
import { MenuScene } from './menu/MenuScene';

// Wheelchair Getaway scenes
import { BootScene as WG_BootScene } from './games/wheelchair-getaway/scenes/BootScene';
import { PlayScene as WG_PlayScene } from './games/wheelchair-getaway/scenes/PlayScene';

// Alien Invasion scenes
import { BootScene as AI_BootScene } from './games/alien-invasion/scenes/BootScene';
import { PlayScene as AI_PlayScene } from './games/alien-invasion/scenes/PlayScene';

// Game dimensions
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;

/**
 * Isaac's Games - Main Entry Point
 * A collection of fun games!
 */

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  // All scenes - MenuScene is first (entry point)
  scene: [
    MenuScene,
    // Wheelchair Getaway
    WG_BootScene,
    WG_PlayScene,
    // Alien Invasion
    AI_BootScene,
    AI_PlayScene,
  ],
};

const game = new Phaser.Game(config);

console.log("🎮 Isaac's Games - Starting...");
console.log('Phaser version:', Phaser.VERSION);

export default game;
