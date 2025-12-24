import Phaser from 'phaser';

/**
 * Alien Invasion Boot Scene
 * Shows intro and loads assets
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AI_BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark military background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    // Title
    this.add.text(width / 2, height * 0.25, '👽 ALIEN INVASION 👽', {
      fontSize: '28px',
      color: '#22ff22',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Story text
    const storyStyle = {
      fontSize: '14px',
      color: '#aaaaaa',
      wordWrap: { width: width * 0.8 },
      align: 'center' as const,
    };

    this.add.text(width / 2, height * 0.4,
      'The aliens attacked our military base.\n\n' +
      'You are the LAST SOLDIER alive.\n\n' +
      'Defeat the aliens to rescue survivors.\n\n' +
      'Collect weapons. Eliminate the threat.',
      storyStyle
    ).setOrigin(0.5);

    // Soldier emoji
    this.add.text(width / 2, height * 0.65, '🎖️', {
      fontSize: '64px',
    }).setOrigin(0.5);

    // Start button
    const btn = this.add.rectangle(width / 2, height * 0.82, 200, 50, 0x22aa22);
    btn.setStrokeStyle(2, 0x44ff44);
    btn.setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height * 0.82, 'START MISSION', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x33cc33));
    btn.on('pointerout', () => btn.setFillStyle(0x22aa22));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        this.scene.start('AI_PlayScene');
      });
    });

    // Back button
    const backBtn = this.add.text(20, 20, '← Back', {
      fontSize: '16px',
      color: '#888888',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
