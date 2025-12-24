import Phaser from 'phaser';
import {
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
 * PlayScene - Main gameplay scene with pseudo-3D perspective
 * Creates an over-the-shoulder view with objects scaling as they approach
 */
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cop!: Cop;

  // Perspective settings
  private horizon: number = 0; // Y position of horizon
  private vanishX: number = 0; // X position of vanishing point
  private roadTopWidth: number = 0; // Road width at horizon
  private roadBottomWidth: number = 0; // Road width at bottom

  // Road elements
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private roadScrollOffset: number = 0;
  private roadScrollSpeed: number = 400;

  // Collectibles & Obstacles
  private collectibles: Collectible[] = [];
  private obstacles: Obstacle[] = [];
  private spawnTimer: number = 0;
  private obstacleSpawnTimer: number = 0;

  // Game state
  private score: number = 0;
  private coins: number = 0;
  private gameTime: number = 0;
  private isGameOver: boolean = false;
  private oilSlicksRemaining: number = OIL_SLICK_COUNT;
  private hasShield: boolean = false;

  // Oil slicks
  private oilSlicks: { x: number; y: number; graphic: Phaser.GameObjects.Ellipse }[] = [];

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private copDistanceText!: Phaser.GameObjects.Text;
  private oilSlickText!: Phaser.GameObjects.Text;
  private shieldIndicator!: Phaser.GameObjects.Container;
  private gameOverContainer!: Phaser.GameObjects.Container;
  private joystick!: VirtualJoystick;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Setup perspective parameters
    this.horizon = height * 0.32; // Horizon at 32% from top
    this.vanishX = width / 2;
    this.roadTopWidth = width * 0.15; // Narrow at horizon
    this.roadBottomWidth = width * 1.2; // Wide at bottom (extends past edges)

    // Reset state
    this.score = 0;
    this.coins = 0;
    this.gameTime = 0;
    this.isGameOver = false;
    this.oilSlicksRemaining = OIL_SLICK_COUNT;
    this.hasShield = false;
    this.collectibles = [];
    this.obstacles = [];
    this.oilSlicks = [];
    this.spawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.roadScrollOffset = 0;

    // Create scene layers
    this.createSkyAndHorizon(width, height);
    this.createRoad(width, height);

    // Create player (positioned in lower portion)
    const playerY = height * 0.78;
    this.player = new Player(this, width / 2, playerY);
    this.player.setScale(1.2); // Player is close, so larger

    // Create cop (starts behind/below player)
    this.cop = new Cop(this, width / 2, height + 50);
    this.cop.setScale(1.0);

    // Create UI
    this.createUI(width);
    this.createGameOverScreen(width, height);

    // Input
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.dropOilSlick());
    }
    this.joystick = new VirtualJoystick(this);
    this.createMobileOilSlickButton(width, height);

    console.log('Wheelchair Getaway - Perspective Mode');
  }

  private createSkyAndHorizon(width: number, height: number): void {
    // Sky gradient (top to horizon)
    const skyGradient = this.add.graphics();

    // Draw gradient sky
    const skyColors = [0x87CEEB, 0xB0E0E6, 0xE0F4FF]; // Light blue gradient
    const bandHeight = this.horizon / skyColors.length;

    skyColors.forEach((color, i) => {
      skyGradient.fillStyle(color, 1);
      skyGradient.fillRect(0, i * bandHeight, width, bandHeight + 1);
    });

    // Sun
    const sun = this.add.circle(width * 0.75, this.horizon * 0.4, 30, 0xFFDD44);
    sun.setAlpha(0.9);

    // Distant mountains/hills silhouette
    const hills = this.add.graphics();
    hills.fillStyle(0x6B8E6B, 1); // Muted green
    hills.beginPath();
    hills.moveTo(0, this.horizon);

    // Rolling hills
    const hillPoints = [
      { x: 0, y: this.horizon },
      { x: width * 0.15, y: this.horizon - 20 },
      { x: width * 0.3, y: this.horizon - 35 },
      { x: width * 0.45, y: this.horizon - 15 },
      { x: width * 0.6, y: this.horizon - 40 },
      { x: width * 0.75, y: this.horizon - 25 },
      { x: width * 0.9, y: this.horizon - 30 },
      { x: width, y: this.horizon - 10 },
      { x: width, y: this.horizon },
    ];

    hillPoints.forEach(p => hills.lineTo(p.x, p.y));
    hills.closePath();
    hills.fill();

    // Ground color (grass on sides of road)
    const ground = this.add.graphics();
    ground.fillStyle(0x4A7C4A, 1); // Grass green
    ground.fillRect(0, this.horizon, width, height - this.horizon);
  }

  private createRoad(_width: number, height: number): void {
    this.roadGraphics = this.add.graphics();
    this.drawRoad(height);
  }

  private drawRoad(height: number): void {
    const g = this.roadGraphics;
    g.clear();

    // Road surface (dark gray trapezoid)
    g.fillStyle(0x333333, 1);
    g.beginPath();
    g.moveTo(this.vanishX - this.roadTopWidth / 2, this.horizon);
    g.lineTo(this.vanishX + this.roadTopWidth / 2, this.horizon);
    g.lineTo(this.vanishX + this.roadBottomWidth / 2, height);
    g.lineTo(this.vanishX - this.roadBottomWidth / 2, height);
    g.closePath();
    g.fill();

    // Road edge lines (white)
    g.lineStyle(3, 0xFFFFFF, 1);
    g.beginPath();
    g.moveTo(this.vanishX - this.roadTopWidth / 2, this.horizon);
    g.lineTo(this.vanishX - this.roadBottomWidth / 2, height);
    g.stroke();

    g.beginPath();
    g.moveTo(this.vanishX + this.roadTopWidth / 2, this.horizon);
    g.lineTo(this.vanishX + this.roadBottomWidth / 2, height);
    g.stroke();

    // Center dashed line with perspective
    this.drawCenterLine(g, height);
  }

  private drawCenterLine(g: Phaser.GameObjects.Graphics, height: number): void {
    const dashLength = 40;
    const gapLength = 30;
    const totalLength = dashLength + gapLength;
    const roadLength = height - this.horizon;

    // Offset for animation
    const startOffset = this.roadScrollOffset % totalLength;

    g.lineStyle(4, 0xFFFFFF, 1);

    for (let d = -startOffset; d < roadLength; d += totalLength) {
      if (d + dashLength < 0) continue;

      const startD = Math.max(0, d);
      const endD = Math.min(roadLength, d + dashLength);

      if (startD >= endD) continue;

      // Convert distance to Y position and calculate perspective X
      const startY = this.horizon + startD;
      const endY = this.horizon + endD;

      // Lines converge at center
      g.beginPath();
      g.moveTo(this.vanishX, startY);
      g.lineTo(this.vanishX, endY);
      g.stroke();
    }
  }

  private createUI(width: number): void {
    const { height } = this.scale;
    const uiStyle = { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' };
    const shadowStyle = { ...uiStyle, color: '#000000' };

    // Score with shadow
    this.add.text(22, 22, 'SCORE: 0', shadowStyle);
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', uiStyle);

    // Coins
    this.add.text(22, 52, 'COINS: 0', { ...shadowStyle, color: '#000000', fontSize: '16px' });
    this.coinsText = this.add.text(20, 50, 'COINS: 0', { fontSize: '16px', color: '#FFD700' });

    // Cop distance
    this.copDistanceText = this.add.text(width - 20, 20, '🚔 FAR', {
      fontSize: '18px',
      color: '#66ff66',
    }).setOrigin(1, 0);

    // Oil slicks
    this.oilSlickText = this.add.text(width - 20, 50, `🛢️ x${OIL_SLICK_COUNT}`, {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(1, 0);

    // Shield indicator
    this.shieldIndicator = this.add.container(width - 50, 85);
    const shieldBg = this.add.circle(0, 0, 18, 0x00ffff, 0.3);
    const shieldText = this.add.text(0, 0, '🛡️', { fontSize: '20px' }).setOrigin(0.5);
    this.shieldIndicator.add([shieldBg, shieldText]);
    this.shieldIndicator.setVisible(false);

    // Controls hint (desktop only)
    if (!this.sys.game.device.input.touch) {
      this.add.text(width / 2, height - 30, '← → Move  |  SPACE Oil Slick', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#00000066',
        padding: { x: 10, y: 5 },
      }).setOrigin(0.5);
    }
  }

  private createMobileOilSlickButton(width: number, height: number): void {
    if (!this.sys.game.device.input.touch) return;

    const btn = this.add.circle(width - 70, height - 90, 45, 0x000000, 0.5);
    btn.setStrokeStyle(3, 0xffffff);
    btn.setInteractive();
    btn.setDepth(100);

    this.add.text(width - 70, height - 90, '🛢️', { fontSize: '32px' })
      .setOrigin(0.5).setDepth(101);

    btn.on('pointerdown', () => {
      this.dropOilSlick();
      btn.setFillStyle(0x333333);
    });
    btn.on('pointerup', () => btn.setFillStyle(0x000000, 0.5));
  }

  private createGameOverScreen(width: number, height: number): void {
    this.gameOverContainer = this.add.container(width / 2, height / 2);
    this.gameOverContainer.setDepth(200);
    this.gameOverContainer.setVisible(false);

    // Overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    this.gameOverContainer.add(overlay);

    // Game over text
    const title = this.add.text(0, -100, '🚔 BUSTED! 🚔', {
      fontSize: '42px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(title);

    // Stats
    const finalScore = this.add.text(0, -30, 'Score: 0', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
    finalScore.setName('finalScore');
    this.gameOverContainer.add(finalScore);

    const coinsText = this.add.text(0, 15, 'Coins: +0', {
      fontSize: '22px',
      color: '#FFD700',
    }).setOrigin(0.5);
    coinsText.setName('coinsText');
    this.gameOverContainer.add(coinsText);

    const timeText = this.add.text(0, 50, 'Time: 0.0s', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    timeText.setName('timeText');
    this.gameOverContainer.add(timeText);

    // Restart button
    const btn = this.add.rectangle(0, 120, 180, 50, 0x4a90d9);
    btn.setStrokeStyle(2, 0xffffff);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setFillStyle(0x6ab0f9));
    btn.on('pointerout', () => btn.setFillStyle(0x4a90d9));
    btn.on('pointerdown', () => this.scene.restart());
    this.gameOverContainer.add(btn);

    const btnText = this.add.text(0, 120, '▶ RETRY', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(btnText);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const { height } = this.scale;

    // Update time/score
    this.gameTime += delta;
    this.score = Math.floor(this.gameTime);
    this.scoreText.setText(`SCORE: ${this.score.toLocaleString()}`);

    // Scroll road
    this.roadScrollOffset += (this.roadScrollSpeed * delta) / 1000;
    this.drawRoad(height);

    // Spawn collectibles
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

    // Update game objects with perspective
    this.updateCollectibles(delta);
    this.updateObstacles(delta);
    this.updateOilSlicks(delta);

    // Update player
    this.player.update(this.joystick.getForceX(), this.joystick.getForceY());
    this.constrainToRoad(this.player, height);

    // Update cop (chase player)
    this.updateCop(delta);

    // Check catch
    const copDist = this.cop.distanceTo(this.player.x, this.player.y);
    this.updateCopDistanceUI(copDist);

    if (copDist < CATCH_DISTANCE) {
      this.onCaught();
    }
  }

  private constrainToRoad(obj: Phaser.GameObjects.Container, height: number): void {
    // Calculate road edges at object's Y position
    const t = (obj.y - this.horizon) / (height - this.horizon);
    const roadWidth = Phaser.Math.Linear(this.roadTopWidth, this.roadBottomWidth, t);
    const leftEdge = this.vanishX - roadWidth / 2 + 40;
    const rightEdge = this.vanishX + roadWidth / 2 - 40;

    obj.x = Phaser.Math.Clamp(obj.x, leftEdge, rightEdge);
  }

  private getScaleForY(y: number, height: number): number {
    // Scale from 0.3 at horizon to 1.2 at bottom
    const t = (y - this.horizon) / (height - this.horizon);
    return Phaser.Math.Linear(0.3, 1.2, Math.max(0, Math.min(1, t)));
  }

  private getSpeedMultiplierForY(y: number, height: number): number {
    // Objects accelerate as they approach (perspective effect)
    const t = (y - this.horizon) / (height - this.horizon);
    return Phaser.Math.Linear(0.5, 2.0, Math.max(0, Math.min(1, t)));
  }

  private getRoadXForY(normalizedX: number, y: number, height: number): number {
    // Convert a normalized X (-1 to 1) to actual X based on road width at Y
    const t = (y - this.horizon) / (height - this.horizon);
    const roadWidth = Phaser.Math.Linear(this.roadTopWidth, this.roadBottomWidth, t);
    return this.vanishX + normalizedX * (roadWidth / 2 - 30);
  }

  private spawnCollectible(): void {
    const { height } = this.scale;

    // Random lane position (-0.7 to 0.7)
    const laneX = Phaser.Math.FloatBetween(-0.7, 0.7);

    // Spawn at horizon
    const spawnY = this.horizon + 10;
    const actualX = this.getRoadXForY(laneX, spawnY, height);

    // Random type
    const rand = Math.random();
    let type: CollectibleType;
    if (rand < 0.45) type = 'coin';
    else if (rand < 0.75) type = 'boost';
    else type = 'shield';

    const c = new Collectible(this, actualX, spawnY, type);
    c.setScale(this.getScaleForY(spawnY, height));
    c.setData('laneX', laneX);
    this.collectibles.push(c);
  }

  private updateCollectibles(delta: number): void {
    const { height } = this.scale;
    const baseSpeed = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];

      // Move with perspective acceleration
      const speedMult = this.getSpeedMultiplierForY(c.y, height);
      c.y += baseSpeed * speedMult;

      // Update scale based on Y
      c.setScale(this.getScaleForY(c.y, height));

      // Update X to follow road perspective
      const laneX = c.getData('laneX') as number;
      c.x = this.getRoadXForY(laneX, c.y, height);

      // Check collection
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < 50) {
        this.onCollect(c);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Remove if past bottom
      if (c.y > height + 50) {
        c.destroy();
        this.collectibles.splice(i, 1);
      }
    }
  }

  private onCollect(c: Collectible): void {
    switch (c.collectibleType) {
      case 'coin':
        this.coins++;
        this.coinsText.setText(`COINS: ${this.coins}`);
        break;
      case 'boost':
        this.player.applyBoost(2.5, 2500);
        // Push cop back
        this.cop.y += 80;
        break;
      case 'shield':
        this.hasShield = true;
        this.shieldIndicator.setVisible(true);
        break;
    }
    c.collect();
  }

  private spawnObstacle(): void {
    const { height } = this.scale;

    const laneX = Phaser.Math.FloatBetween(-0.6, 0.6);
    const spawnY = this.horizon + 10;
    const actualX = this.getRoadXForY(laneX, spawnY, height);

    const types: ObstacleType[] = ['pothole', 'cone', 'puddle'];
    const type = types[Phaser.Math.Between(0, 2)];

    const o = new Obstacle(this, actualX, spawnY, type);
    o.setScale(this.getScaleForY(spawnY, height));
    o.setData('laneX', laneX);
    this.obstacles.push(o);
  }

  private updateObstacles(delta: number): void {
    const { height } = this.scale;
    const baseSpeed = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];

      const speedMult = this.getSpeedMultiplierForY(o.y, height);
      o.y += baseSpeed * speedMult;
      o.setScale(this.getScaleForY(o.y, height));

      const laneX = o.getData('laneX') as number;
      o.x = this.getRoadXForY(laneX, o.y, height);

      // Check collision
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, o.x, o.y);
      if (dist < 45 && !this.player.isSlowed && !this.player.isBoosting) {
        this.player.applySlowdown(o.slowdownAmount, o.slowdownDuration);
        o.onHit();
      }

      if (o.y > height + 50) {
        o.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  private dropOilSlick(): void {
    if (this.oilSlicksRemaining <= 0 || this.isGameOver) return;

    this.oilSlicksRemaining--;
    this.oilSlickText.setText(`🛢️ x${this.oilSlicksRemaining}`);

    const graphic = this.add.ellipse(this.player.x, this.player.y + 30, 50, 25, 0x111111, 0.9);
    graphic.setStrokeStyle(2, 0x333333);

    this.oilSlicks.push({
      x: this.player.x,
      y: this.player.y + 30,
      graphic,
    });
  }

  private updateOilSlicks(delta: number): void {
    const { height } = this.scale;
    const baseSpeed = (this.roadScrollSpeed * delta) / 1000;

    for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
      const oil = this.oilSlicks[i];

      // Oil slicks stay relative to road (scroll down)
      const speedMult = this.getSpeedMultiplierForY(oil.y, height);
      oil.y += baseSpeed * speedMult;
      oil.graphic.y = oil.y;

      // Scale with perspective
      const scale = this.getScaleForY(oil.y, height);
      oil.graphic.setScale(scale);

      // Check if cop hits it
      const copDist = Phaser.Math.Distance.Between(this.cop.x, this.cop.y, oil.x, oil.y);
      if (copDist < 50 && !this.cop.isStunned) {
        this.cop.stun(OIL_SLICK_STUN_DURATION);
        oil.graphic.destroy();
        this.oilSlicks.splice(i, 1);
        continue;
      }

      if (oil.y > height + 100) {
        oil.graphic.destroy();
        this.oilSlicks.splice(i, 1);
      }
    }
  }

  private updateCop(delta: number): void {
    const { height } = this.scale;

    // Cop chases player
    this.cop.update(delta, this.player.x, this.player.y, this.gameTime);

    // Constrain cop to road
    this.constrainToRoad(this.cop, height);

    // Scale cop based on Y
    this.cop.setScale(this.getScaleForY(this.cop.y, height));

    // Keep cop at bottom portion of screen when not stunned
    if (!this.cop.isStunned) {
      // Cop tries to stay close behind player
      const targetY = Math.min(height + 20, this.player.y + STARTING_DISTANCE * 0.3);
      this.cop.y = Phaser.Math.Linear(this.cop.y, targetY, 0.02);
    }
  }

  private updateCopDistanceUI(dist: number): void {
    let status: string;
    let color: string;

    if (dist < 80) {
      status = '🚔 DANGER!';
      color = '#ff0000';
    } else if (dist < 150) {
      status = '🚔 CLOSE!';
      color = '#ffaa00';
    } else {
      status = '🚔 FAR';
      color = '#66ff66';
    }

    this.copDistanceText.setText(status);
    this.copDistanceText.setColor(color);
  }

  private onCaught(): void {
    if (this.isGameOver) return;

    if (this.hasShield) {
      this.hasShield = false;
      this.shieldIndicator.setVisible(false);
      this.cop.y += 120;
      return;
    }

    this.isGameOver = true;
    this.player.getBody().setVelocity(0);
    this.cop.getBody().setVelocity(0);

    // Update game over screen
    const finalScore = this.gameOverContainer.getByName('finalScore') as Phaser.GameObjects.Text;
    finalScore?.setText(`Score: ${this.score.toLocaleString()}`);

    const coinsText = this.gameOverContainer.getByName('coinsText') as Phaser.GameObjects.Text;
    coinsText?.setText(`Coins: +${this.coins}`);

    const timeText = this.gameOverContainer.getByName('timeText') as Phaser.GameObjects.Text;
    timeText?.setText(`Time: ${(this.gameTime / 1000).toFixed(1)}s`);

    this.gameOverContainer.setVisible(true);
  }
}
