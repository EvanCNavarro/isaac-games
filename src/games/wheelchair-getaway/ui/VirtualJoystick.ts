import Phaser from 'phaser';

/**
 * VirtualJoystick - Touch controls for mobile devices
 * ELI5: This is like a video game controller on your phone screen!
 * Touch and drag to control where the wheelchair goes.
 */
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private container: Phaser.GameObjects.Container;

  // Joystick state
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;

  // Output values (-1 to 1)
  public forceX: number = 0;
  public forceY: number = 0;

  // Configuration
  private baseRadius: number = 60;
  private thumbRadius: number = 25;
  private maxDistance: number = 50;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { height } = scene.scale;

    // Default position (bottom left)
    const defaultX = 100;
    const defaultY = height - 120;

    // Create container
    this.container = scene.add.container(defaultX, defaultY);
    this.container.setDepth(50);
    this.container.setAlpha(0.6);

    // Create base circle
    this.base = scene.add.circle(0, 0, this.baseRadius, 0x333333, 0.5);
    this.base.setStrokeStyle(3, 0x666666);
    this.container.add(this.base);

    // Create thumb circle
    this.thumb = scene.add.circle(0, 0, this.thumbRadius, 0x888888);
    this.thumb.setStrokeStyle(2, 0xffffff);
    this.container.add(this.thumb);

    // Setup touch input
    this.setupInput();

    // Hide by default on desktop (will show when touch detected)
    if (!scene.sys.game.device.input.touch) {
      this.container.setVisible(false);
    }
  }

  private setupInput(): void {
    const { width, height } = this.scene.scale;

    // Define touch zone (left side of screen)
    const touchZone = this.scene.add.rectangle(
      width * 0.25, height * 0.75,
      width * 0.5, height * 0.5,
      0x000000, 0
    );
    touchZone.setInteractive();
    touchZone.setDepth(49);

    // Touch start
    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isActive = true;
      this.startX = pointer.x;
      this.startY = pointer.y;

      // Move joystick to touch position
      this.container.setPosition(pointer.x, pointer.y);
      this.container.setVisible(true);
      this.container.setAlpha(0.8);
    });

    // Touch move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isActive) return;

      // Calculate distance from start
      const dx = pointer.x - this.startX;
      const dy = pointer.y - this.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Clamp to max distance
      let thumbX = dx;
      let thumbY = dy;
      if (distance > this.maxDistance) {
        const angle = Math.atan2(dy, dx);
        thumbX = Math.cos(angle) * this.maxDistance;
        thumbY = Math.sin(angle) * this.maxDistance;
      }

      // Update thumb position
      this.thumb.setPosition(thumbX, thumbY);

      // Calculate force (normalized -1 to 1)
      this.forceX = thumbX / this.maxDistance;
      this.forceY = thumbY / this.maxDistance;
    });

    // Touch end
    this.scene.input.on('pointerup', () => {
      this.isActive = false;
      this.forceX = 0;
      this.forceY = 0;

      // Reset thumb to center
      this.thumb.setPosition(0, 0);
      this.container.setAlpha(0.6);
    });
  }

  /**
   * Get horizontal force (-1 = left, 1 = right)
   */
  getForceX(): number {
    return this.forceX;
  }

  /**
   * Get vertical force (-1 = up, 1 = down)
   */
  getForceY(): number {
    return this.forceY;
  }

  /**
   * Check if joystick is currently being used
   */
  isBeingUsed(): boolean {
    return this.isActive;
  }

  /**
   * Destroy the joystick
   */
  destroy(): void {
    this.container.destroy();
  }
}
