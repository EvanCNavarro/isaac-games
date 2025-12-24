import Phaser from 'phaser';
import {
  COLORS,
  STARTING_DISTANCE,
  CATCH_DISTANCE,
  OIL_SLICK_COUNT,
  OIL_SLICK_STUN_DURATION,
  COLLECTIBLE_SPAWN_INTERVAL,
  OBSTACLE_SPAWN_INTERVAL,
} from '../config/gameConfig';
import { Player } from '../entities/Player';
import { Cop } from '../entities/Cop';
import { Collectible, CollectibleType } from '../entities/Collectible';
import { Obstacle, ObstacleType } from '../entities/Obstacle';
import { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * PlayScene - Main gameplay scene
 * ELI5: This is where all the action happens! The wheelchair runs, the cop chases.
 */
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cop!: Cop;

  // Road scrolling
  private roadLines: Phaser.GameObjects.Rectangle[] = [];
  private roadScrollSpeed: number = 300;
  private roadWidth: number = 0;
  private roadLeftEdge: number = 0;

  // Collectibles
  private collectibles: Collectible[] = [];
  private spawnTimer: number = 0;

  // Obstacles
  private obstacles: Obstacle[] = [];
  private obstacleSpawnTimer: number = 0;

  // Game state
  private score: number = 0;
  private coins: number = 0;
  private gameTime: number = 0;
  private isGameOver: boolean = false;
  private oilSlicksRemaining: number = OIL_SLICK_COUNT;
  private hasShield: boolean = false;

  // Oil slicks dropped by player
  private oilSlicks: Phaser.GameObjects.Ellipse[] = [];

  // UI elements
  private scoreText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private copDistanceText!: Phaser.GameObjects.Text;
  private oilSlickText!: Phaser.GameObjects.Text;
  private shieldIndicator!: Phaser.GameObjects.Container;
  private gameOverContainer!: Phaser.GameObjects.Container;

  // Mobile controls
  private joystick!: VirtualJoystick;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Reset game state
    this.score = 0;
    this.coins = 0;
    this.gameTime = 0;
    this.isGameOver = false;
    this.oilSlicksRemaining = OIL_SLICK_COUNT;
    this.hasShield = false;
    this.collectibles = [];
    this.obstacles = [];
    this.oilSlicks = [];
    this.roadLines = [];
    this.spawnTimer = 0;
    this.obstacleSpawnTimer = 0;

    // Create the road
    this.createRoad(width, height);

    // Create player (positioned higher on screen for isometric feel - see more ahead)
    this.player = new Player(this, width / 2, height * 0.75);

    // Create cop (starts behind player - off screen)
    this.cop = new Cop(this, width / 2, height * 0.75 + STARTING_DISTANCE);

    // Create UI
    this.createUI(width);

    // Create game over screen (hidden initially)
    this.createGameOverScreen(width, height);

    // Setup keyboard for oil slick
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.dropOilSlick());
    }

    // Create virtual joystick for mobile
    this.joystick = new VirtualJoystick(this);

    // Add oil slick button for mobile (bottom right)
    this.createMobileOilSlickButton(width, height);

    console.log('PlayScene started! Use WASD or Arrow Keys to move. SPACE to drop oil slick.');
  }

  private createRoad(width: number, height: number): void {
    // Calculate road dimensions - wider road for more room
    this.roadWidth = width * 0.8;
    this.roadLeftEdge = (width - this.roadWidth) / 2;

    // Grass on left side
    this.add.rectangle(this.roadLeftEdge / 2, height / 2, this.roadLeftEdge, height, COLORS.GRASS);

    // Grass on right side
    this.add.rectangle(width - this.roadLeftEdge / 2, height / 2, this.roadLeftEdge, height, COLORS.GRASS);

    // Main road
    this.add.rectangle(width / 2, height / 2, this.roadWidth, height, COLORS.ROAD);

    // Road edge lines (solid white)
    this.add.rectangle(this.roadLeftEdge + 5, height / 2, 4, height, COLORS.ROAD_LINES);
    this.add.rectangle(this.roadLeftEdge + this.roadWidth - 5, height / 2, 4, height, COLORS.ROAD_LINES);

    // Create dashed center lines (these will scroll)
    const lineWidth = 4;
    const lineHeight = 40;
    const lineGap = 30;
    const totalLineHeight = lineHeight + lineGap;

    // Create enough lines to cover screen plus extra for scrolling
    for (let y = -totalLineHeight; y < height + totalLineHeight; y += totalLineHeight) {
      const line = this.add.rectangle(width / 2, y, lineWidth, lineHeight, COLORS.ROAD_LINES);
      this.roadLines.push(line);
    }
  }

  private createUI(width: number): void {
    // Score display
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // Coins display
    this.coinsText = this.add.text(20, 50, 'COINS: 0', {
      fontSize: '18px',
      color: '#ffd700',
    });

    // Cop distance display
    this.copDistanceText = this.add.text(width - 20, 20, '🚔 450m', {
      fontSize: '20px',
      color: '#ff6666',
    }).setOrigin(1, 0);

    // Oil slick counter
    this.oilSlickText = this.add.text(width - 20, 50, `🛢️ x${OIL_SLICK_COUNT} [SPACE]`, {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(1, 0);

    // Shield indicator (hidden by default)
    this.shieldIndicator = this.add.container(width - 20, 80);
    const shieldIcon = this.add.circle(0, 0, 12, COLORS.SHIELD, 0.7);
    shieldIcon.setStrokeStyle(2, 0x00ffff);
    const shieldLabel = this.add.text(-30, -8, '🛡️', { fontSize: '16px' });
    this.shieldIndicator.add([shieldIcon, shieldLabel]);
    this.shieldIndicator.setVisible(false);

    // Controls hint (hidden on touch devices)
    const controlsHint = this.add.text(width / 2, 80, 'WASD/Arrows = Move | SPACE = Oil Slick', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);

    if (this.sys.game.device.input.touch) {
      controlsHint.setVisible(false);
    }
  }

  private createMobileOilSlickButton(width: number, height: number): void {
    // Only show on touch devices
    if (!this.sys.game.device.input.touch) return;

    const btnX = width - 80;
    const btnY = height - 100;

    const oilBtn = this.add.circle(btnX, btnY, 40, 0x1a1a1a, 0.8);
    oilBtn.setStrokeStyle(3, 0x666666);
    oilBtn.setInteractive({ useHandCursor: true });
    oilBtn.setDepth(50);

    this.add.text(btnX, btnY, '🛢️', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(51);

    oilBtn.on('pointerdown', () => {
      this.dropOilSlick();
      oilBtn.setFillStyle(0x333333);
    });

    oilBtn.on('pointerup', () => {
      oilBtn.setFillStyle(0x1a1a1a);
    });
  }

  private createGameOverScreen(width: number, height: number): void {
    this.gameOverContainer = this.add.container(width / 2, height / 2);
    this.gameOverContainer.setVisible(false);
    this.gameOverContainer.setDepth(100);

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    this.gameOverContainer.add(overlay);

    // Game over text
    const gameOverText = this.add.text(0, -120, 'BUSTED!', {
      fontSize: '48px',
      color: '#ff0000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(gameOverText);

    // Final score (will be updated)
    const finalScoreText = this.add.text(0, -50, 'Score: 0', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
    finalScoreText.setName('finalScore');
    this.gameOverContainer.add(finalScoreText);

    // Coins collected
    const coinsCollectedText = this.add.text(0, -10, 'Coins: +0', {
      fontSize: '20px',
      color: '#ffd700',
    }).setOrigin(0.5);
    coinsCollectedText.setName('coinsText');
    this.gameOverContainer.add(coinsCollectedText);

    // Time survived
    const timeText = this.add.text(0, 30, 'Time: 0.00s', {
      fontSize: '20px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    timeText.setName('timeText');
    this.gameOverContainer.add(timeText);

    // Restart button
    const restartBtn = this.add.rectangle(0, 110, 200, 50, 0x4a90d9);
    restartBtn.setStrokeStyle(2, 0xffffff);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setFillStyle(0x6ab0f9));
    restartBtn.on('pointerout', () => restartBtn.setFillStyle(0x4a90d9));
    restartBtn.on('pointerdown', () => this.restartGame());
    this.gameOverContainer.add(restartBtn);

    const restartText = this.add.text(0, 110, 'PLAY AGAIN', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(restartText);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    // Update game time and score
    this.gameTime += delta;
    this.score = Math.floor(this.gameTime);

    // Update UI
    this.scoreText.setText(`SCORE: ${this.score.toLocaleString()}`);

    // Calculate cop distance and update display
    const copDistance = Math.floor(this.cop.distanceTo(this.player.x, this.player.y));
    this.copDistanceText.setText(`🚔 ${copDistance}m behind`);

    // Color code distance
    if (copDistance < 100) {
      this.copDistanceText.setColor('#ff0000');
    } else if (copDistance < 200) {
      this.copDistanceText.setColor('#ffaa00');
    } else {
      this.copDistanceText.setColor('#66ff66');
    }

    // Scroll road lines
    this.scrollRoad(delta);

    // Spawn collectibles (more frequently now)
    this.spawnTimer += delta;
    if (this.spawnTimer >= COLLECTIBLE_SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnCollectible();
    }

    // Spawn obstacles
    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= OBSTACLE_SPAWN_INTERVAL) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    // Update collectibles (scroll and check collection)
    this.updateCollectibles(delta);

    // Update obstacles (scroll and check collision)
    this.updateObstacles(delta);

    // Update oil slicks (scroll and check if cop hits)
    this.updateOilSlicks(delta);

    // Update player (pass joystick input)
    this.player.update(this.joystick.getForceX(), this.joystick.getForceY());

    // Update cop
    this.cop.update(delta, this.player.x, this.player.y, this.gameTime);

    // Check if cop caught player
    if (copDistance < CATCH_DISTANCE) {
      this.onCopCatchesPlayer();
    }
  }

  private scrollRoad(delta: number): void {
    const scrollAmount = (this.roadScrollSpeed * delta) / 1000;
    const lineHeight = 40;
    const lineGap = 30;
    const totalHeight = lineHeight + lineGap;

    for (const line of this.roadLines) {
      line.y += scrollAmount;

      // Reset line to top when it goes off screen
      if (line.y > this.scale.height + lineHeight) {
        line.y -= this.roadLines.length * totalHeight;
      }
    }
  }

  private spawnCollectible(): void {
    // Random position on road
    const margin = 50;
    const x = Phaser.Math.Between(
      this.roadLeftEdge + margin,
      this.roadLeftEdge + this.roadWidth - margin
    );

    // Spawn above screen
    const y = -30;

    // Random type - more boosts and shields now (40% coins, 35% boost, 25% shield)
    const rand = Math.random();
    let type: CollectibleType;
    if (rand < 0.40) {
      type = 'coin';
    } else if (rand < 0.75) {
      type = 'boost';
    } else {
      type = 'shield';
    }

    const collectible = new Collectible(this, x, y, type);
    this.collectibles.push(collectible);
  }

  private updateCollectibles(delta: number): void {
    const scrollAmount = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];

      // Scroll down
      collectible.y += scrollAmount;

      // Check if collected by player
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        collectible.x, collectible.y
      );

      if (dist < 45) {
        this.onCollect(collectible);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Remove if off screen
      if (collectible.y > this.scale.height + 50) {
        collectible.destroy();
        this.collectibles.splice(i, 1);
      }
    }
  }

  private onCollect(collectible: Collectible): void {
    switch (collectible.collectibleType) {
      case 'coin':
        this.coins++;
        this.coinsText.setText(`COINS: ${this.coins}`);
        break;

      case 'boost':
        this.player.applyBoost(2.5, 2500); // 2.5x speed for 2.5 seconds
        // Push cop back more
        this.cop.y += 150;
        break;

      case 'shield':
        this.hasShield = true;
        this.shieldIndicator.setVisible(true);
        break;
    }

    collectible.collect();
  }

  private spawnObstacle(): void {
    // Random position on road
    const margin = 60;
    const x = Phaser.Math.Between(
      this.roadLeftEdge + margin,
      this.roadLeftEdge + this.roadWidth - margin
    );

    // Spawn above screen
    const y = -30;

    // Random type
    const types: ObstacleType[] = ['pothole', 'cone', 'puddle'];
    const type = types[Phaser.Math.Between(0, types.length - 1)];

    const obstacle = new Obstacle(this, x, y, type);
    this.obstacles.push(obstacle);
  }

  private updateObstacles(delta: number): void {
    const scrollAmount = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];

      // Scroll down
      obstacle.y += scrollAmount;

      // Check if player hits obstacle
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        obstacle.x, obstacle.y
      );

      if (dist < 35 && !this.player.isSlowed && !this.player.isBoosting) {
        // Player hit obstacle - slow them down!
        this.player.applySlowdown(obstacle.slowdownAmount, obstacle.slowdownDuration);
        obstacle.onHit();
      }

      // Remove if off screen
      if (obstacle.y > this.scale.height + 50) {
        obstacle.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  private dropOilSlick(): void {
    if (this.oilSlicksRemaining <= 0 || this.isGameOver) return;

    this.oilSlicksRemaining--;
    this.oilSlickText.setText(`🛢️ x${this.oilSlicksRemaining} [SPACE]`);

    // Create oil slick at player position
    const oil = this.add.ellipse(
      this.player.x,
      this.player.y + 40,
      60, 30,
      COLORS.OIL, 0.8
    );
    oil.setStrokeStyle(2, 0x333333);

    this.oilSlicks.push(oil);
  }

  private updateOilSlicks(delta: number): void {
    const scrollAmount = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
      const oil = this.oilSlicks[i];

      // Scroll down with road
      oil.y += scrollAmount;

      // Check if cop hits oil slick
      const dist = Phaser.Math.Distance.Between(
        this.cop.x, this.cop.y,
        oil.x, oil.y
      );

      if (dist < 50 && !this.cop.isStunned) {
        this.cop.stun(OIL_SLICK_STUN_DURATION); // 4 seconds stun now!
        // Remove oil slick
        oil.destroy();
        this.oilSlicks.splice(i, 1);
        continue;
      }

      // Remove if way off screen
      if (oil.y > this.scale.height + 100) {
        oil.destroy();
        this.oilSlicks.splice(i, 1);
      }
    }
  }

  private onCopCatchesPlayer(): void {
    if (this.isGameOver) return;

    // If player has shield, consume it instead of game over
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldIndicator.setVisible(false);
      // Push cop back more
      this.cop.y += 200;
      return;
    }

    this.isGameOver = true;

    // Stop all movement
    this.player.getBody().setVelocity(0);
    this.cop.getBody().setVelocity(0);

    // Update game over screen with final stats
    const finalScoreText = this.gameOverContainer.getByName('finalScore') as Phaser.GameObjects.Text;
    if (finalScoreText) {
      finalScoreText.setText(`Score: ${this.score.toLocaleString()}`);
    }

    const coinsText = this.gameOverContainer.getByName('coinsText') as Phaser.GameObjects.Text;
    if (coinsText) {
      coinsText.setText(`Coins: +${this.coins}`);
    }

    const timeText = this.gameOverContainer.getByName('timeText') as Phaser.GameObjects.Text;
    if (timeText) {
      timeText.setText(`Time: ${(this.gameTime / 1000).toFixed(2)}s`);
    }

    // Show game over screen
    this.gameOverContainer.setVisible(true);

    console.log(`Game Over! Final score: ${this.score}, Coins: ${this.coins}`);
  }

  private restartGame(): void {
    this.scene.restart();
  }
}
