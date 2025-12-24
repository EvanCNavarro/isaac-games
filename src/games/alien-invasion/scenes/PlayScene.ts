import Phaser from 'phaser';
import {
  FOV,
  NUM_RAYS,
  MAX_DEPTH,
  TILE_SIZE,
  PLAYER_SPEED,
  PLAYER_ROT_SPEED,
  PLAYER_MAX_HEALTH,
  COLORS,
  ALIEN_HEALTH,
  ALIEN_DAMAGE,
  ALIEN_SPEED,
  BOSS_HEALTH,
  BOSS_DAMAGE,
  ALIENS_PER_WAVE,
  WAVES_BEFORE_BOSS,
} from '../config/gameConfig';
import { MobileControls } from '../ui/MobileControls';

interface Alien {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isBoss: boolean;
  angle: number;
  distance: number;
  screenX: number;
  visible: boolean;
}

interface Weapon {
  name: string;
  emoji: string;
  damage: number;
  fireRate: number;
  ammo: number;
  maxAmmo: number;
}

interface WeaponPickup {
  x: number;
  y: number;
  weapon: Weapon;
  angle: number;
  distance: number;
  screenX: number;
  visible: boolean;
  bobOffset: number;
}

/**
 * Alien Invasion Play Scene
 * DOOM-style first person shooter with raycasting
 */
export class PlayScene extends Phaser.Scene {
  // Map - 1 = wall, 0 = empty
  private map: number[][] = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  // Player
  private playerX: number = 0;
  private playerY: number = 0;
  private playerAngle: number = 0;
  private playerHealth: number = PLAYER_MAX_HEALTH;

  // Weapons
  private weapons: Weapon[] = [];
  private currentWeaponIndex: number = 0;
  private lastFireTime: number = 0;

  // Aliens
  private aliens: Alien[] = [];
  private wave: number = 1;
  private survivors: number = 0;
  private aliensKilledThisWave: number = 0;

  // Portal spawn location (top-right corner)
  private portalX: number = 0;
  private portalY: number = 0;

  // Weapon pickups on the ground
  private weaponPickups: WeaponPickup[] = [];

  // Graphics
  private gameGraphics!: Phaser.GameObjects.Graphics;
  private rayDistances: number[] = [];

  // UI
  private healthText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private survivorsText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private crosshair!: Phaser.GameObjects.Container;
  private damageOverlay!: Phaser.GameObjects.Rectangle;

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private mobileControls!: MobileControls;

  // Game state
  private isGameOver: boolean = false;
  private gameOverContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'AI_PlayScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Reset state
    this.playerX = TILE_SIZE * 2.5;  // Start in bottom-left area
    this.playerY = TILE_SIZE * 9.5;
    this.playerAngle = -Math.PI / 4;  // Face towards center/portal
    this.playerHealth = PLAYER_MAX_HEALTH;
    this.wave = 1;
    this.survivors = 0;
    this.aliensKilledThisWave = 0;
    this.isGameOver = false;
    this.aliens = [];
    this.rayDistances = [];
    this.weaponPickups = [];

    // Portal location (top-right corner)
    this.portalX = TILE_SIZE * 9.5;
    this.portalY = TILE_SIZE * 1.5;

    // Initialize weapons (start with pistol only)
    this.weapons = [
      { name: 'Pistol', emoji: '🔫', damage: 20, fireRate: 400, ammo: Infinity, maxAmmo: Infinity },
    ];
    this.currentWeaponIndex = 0;
    this.lastFireTime = 0;

    // Spawn initial weapon pickups around the map
    this.spawnWeaponPickups();

    // Create graphics object for raycasting
    this.gameGraphics = this.add.graphics();

    // Create UI
    this.createUI(width, height);

    // Create crosshair
    this.createCrosshair(width, height);

    // Create damage overlay
    this.damageOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0);
    this.damageOverlay.setDepth(40);

    // Setup keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };
    }

    // Setup mobile controls (joystick + shoot button)
    this.mobileControls = new MobileControls(this);

    // Desktop shooting (only if not touch device)
    if (!this.sys.game.device.input.touch) {
      this.input.on('pointerdown', () => {
        this.shoot();
      });
    }

    // Create game over screen
    this.createGameOverScreen(width, height);

    // Spawn first wave
    this.spawnWave();

    console.log('Alien Invasion started! WASD to move, Arrow keys to turn, Click to shoot.');
  }

  private createUI(width: number, height: number): void {
    // Health
    this.healthText = this.add.text(20, height - 80, `❤️ ${this.playerHealth}`, {
      fontSize: '20px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setDepth(50);

    // Ammo
    this.ammoText = this.add.text(20, height - 50, '🔫 ∞', {
      fontSize: '18px',
      color: '#ffff44',
    }).setDepth(50);

    // Wave
    this.waveText = this.add.text(width / 2, 20, `WAVE ${this.wave}`, {
      fontSize: '24px',
      color: '#22ff22',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(50);

    // Survivors rescued
    this.survivorsText = this.add.text(width - 20, 20, `🧑 ${this.survivors}`, {
      fontSize: '20px',
      color: '#44aaff',
    }).setOrigin(1, 0).setDepth(50);

    // Current weapon
    this.weaponText = this.add.text(width / 2, height - 60, '🔫 Pistol', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(50);

    // Back button
    const backBtn = this.add.text(20, 20, '← Menu', {
      fontSize: '14px',
      color: '#666666',
    }).setInteractive({ useHandCursor: true }).setDepth(50);

    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#666666'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createCrosshair(width: number, height: number): void {
    this.crosshair = this.add.container(width / 2, height / 2);
    this.crosshair.setDepth(45);

    const size = 15;
    const thickness = 2;
    const gap = 4;

    // Crosshair lines
    const top = this.add.rectangle(0, -gap - size / 2, thickness, size, 0x22ff22);
    const bottom = this.add.rectangle(0, gap + size / 2, thickness, size, 0x22ff22);
    const left = this.add.rectangle(-gap - size / 2, 0, size, thickness, 0x22ff22);
    const right = this.add.rectangle(gap + size / 2, 0, size, thickness, 0x22ff22);

    this.crosshair.add([top, bottom, left, right]);
  }

  private createGameOverScreen(width: number, height: number): void {
    this.gameOverContainer = this.add.container(width / 2, height / 2);
    this.gameOverContainer.setVisible(false);
    this.gameOverContainer.setDepth(100);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    this.gameOverContainer.add(overlay);

    const gameOverText = this.add.text(0, -100, 'MISSION FAILED', {
      fontSize: '36px',
      color: '#ff2222',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(gameOverText);

    const statsText = this.add.text(0, -30, '', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    statsText.setName('stats');
    this.gameOverContainer.add(statsText);

    // Retry button
    const retryBtn = this.add.rectangle(0, 60, 180, 45, 0x22aa22);
    retryBtn.setStrokeStyle(2, 0x44ff44);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x33cc33));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x22aa22));
    retryBtn.on('pointerdown', () => this.scene.restart());
    this.gameOverContainer.add(retryBtn);

    const retryText = this.add.text(0, 60, 'TRY AGAIN', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(retryText);

    // Menu button
    const menuBtn = this.add.rectangle(0, 120, 180, 45, 0x4444aa);
    menuBtn.setStrokeStyle(2, 0x6666ff);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x5555cc));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x4444aa));
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    this.gameOverContainer.add(menuBtn);

    const menuText = this.add.text(0, 120, 'MAIN MENU', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverContainer.add(menuText);
  }

  private spawnWave(): void {
    const isBossWave = this.wave % WAVES_BEFORE_BOSS === 0;
    const alienCount = isBossWave ? 1 : ALIENS_PER_WAVE + Math.floor(this.wave / 2);

    // Show wave announcement
    const { width, height } = this.scale;
    const waveAnnounce = this.add.text(width / 2, height / 2,
      isBossWave ? '⚠️ BOSS WAVE ⚠️' : `WAVE ${this.wave}`, {
      fontSize: isBossWave ? '32px' : '28px',
      color: isBossWave ? '#ff2222' : '#22ff22',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: waveAnnounce,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1500,
      onComplete: () => waveAnnounce.destroy(),
    });

    // Show portal warning
    const portalWarning = this.add.text(width / 2, height / 2 + 40,
      '🌀 PORTAL OPENING... 🌀', {
      fontSize: '16px',
      color: '#aa44ff',
    }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: portalWarning,
      alpha: 0,
      duration: 2000,
      onComplete: () => portalWarning.destroy(),
    });

    // Spawn aliens from the portal (top-right corner) with slight spread
    for (let i = 0; i < alienCount; i++) {
      // Stagger spawn with slight delay effect (spread around portal)
      const offsetX = Phaser.Math.Between(-30, 30);
      const offsetY = Phaser.Math.Between(-30, 30);

      const isBoss = isBossWave;
      this.aliens.push({
        x: this.portalX + offsetX,
        y: this.portalY + offsetY,
        health: isBoss ? BOSS_HEALTH : ALIEN_HEALTH,
        maxHealth: isBoss ? BOSS_HEALTH : ALIEN_HEALTH,
        isBoss,
        angle: 0,
        distance: 0,
        screenX: 0,
        visible: false,
      });
    }

    this.waveText.setText(isBossWave ? '⚠️ BOSS' : `WAVE ${this.wave}`);
    this.aliensKilledThisWave = 0;
  }

  private spawnWeaponPickups(): void {
    // Define weapon pickup locations around the map
    const pickupLocations = [
      { x: 5.5, y: 2.5 },   // Top center
      { x: 1.5, y: 5.5 },   // Left middle
      { x: 9.5, y: 5.5 },   // Right middle
      { x: 5.5, y: 9.5 },   // Bottom center
    ];

    // Available weapons to spawn
    const weaponTypes: Weapon[] = [
      { name: 'Shotgun', emoji: '🔫', damage: 45, fireRate: 600, ammo: 12, maxAmmo: 12 },
      { name: 'Plasma', emoji: '⚡', damage: 35, fireRate: 150, ammo: 40, maxAmmo: 40 },
      { name: 'Rocket', emoji: '🚀', damage: 80, fireRate: 1000, ammo: 6, maxAmmo: 6 },
    ];

    // Spawn weapons at locations
    pickupLocations.forEach((loc, index) => {
      const weapon = weaponTypes[index % weaponTypes.length];
      this.weaponPickups.push({
        x: loc.x * TILE_SIZE,
        y: loc.y * TILE_SIZE,
        weapon: { ...weapon },  // Clone weapon
        angle: 0,
        distance: 0,
        screenX: 0,
        visible: false,
        bobOffset: Math.random() * Math.PI * 2,  // Random start phase for bobbing
      });
    });
  }

  private distanceToPlayer(x: number, y: number): number {
    return Math.sqrt((x - this.playerX) ** 2 + (y - this.playerY) ** 2);
  }

  private isWall(x: number, y: number): boolean {
    const mapX = Math.floor(x / TILE_SIZE);
    const mapY = Math.floor(y / TILE_SIZE);
    if (mapY < 0 || mapY >= this.map.length || mapX < 0 || mapX >= this.map[0].length) {
      return true;
    }
    return this.map[mapY][mapX] === 1;
  }

  update(time: number, _delta: number): void {
    if (this.isGameOver) return;

    // Handle input
    this.handleInput();

    // Update aliens
    this.updateAliens();

    // Update weapon pickups (check collection)
    this.updateWeaponPickups(time);

    // Render the 3D view
    this.render3D();

    // Render portal
    this.renderPortal(time);

    // Render weapon pickups
    this.renderWeaponPickups(time);

    // Render aliens on top
    this.renderAliens();

    // Check wave complete
    if (this.aliens.length === 0) {
      this.wave++;
      this.time.delayedCall(1000, () => this.spawnWave());
    }
  }

  private updateWeaponPickups(_time: number): void {
    const pickupRadius = TILE_SIZE * 0.6;

    for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
      const pickup = this.weaponPickups[i];

      // Calculate distance to player
      const dist = this.distanceToPlayer(pickup.x, pickup.y);

      // Check if player is close enough to collect
      if (dist < pickupRadius) {
        this.collectWeapon(pickup);
        this.weaponPickups.splice(i, 1);
      }
    }
  }

  private collectWeapon(pickup: WeaponPickup): void {
    // Add weapon to inventory
    this.weapons.push(pickup.weapon);
    this.currentWeaponIndex = this.weapons.length - 1;

    // Update UI
    const weapon = pickup.weapon;
    this.weaponText.setText(`${weapon.emoji} ${weapon.name}`);
    this.ammoText.setText(`${weapon.emoji} ${weapon.ammo}`);

    // Show pickup message
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height * 0.3,
      `⬆️ ${weapon.name.toUpperCase()} ⬆️`, {
      fontSize: '24px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(70);

    this.tweens.add({
      targets: msg,
      y: msg.y - 50,
      alpha: 0,
      scale: 1.3,
      duration: 1500,
      onComplete: () => msg.destroy(),
    });
  }

  private renderPortal(time: number): void {
    const { width, height } = this.scale;

    // Calculate portal position relative to player
    const dx = this.portalX - this.playerX;
    const dy = this.portalY - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Calculate relative angle to player view
    let relativeAngle = angle - this.playerAngle;
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    // Check if in FOV
    if (Math.abs(relativeAngle) > FOV / 2 + 0.3) return;

    // Check if behind wall
    const screenX = width / 2 + (relativeAngle / FOV) * width;
    const rayIndex = Math.floor((screenX / width) * NUM_RAYS);
    if (rayIndex >= 0 && rayIndex < this.rayDistances.length) {
      if (dist > this.rayDistances[rayIndex]) return;
    }

    // Draw portal (swirling effect)
    const portalSize = Math.min((TILE_SIZE * height * 1.2) / dist, height * 0.5);
    const portalY = height / 2;

    // Swirling colors
    const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;
    const colors = [0x8800ff, 0xaa22ff, 0x6600cc];
    const colorIndex = Math.floor((time * 0.003) % colors.length);

    this.gameGraphics.fillStyle(colors[colorIndex], pulse * 0.6);
    this.gameGraphics.fillCircle(screenX, portalY, portalSize * 0.5);

    this.gameGraphics.fillStyle(0xffffff, pulse * 0.3);
    this.gameGraphics.fillCircle(screenX, portalY, portalSize * 0.3);

    // Inner swirl
    this.gameGraphics.fillStyle(0x000000, 0.8);
    this.gameGraphics.fillCircle(screenX, portalY, portalSize * 0.15);
  }

  private renderWeaponPickups(time: number): void {
    const { width, height } = this.scale;

    for (const pickup of this.weaponPickups) {
      // Calculate position relative to player
      const dx = pickup.x - this.playerX;
      const dy = pickup.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Calculate relative angle to player view
      let relativeAngle = angle - this.playerAngle;
      while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
      while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

      // Check if in FOV
      if (Math.abs(relativeAngle) > FOV / 2 + 0.2) {
        pickup.visible = false;
        continue;
      }

      // Calculate screen position
      pickup.screenX = width / 2 + (relativeAngle / FOV) * width;
      pickup.distance = dist;

      // Check if behind wall
      const rayIndex = Math.floor((pickup.screenX / width) * NUM_RAYS);
      if (rayIndex >= 0 && rayIndex < this.rayDistances.length) {
        if (dist > this.rayDistances[rayIndex]) {
          pickup.visible = false;
          continue;
        }
      }

      pickup.visible = true;

      // Calculate size and position
      const pickupSize = Math.min((TILE_SIZE * height * 0.8) / dist, height * 0.3);
      const bobAmount = Math.sin(time * 0.004 + pickup.bobOffset) * 10;
      const pickupY = height / 2 + pickupSize * 0.3 + bobAmount;

      // Draw glowing pickup box
      const glowPulse = Math.sin(time * 0.006) * 0.3 + 0.7;

      // Outer glow
      this.gameGraphics.fillStyle(0xffff00, glowPulse * 0.3);
      this.gameGraphics.fillCircle(pickup.screenX, pickupY, pickupSize * 0.6);

      // Box
      this.gameGraphics.fillStyle(0x444400, 0.9);
      this.gameGraphics.fillRect(
        pickup.screenX - pickupSize * 0.3,
        pickupY - pickupSize * 0.2,
        pickupSize * 0.6,
        pickupSize * 0.4
      );

      // Weapon icon highlight
      this.gameGraphics.fillStyle(0xffff00, 0.8);
      this.gameGraphics.fillRect(
        pickup.screenX - pickupSize * 0.25,
        pickupY - pickupSize * 0.15,
        pickupSize * 0.5,
        pickupSize * 0.3
      );
    }
  }

  private handleInput(): void {
    let moveX = 0;
    let moveY = 0;

    // Check for mobile controls first
    if (this.mobileControls.isActive()) {
      // Mobile: Joystick for movement + turning
      const forward = this.mobileControls.moveForward;
      const turn = this.mobileControls.turnAmount;

      // Forward/backward movement
      if (Math.abs(forward) > 0.15) {
        moveX += Math.cos(this.playerAngle) * PLAYER_SPEED * forward;
        moveY += Math.sin(this.playerAngle) * PLAYER_SPEED * forward;
      }

      // Turning (joystick left/right = turn)
      if (Math.abs(turn) > 0.15) {
        this.playerAngle += turn * PLAYER_ROT_SPEED * 1.5;
      }

      // Check shoot - auto-aim at closest visible alien
      if (this.mobileControls.shootRequested) {
        this.shootWithAutoAim();
      }

      // Reset frame-specific values
      this.mobileControls.resetFrame();
    } else {
      // Desktop: Keyboard controls
      // Forward/backward (W/S or Up/Down)
      if (this.wasd?.W?.isDown || this.cursors?.up?.isDown) {
        moveX = Math.cos(this.playerAngle) * PLAYER_SPEED;
        moveY = Math.sin(this.playerAngle) * PLAYER_SPEED;
      }
      if (this.wasd?.S?.isDown || this.cursors?.down?.isDown) {
        moveX = -Math.cos(this.playerAngle) * PLAYER_SPEED;
        moveY = -Math.sin(this.playerAngle) * PLAYER_SPEED;
      }

      // Strafe (A/D)
      if (this.wasd?.A?.isDown) {
        moveX += Math.cos(this.playerAngle - Math.PI / 2) * PLAYER_SPEED;
        moveY += Math.sin(this.playerAngle - Math.PI / 2) * PLAYER_SPEED;
      }
      if (this.wasd?.D?.isDown) {
        moveX += Math.cos(this.playerAngle + Math.PI / 2) * PLAYER_SPEED;
        moveY += Math.sin(this.playerAngle + Math.PI / 2) * PLAYER_SPEED;
      }

      // Turn (Left/Right arrows)
      if (this.cursors?.left?.isDown) {
        this.playerAngle -= PLAYER_ROT_SPEED;
      }
      if (this.cursors?.right?.isDown) {
        this.playerAngle += PLAYER_ROT_SPEED;
      }
    }

    // Apply movement with collision
    const newX = this.playerX + moveX;
    const newY = this.playerY + moveY;

    if (!this.isWall(newX, this.playerY)) {
      this.playerX = newX;
    }
    if (!this.isWall(this.playerX, newY)) {
      this.playerY = newY;
    }
  }

  /**
   * Mobile auto-aim: Shoots the closest visible alien
   */
  private shootWithAutoAim(): void {
    const now = this.time.now;
    const weapon = this.weapons[this.currentWeaponIndex];

    if (now - this.lastFireTime < weapon.fireRate) return;

    this.lastFireTime = now;

    // Find closest visible alien
    let closestAlien: Alien | null = null;
    let closestDist = Infinity;

    for (const alien of this.aliens) {
      if (alien.visible && alien.distance < closestDist) {
        closestDist = alien.distance;
        closestAlien = alien;
      }
    }

    // Muzzle flash
    const { width, height } = this.scale;
    const flash = this.add.circle(width / 2, height - 100, 35, 0xffff00, 0.9);
    flash.setDepth(55);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 80,
      onComplete: () => flash.destroy(),
    });

    if (closestAlien) {
      // HIT! Apply damage
      closestAlien.health -= weapon.damage;

      // Show hit marker at alien's screen position
      const hitMarker = this.add.text(closestAlien.screenX, height * 0.4, '✖', {
        fontSize: '32px',
        color: '#ff0000',
      }).setOrigin(0.5).setDepth(60);

      this.tweens.add({
        targets: hitMarker,
        y: hitMarker.y - 30,
        alpha: 0,
        scale: 1.5,
        duration: 300,
        onComplete: () => hitMarker.destroy(),
      });

      // Damage number
      const dmgText = this.add.text(closestAlien.screenX, height * 0.35, `-${weapon.damage}`, {
        fontSize: '20px',
        color: '#ffff00',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(60);

      this.tweens.add({
        targets: dmgText,
        y: dmgText.y - 40,
        alpha: 0,
        duration: 500,
        onComplete: () => dmgText.destroy(),
      });

      // Check if killed
      if (closestAlien.health <= 0) {
        this.onAlienKilled(closestAlien);
      }
    } else {
      // Miss - show miss indicator
      const missText = this.add.text(width / 2, height / 2, 'MISS', {
        fontSize: '18px',
        color: '#888888',
      }).setOrigin(0.5).setDepth(60);

      this.tweens.add({
        targets: missText,
        y: missText.y - 20,
        alpha: 0,
        duration: 400,
        onComplete: () => missText.destroy(),
      });
    }
  }

  private shoot(): void {
    const now = this.time.now;
    const weapon = this.weapons[this.currentWeaponIndex];

    if (now - this.lastFireTime < weapon.fireRate) return;
    if (weapon.ammo !== Infinity && weapon.ammo <= 0) return;

    this.lastFireTime = now;
    if (weapon.ammo !== Infinity) {
      weapon.ammo--;
      this.ammoText.setText(`${weapon.emoji} ${weapon.ammo}`);
    }

    // Flash crosshair
    this.tweens.add({
      targets: this.crosshair,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 50,
      yoyo: true,
    });

    // Muzzle flash effect
    const { width, height } = this.scale;
    const flash = this.add.circle(width / 2, height - 100, 30, 0xffff00, 0.8);
    flash.setDepth(55);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Check if hit an alien (center of screen)
    let closestAlien: Alien | null = null;
    let closestDist = Infinity;

    for (const alien of this.aliens) {
      if (!alien.visible) continue;

      // Check if alien is near center of screen
      const screenCenter = this.scale.width / 2;
      const alienWidth = alien.isBoss ? 80 : 50;

      if (Math.abs(alien.screenX - screenCenter) < alienWidth) {
        if (alien.distance < closestDist) {
          closestDist = alien.distance;
          closestAlien = alien;
        }
      }
    }

    if (closestAlien) {
      closestAlien.health -= weapon.damage;

      // Hit indicator
      const hitText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 30, 'HIT!', {
        fontSize: '16px',
        color: '#ff4444',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(60);

      this.tweens.add({
        targets: hitText,
        y: hitText.y - 20,
        alpha: 0,
        duration: 300,
        onComplete: () => hitText.destroy(),
      });

      if (closestAlien.health <= 0) {
        this.onAlienKilled(closestAlien);
      }
    }
  }

  private onAlienKilled(alien: Alien): void {
    // Remove from array
    const index = this.aliens.indexOf(alien);
    if (index > -1) {
      this.aliens.splice(index, 1);
    }

    // Rescue a survivor!
    this.survivors++;
    this.survivorsText.setText(`🧑 ${this.survivors}`);

    // Show rescue message
    const msg = this.add.text(this.scale.width / 2, this.scale.height / 2 - 60,
      alien.isBoss ? '🏆 BOSS DEFEATED! 🏆' : '🧑 Survivor Rescued!', {
        fontSize: alien.isBoss ? '24px' : '18px',
        color: '#44aaff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: msg,
      y: msg.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => msg.destroy(),
    });

    // Chance to drop weapon
    if (Math.random() < 0.3 && this.weapons.length < 3) {
      this.dropWeapon();
    }

    this.aliensKilledThisWave++;
  }

  private dropWeapon(): void {
    const newWeapons = [
      { name: 'Shotgun', emoji: '🔫', damage: 45, fireRate: 700, ammo: 15, maxAmmo: 15 },
      { name: 'Plasma', emoji: '⚡', damage: 30, fireRate: 200, ammo: 50, maxAmmo: 50 },
    ];

    const weapon = newWeapons[Phaser.Math.Between(0, newWeapons.length - 1)];
    this.weapons.push(weapon);
    this.currentWeaponIndex = this.weapons.length - 1;
    this.weaponText.setText(`${weapon.emoji} ${weapon.name}`);
    this.ammoText.setText(`${weapon.emoji} ${weapon.ammo}`);

    const msg = this.add.text(this.scale.width / 2, this.scale.height - 120,
      `NEW WEAPON: ${weapon.name}!`, {
        fontSize: '18px',
        color: '#ffff44',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 2000,
      onComplete: () => msg.destroy(),
    });
  }

  private updateAliens(): void {
    for (const alien of this.aliens) {
      // Move towards player
      const dx = this.playerX - alien.x;
      const dy = this.playerY - alien.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > TILE_SIZE * 0.8) {
        const speed = alien.isBoss ? ALIEN_SPEED * 0.7 : ALIEN_SPEED;
        const moveX = (dx / dist) * speed;
        const moveY = (dy / dist) * speed;

        const newX = alien.x + moveX;
        const newY = alien.y + moveY;

        if (!this.isWall(newX, alien.y)) alien.x = newX;
        if (!this.isWall(alien.x, newY)) alien.y = newY;
      }

      // Calculate angle and distance to player
      alien.angle = Math.atan2(dy, dx);
      alien.distance = dist;

      // Attack if close
      if (dist < TILE_SIZE * 0.8) {
        this.takeDamage(alien.isBoss ? BOSS_DAMAGE : ALIEN_DAMAGE);
      }
    }
  }

  private takeDamage(amount: number): void {
    this.playerHealth -= amount;
    this.healthText.setText(`❤️ ${Math.max(0, this.playerHealth)}`);

    // Damage flash
    this.damageOverlay.setAlpha(0.4);
    this.tweens.add({
      targets: this.damageOverlay,
      alpha: 0,
      duration: 200,
    });

    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.isGameOver = true;

    const stats = this.gameOverContainer.getByName('stats') as Phaser.GameObjects.Text;
    if (stats) {
      stats.setText(
        `Waves Survived: ${this.wave - 1}\n` +
        `Survivors Rescued: ${this.survivors}\n` +
        `Weapons Collected: ${this.weapons.length}`
      );
    }

    this.gameOverContainer.setVisible(true);
  }

  private render3D(): void {
    const { width, height } = this.scale;
    this.gameGraphics.clear();

    // Sky
    this.gameGraphics.fillStyle(COLORS.SKY);
    this.gameGraphics.fillRect(0, 0, width, height / 2);

    // Floor
    this.gameGraphics.fillStyle(COLORS.FLOOR);
    this.gameGraphics.fillRect(0, height / 2, width, height / 2);

    // Raycasting
    this.rayDistances = [];
    const rayWidth = width / NUM_RAYS;

    for (let i = 0; i < NUM_RAYS; i++) {
      const rayAngle = this.playerAngle - FOV / 2 + (i / NUM_RAYS) * FOV;
      const { distance, hitVertical } = this.castRay(rayAngle);

      // Fix fisheye
      const correctedDist = distance * Math.cos(rayAngle - this.playerAngle);
      this.rayDistances.push(correctedDist);

      // Calculate wall height
      const wallHeight = Math.min((TILE_SIZE * height) / correctedDist, height);
      const wallTop = (height - wallHeight) / 2;

      // Wall color (darker if vertical hit for depth)
      const shade = Math.max(0.2, 1 - correctedDist / (MAX_DEPTH * TILE_SIZE));
      const baseColor = hitVertical ? COLORS.WALL_DARK : COLORS.WALL_LIGHT;
      const r = ((baseColor >> 16) & 0xff) * shade;
      const g = ((baseColor >> 8) & 0xff) * shade;
      const b = (baseColor & 0xff) * shade;
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);

      this.gameGraphics.fillStyle(color);
      this.gameGraphics.fillRect(i * rayWidth, wallTop, rayWidth + 1, wallHeight);
    }
  }

  private castRay(angle: number): { distance: number; hitVertical: boolean } {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Check each step along the ray
    for (let depth = 0; depth < MAX_DEPTH * TILE_SIZE; depth += 2) {
      const x = this.playerX + cos * depth;
      const y = this.playerY + sin * depth;

      if (this.isWall(x, y)) {
        // Determine if vertical or horizontal hit
        const hitVertical = Math.abs(x % TILE_SIZE - TILE_SIZE / 2) < Math.abs(y % TILE_SIZE - TILE_SIZE / 2);
        return { distance: depth, hitVertical };
      }
    }

    return { distance: MAX_DEPTH * TILE_SIZE, hitVertical: false };
  }

  private renderAliens(): void {
    const { width, height } = this.scale;

    // Sort aliens by distance (far to near)
    const sortedAliens = [...this.aliens].sort((a, b) => b.distance - a.distance);

    for (const alien of sortedAliens) {
      // Calculate angle relative to player view
      let relativeAngle = alien.angle - this.playerAngle;

      // Normalize angle
      while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
      while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

      // Check if in FOV
      if (Math.abs(relativeAngle) > FOV / 2 + 0.2) {
        alien.visible = false;
        continue;
      }

      // Calculate screen position
      alien.screenX = width / 2 + (relativeAngle / FOV) * width;

      // Check if behind wall
      const rayIndex = Math.floor((alien.screenX / width) * NUM_RAYS);
      if (rayIndex >= 0 && rayIndex < this.rayDistances.length) {
        if (alien.distance > this.rayDistances[rayIndex]) {
          alien.visible = false;
          continue;
        }
      }

      alien.visible = true;

      // Calculate sprite size based on distance
      const spriteHeight = Math.min((TILE_SIZE * height * 1.5) / alien.distance, height * 0.8);
      const spriteWidth = spriteHeight * 0.6;
      const spriteTop = height / 2 - spriteHeight / 2 + spriteHeight * 0.1;

      // Draw alien (simple shapes for now)
      const color = alien.isBoss ? COLORS.BOSS : COLORS.ALIEN;
      const shade = Math.max(0.3, 1 - alien.distance / (MAX_DEPTH * TILE_SIZE * 0.7));

      // Body
      this.gameGraphics.fillStyle(this.shadeColor(color, shade));
      this.gameGraphics.fillEllipse(
        alien.screenX,
        spriteTop + spriteHeight * 0.5,
        spriteWidth,
        spriteHeight * 0.7
      );

      // Head
      this.gameGraphics.fillStyle(this.shadeColor(color, shade * 1.1));
      this.gameGraphics.fillCircle(
        alien.screenX,
        spriteTop + spriteHeight * 0.15,
        spriteWidth * 0.35
      );

      // Eyes (menacing!)
      this.gameGraphics.fillStyle(0x000000);
      this.gameGraphics.fillCircle(
        alien.screenX - spriteWidth * 0.12,
        spriteTop + spriteHeight * 0.12,
        spriteWidth * 0.08
      );
      this.gameGraphics.fillCircle(
        alien.screenX + spriteWidth * 0.12,
        spriteTop + spriteHeight * 0.12,
        spriteWidth * 0.08
      );

      // Health bar for bosses
      if (alien.isBoss && alien.distance < TILE_SIZE * 8) {
        const barWidth = spriteWidth * 1.2;
        const barHeight = 6;
        const barY = spriteTop - 15;
        const healthPercent = alien.health / alien.maxHealth;

        this.gameGraphics.fillStyle(0x440000);
        this.gameGraphics.fillRect(alien.screenX - barWidth / 2, barY, barWidth, barHeight);
        this.gameGraphics.fillStyle(0xff0000);
        this.gameGraphics.fillRect(alien.screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);
      }
    }
  }

  private shadeColor(color: number, shade: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * shade);
    const g = Math.floor(((color >> 8) & 0xff) * shade);
    const b = Math.floor((color & 0xff) * shade);
    return (r << 16) | (g << 8) | b;
  }
}
