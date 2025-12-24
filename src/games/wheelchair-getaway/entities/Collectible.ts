import Phaser from 'phaser';

export type CollectibleType = 'boost' | 'coin' | 'shield';

/**
 * Collectible - Items the player can pick up on the road
 * ELI5: These are goodies on the road! Grab them to get coins, speed boosts, or shields.
 */
export class Collectible extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  public collectibleType: CollectibleType;
  private emoji: Phaser.GameObjects.Text;
  private innerContainer: Phaser.GameObjects.Container;
  private glowCircle?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType) {
    super(scene, x, y);
    this.collectibleType = type;

    // Create inner container for floating animation (so it doesn't fight with scroll)
    this.innerContainer = scene.add.container(0, 0);
    this.add(this.innerContainer);

    // Create emoji based on type
    const emojiStyle = { fontSize: '32px' };

    switch (type) {
      case 'boost':
        // Lightning bolt for speed boost
        this.emoji = scene.add.text(0, 0, '⚡', emojiStyle).setOrigin(0.5);
        this.innerContainer.add(this.emoji);

        // Add subtle pulsing glow
        const boostGlow = scene.add.circle(0, 0, 25, 0x00ff00, 0.3);
        this.innerContainer.addAt(boostGlow, 0);
        scene.tweens.add({
          targets: boostGlow,
          scale: { from: 0.8, to: 1.2 },
          alpha: { from: 0.4, to: 0.1 },
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'coin':
        // Coin emoji
        this.emoji = scene.add.text(0, 0, '🪙', emojiStyle).setOrigin(0.5);
        this.innerContainer.add(this.emoji);

        // Spinning effect (scale X to simulate rotation)
        scene.tweens.add({
          targets: this.emoji,
          scaleX: { from: 1, to: -1 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'shield':
        // Shield emoji with glow
        this.glowCircle = scene.add.circle(0, 0, 28, 0x00ffff, 0.4);
        this.innerContainer.add(this.glowCircle);

        // Pulsing glow effect
        scene.tweens.add({
          targets: this.glowCircle,
          scale: { from: 1, to: 1.4 },
          alpha: { from: 0.5, to: 0.1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        });

        this.emoji = scene.add.text(0, 0, '🛡️', emojiStyle).setOrigin(0.5);
        this.innerContainer.add(this.emoji);
        break;
    }

    // Add floating animation to INNER container (not the main container that scrolls)
    scene.tweens.add({
      targets: this.innerContainer,
      y: -8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    this.body.setSize(40, 40);
    this.body.setAllowGravity(false);
  }

  /**
   * Called when collected - plays effect and destroys
   */
  collect(): void {
    // Quick scale-up effect
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
