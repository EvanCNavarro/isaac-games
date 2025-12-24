import Phaser from 'phaser';

/**
 * Simplified Mobile FPS Controls
 * Left: Joystick for movement + turning
 * Right: Tap to shoot (with auto-aim)
 */
export class MobileControls {
  private scene: Phaser.Scene;
  private isTouchDevice: boolean;

  // Joystick elements
  private joystickContainer!: Phaser.GameObjects.Container;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickActive: boolean = false;
  private joystickPointerId: number = -1;
  private joystickCenterX: number = 0;
  private joystickCenterY: number = 0;

  // Joystick config
  private baseRadius: number = 55;
  private thumbRadius: number = 25;
  private maxDist: number = 45;

  // Output values
  public moveForward: number = 0;
  public turnAmount: number = 0;
  public shootRequested: boolean = false;
  public shootX: number = 0;
  public shootY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isTouchDevice = scene.sys.game.device.input.touch === true;

    if (!this.isTouchDevice) {
      // Create dummy elements for desktop
      this.joystickContainer = scene.add.container(0, 0).setVisible(false);
      this.joystickBase = scene.add.circle(0, 0, 0);
      this.joystickThumb = scene.add.circle(0, 0, 0);
      return;
    }

    this.createJoystick();
    this.createShootZone();
  }

  private createJoystick(): void {
    const { width, height } = this.scene.scale;

    // Fixed position bottom-left
    const baseX = 90;
    const baseY = height - 120;

    this.joystickCenterX = baseX;
    this.joystickCenterY = baseY;

    this.joystickContainer = this.scene.add.container(baseX, baseY);
    this.joystickContainer.setDepth(100);

    // Outer ring (base)
    this.joystickBase = this.scene.add.circle(0, 0, this.baseRadius, 0x000000, 0.4);
    this.joystickBase.setStrokeStyle(4, 0x22ff22, 0.8);
    this.joystickContainer.add(this.joystickBase);

    // Direction arrows
    const arrowColor = '#22ff22';
    const arrows = [
      { x: 0, y: -30, text: '▲' },
      { x: 0, y: 30, text: '▼' },
      { x: -30, y: 0, text: '◀' },
      { x: 30, y: 0, text: '▶' },
    ];
    arrows.forEach(a => {
      const arrow = this.scene.add.text(a.x, a.y, a.text, {
        fontSize: '16px',
        color: arrowColor,
      }).setOrigin(0.5).setAlpha(0.5);
      this.joystickContainer.add(arrow);
    });

    // Thumb (moveable part)
    this.joystickThumb = this.scene.add.circle(0, 0, this.thumbRadius, 0x22ff22, 0.8);
    this.joystickThumb.setStrokeStyle(2, 0xffffff);
    this.joystickContainer.add(this.joystickThumb);

    // Label
    const label = this.scene.add.text(0, this.baseRadius + 20, 'MOVE', {
      fontSize: '12px',
      color: '#22ff22',
    }).setOrigin(0.5);
    this.joystickContainer.add(label);

    // Touch zone for joystick (left third of screen)
    const touchZone = this.scene.add.rectangle(
      width * 0.2, height / 2,
      width * 0.4, height,
      0x00ff00, 0
    );
    touchZone.setInteractive();
    touchZone.setDepth(99);

    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId === -1) {
        this.joystickActive = true;
        this.joystickPointerId = pointer.id;
        // Move joystick base to where user touched
        this.joystickCenterX = pointer.x;
        this.joystickCenterY = pointer.y;
        this.joystickContainer.setPosition(pointer.x, pointer.y);
        this.joystickContainer.setAlpha(1);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId && this.joystickActive) {
        const dx = pointer.x - this.joystickCenterX;
        const dy = pointer.y - this.joystickCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp thumb position
        let thumbX = dx;
        let thumbY = dy;
        if (dist > this.maxDist) {
          const angle = Math.atan2(dy, dx);
          thumbX = Math.cos(angle) * this.maxDist;
          thumbY = Math.sin(angle) * this.maxDist;
        }

        this.joystickThumb.setPosition(thumbX, thumbY);

        // Calculate outputs
        // Forward/back = Y axis (inverted: up = forward)
        this.moveForward = -thumbY / this.maxDist;
        // Turn = X axis
        this.turnAmount = thumbX / this.maxDist;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickActive = false;
        this.joystickPointerId = -1;
        this.moveForward = 0;
        this.turnAmount = 0;
        this.joystickThumb.setPosition(0, 0);
        this.joystickContainer.setAlpha(0.8);
      }
    });
  }

  private createShootZone(): void {
    const { width, height } = this.scene.scale;

    // Shoot button - large and obvious on right side
    const btnX = width - 80;
    const btnY = height - 120;

    const shootBtn = this.scene.add.container(btnX, btnY);
    shootBtn.setDepth(100);

    // Button background - large circle
    const bg = this.scene.add.circle(0, 0, 55, 0xaa2222, 0.7);
    bg.setStrokeStyle(4, 0xff4444);
    shootBtn.add(bg);

    // Crosshair icon
    const icon = this.scene.add.text(0, -5, '🎯', { fontSize: '36px' }).setOrigin(0.5);
    shootBtn.add(icon);

    // Label
    const label = this.scene.add.text(0, 30, 'SHOOT', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    shootBtn.add(label);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerdown', () => {
      this.shootRequested = true;
      bg.setFillStyle(0xff4444, 0.9);
      bg.setScale(1.1);

      // Visual feedback
      this.scene.tweens.add({
        targets: icon,
        scale: 1.3,
        duration: 50,
        yoyo: true,
      });
    });

    bg.on('pointerup', () => {
      bg.setFillStyle(0xaa2222, 0.7);
      bg.setScale(1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0xaa2222, 0.7);
      bg.setScale(1);
    });

    // Also allow tapping anywhere on right side of screen to shoot
    const shootZone = this.scene.add.rectangle(
      width * 0.75, height * 0.4,
      width * 0.5, height * 0.6,
      0xff0000, 0
    );
    shootZone.setInteractive();
    shootZone.setDepth(98);

    shootZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.shootRequested = true;
      this.shootX = pointer.x;
      this.shootY = pointer.y;
    });
  }

  /**
   * Reset frame-specific values (call at end of update)
   */
  resetFrame(): void {
    this.shootRequested = false;
  }

  /**
   * Check if running on touch device
   */
  isActive(): boolean {
    return this.isTouchDevice;
  }

  destroy(): void {
    this.joystickContainer?.destroy();
  }
}
