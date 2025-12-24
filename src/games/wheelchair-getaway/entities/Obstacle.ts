import Phaser from 'phaser';

export type ObstacleType = 'pothole' | 'cone' | 'puddle';

/**
 * Obstacle - Things on the road that slow you down
 * ELI5: Watch out for these! Hit them and you'll slow down, letting the cop catch up!
 */
export class Obstacle extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  public obstacleType: ObstacleType;
  public slowdownAmount: number; // How much to slow player (0-1)
  public slowdownDuration: number; // How long the slowdown lasts (ms)
  private emoji: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    super(scene, x, y);
    this.obstacleType = type;

    const emojiStyle = { fontSize: '36px' };

    switch (type) {
      case 'pothole':
        // Dark hole/circle emoji
        this.emoji = scene.add.text(0, 0, '🕳️', emojiStyle).setOrigin(0.5);
        this.add(this.emoji);
        this.slowdownAmount = 0.3;
        this.slowdownDuration = 500;
        break;

      case 'cone':
        // Traffic cone emoji
        this.emoji = scene.add.text(0, 0, '🚧', emojiStyle).setOrigin(0.5);
        this.add(this.emoji);
        this.slowdownAmount = 0.2;
        this.slowdownDuration = 300;
        break;

      case 'puddle':
        // Water/droplet emoji for puddle
        this.emoji = scene.add.text(0, 0, '💧', emojiStyle).setOrigin(0.5);
        this.add(this.emoji);

        // Add a blue circle underneath for puddle effect
        const puddle = scene.add.ellipse(0, 5, 50, 25, 0x4488ff, 0.5);
        this.addAt(puddle, 0);

        this.slowdownAmount = 0.5;
        this.slowdownDuration = 800;
        break;
    }

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    this.body.setSize(45, 45);
    this.body.setAllowGravity(false);
  }

  /**
   * Called when player hits obstacle - plays effect
   */
  onHit(): void {
    // Shake and flash effect
    this.scene.tweens.add({
      targets: this,
      x: this.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });

    this.scene.tweens.add({
      targets: this.emoji,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }
}
