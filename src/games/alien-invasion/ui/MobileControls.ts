import Phaser from 'phaser';

/**
 * Mobile FPS Controls
 * Left side: Virtual joystick for movement
 * Right side: Drag to look/turn, tap to shoot
 */
export class MobileControls {
  private scene: Phaser.Scene;

  // Movement joystick (left side)
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickContainer!: Phaser.GameObjects.Container;
  private joystickPointerId: number = -1;
  private joystickStartX: number = 0;
  private joystickStartY: number = 0;

  // Look controls (right side)
  private lookPointerId: number = -1;
  private lastLookX: number = 0;

  // Output values
  public moveForward: number = 0;  // -1 to 1 (back to forward)
  public moveStrafe: number = 0;   // -1 to 1 (left to right)
  public turnDelta: number = 0;    // Rotation delta this frame
  public shouldShoot: boolean = false;

  // Configuration
  private joystickRadius: number = 50;
  private thumbRadius: number = 22;
  private maxJoystickDist: number = 40;
  private lookSensitivity: number = 0.004;

  // Shoot button
  private shootButton!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Only setup on touch devices
    if (!scene.sys.game.device.input.touch) {
      // Create invisible placeholder
      this.joystickContainer = scene.add.container(0, 0);
      this.joystickBase = scene.add.circle(0, 0, 0);
      this.joystickThumb = scene.add.circle(0, 0, 0);
      this.shootButton = scene.add.container(0, 0);
      return;
    }

    this.createJoystick();
    this.createShootButton();
    this.setupTouchInput();
  }

  private createJoystick(): void {
    const { height } = this.scene.scale;

    // Position in bottom left
    const x = 90;
    const y = height - 110;

    this.joystickContainer = this.scene.add.container(x, y);
    this.joystickContainer.setDepth(100);
    this.joystickContainer.setAlpha(0.7);

    // Base circle
    this.joystickBase = this.scene.add.circle(0, 0, this.joystickRadius, 0x222222, 0.6);
    this.joystickBase.setStrokeStyle(3, 0x444444);
    this.joystickContainer.add(this.joystickBase);

    // Thumb circle
    this.joystickThumb = this.scene.add.circle(0, 0, this.thumbRadius, 0x666666);
    this.joystickThumb.setStrokeStyle(2, 0x22ff22);
    this.joystickContainer.add(this.joystickThumb);

    // Direction indicators
    const arrowStyle = { fontSize: '14px', color: '#444444' };
    this.joystickContainer.add(this.scene.add.text(0, -35, '▲', arrowStyle).setOrigin(0.5));
    this.joystickContainer.add(this.scene.add.text(0, 35, '▼', arrowStyle).setOrigin(0.5));
    this.joystickContainer.add(this.scene.add.text(-35, 0, '◀', arrowStyle).setOrigin(0.5));
    this.joystickContainer.add(this.scene.add.text(35, 0, '▶', arrowStyle).setOrigin(0.5));
  }

  private createShootButton(): void {
    const { width, height } = this.scene.scale;

    // Position in bottom right
    const x = width - 80;
    const y = height - 100;

    this.shootButton = this.scene.add.container(x, y);
    this.shootButton.setDepth(100);

    // Button background
    const bg = this.scene.add.circle(0, 0, 45, 0x882222, 0.7);
    bg.setStrokeStyle(3, 0xff4444);
    this.shootButton.add(bg);

    // Crosshair icon
    const icon = this.scene.add.text(0, 0, '🎯', { fontSize: '32px' }).setOrigin(0.5);
    this.shootButton.add(icon);

    // Label
    const label = this.scene.add.text(0, 55, 'FIRE', {
      fontSize: '12px',
      color: '#ff4444',
    }).setOrigin(0.5);
    this.shootButton.add(label);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerdown', () => {
      this.shouldShoot = true;
      bg.setFillStyle(0xcc4444, 0.9);
    });

    bg.on('pointerup', () => {
      bg.setFillStyle(0x882222, 0.7);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x882222, 0.7);
    });
  }

  private setupTouchInput(): void {
    const { width, height } = this.scene.scale;

    // Left zone for joystick (left 40% of screen)
    const leftZone = this.scene.add.rectangle(
      width * 0.2, height * 0.65,
      width * 0.4, height * 0.7,
      0x00ff00, 0
    );
    leftZone.setInteractive();
    leftZone.setDepth(99);

    // Right zone for look (right 40% of screen, excluding shoot button)
    const rightZone = this.scene.add.rectangle(
      width * 0.65, height * 0.5,
      width * 0.5, height,
      0xff0000, 0
    );
    rightZone.setInteractive();
    rightZone.setDepth(98);

    // Joystick touch handling
    leftZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId === -1) {
        this.joystickPointerId = pointer.id;
        this.joystickStartX = pointer.x;
        this.joystickStartY = pointer.y;

        // Move joystick to touch position
        this.joystickContainer.setPosition(pointer.x, pointer.y);
        this.joystickContainer.setAlpha(0.9);
      }
    });

    // Look/turn touch handling
    rightZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't capture if it's near the shoot button
      const shootBtnX = width - 80;
      const shootBtnY = height - 100;
      const distToShoot = Math.sqrt((pointer.x - shootBtnX) ** 2 + (pointer.y - shootBtnY) ** 2);

      if (distToShoot > 60 && this.lookPointerId === -1) {
        this.lookPointerId = pointer.id;
        this.lastLookX = pointer.x;
      }
    });

    // Global pointer move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle joystick movement
      if (pointer.id === this.joystickPointerId && pointer.isDown) {
        const dx = pointer.x - this.joystickStartX;
        const dy = pointer.y - this.joystickStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max distance
        let thumbX = dx;
        let thumbY = dy;
        if (distance > this.maxJoystickDist) {
          const angle = Math.atan2(dy, dx);
          thumbX = Math.cos(angle) * this.maxJoystickDist;
          thumbY = Math.sin(angle) * this.maxJoystickDist;
        }

        // Update thumb position
        this.joystickThumb.setPosition(thumbX, thumbY);

        // Calculate movement values
        // Forward/back is inverted Y (up = forward = negative Y = positive forward)
        this.moveForward = -thumbY / this.maxJoystickDist;
        this.moveStrafe = thumbX / this.maxJoystickDist;
      }

      // Handle look/turn
      if (pointer.id === this.lookPointerId && pointer.isDown) {
        const deltaX = pointer.x - this.lastLookX;
        this.turnDelta = deltaX * this.lookSensitivity;
        this.lastLookX = pointer.x;
      }
    });

    // Global pointer up
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Reset joystick
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = -1;
        this.moveForward = 0;
        this.moveStrafe = 0;
        this.joystickThumb.setPosition(0, 0);
        this.joystickContainer.setAlpha(0.7);
      }

      // Reset look
      if (pointer.id === this.lookPointerId) {
        this.lookPointerId = -1;
        this.turnDelta = 0;
      }
    });
  }

  /**
   * Call at the end of each update to reset frame-specific values
   */
  resetFrame(): void {
    this.shouldShoot = false;
    // Turn delta is reset after being read, so look continues smoothly
    if (this.lookPointerId === -1) {
      this.turnDelta = 0;
    }
  }

  /**
   * Check if controls are active (touch device)
   */
  isActive(): boolean {
    return this.scene.sys.game.device.input.touch === true;
  }

  destroy(): void {
    this.joystickContainer?.destroy();
    this.shootButton?.destroy();
  }
}
