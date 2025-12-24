import Phaser from 'phaser';
import { COP_SPEED, COP_ACCELERATION } from '../config/gameConfig';

/**
 * Cop - The police car chasing the player
 * ELI5: This is the bad guy! He's mad about grandma punching him and wants revenge.
 * He follows where you went and gets faster over time!
 */
export class Cop extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private emoji: Phaser.GameObjects.Text;
  private sirenLeft: Phaser.GameObjects.Arc;
  private sirenRight: Phaser.GameObjects.Arc;

  // Speed increases over time
  private currentSpeed: number = COP_SPEED;
  private baseSpeed: number = COP_SPEED;

  // Stunned state (from oil slicks)
  public isStunned: boolean = false;

  // Siren light flash timer
  private lightTimer: number = 0;
  private lightState: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create police car emoji
    this.emoji = scene.add.text(0, 0, '🚔', { fontSize: '52px' }).setOrigin(0.5);
    this.add(this.emoji);

    // Add flashing siren lights above the car
    this.sirenLeft = scene.add.circle(-15, -30, 8, 0x0000ff);
    this.sirenRight = scene.add.circle(15, -30, 8, 0xff0000);
    this.add(this.sirenLeft);
    this.add(this.sirenRight);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    this.body.setSize(55, 55);
  }

  update(delta: number, playerX: number, playerY: number, gameTime: number): void {
    // Flash siren lights
    this.lightTimer += delta;
    if (this.lightTimer > 150) {
      this.lightTimer = 0;
      this.lightState = !this.lightState;
      this.sirenLeft.setFillStyle(this.lightState ? 0xff0000 : 0x0000ff);
      this.sirenRight.setFillStyle(this.lightState ? 0x0000ff : 0xff0000);
    }

    // If stunned, don't move
    if (this.isStunned) {
      this.body.setVelocity(0);
      return;
    }

    // Gradually increase speed over time
    this.currentSpeed = this.baseSpeed + (gameTime * COP_ACCELERATION / 1000);

    // Move toward player's position
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);

    this.body.setVelocity(
      Math.cos(angle) * this.currentSpeed,
      Math.sin(angle) * this.currentSpeed
    );
  }

  /**
   * Stun the cop (from oil slick)
   */
  stun(duration: number): void {
    this.isStunned = true;
    this.body.setVelocity(0);

    // Visual feedback - spin and add dizzy effect
    const dizzy = this.scene.add.text(0, -40, '💫', { fontSize: '24px' }).setOrigin(0.5);
    this.add(dizzy);

    // Spin the dizzy emoji
    this.scene.tweens.add({
      targets: dizzy,
      angle: 360,
      duration: 500,
      repeat: Math.floor(duration / 500),
    });

    // Shake the cop car
    this.scene.tweens.add({
      targets: this.emoji,
      angle: { from: -10, to: 10 },
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200),
    });

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.isStunned = false;
      this.emoji.setAngle(0);
      dizzy.destroy();
    });
  }

  /**
   * Get distance to a point
   */
  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }

  /**
   * Get the physics body for collision detection
   */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.body;
  }

  /**
   * Get current speed (for UI display)
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}
