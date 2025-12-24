import Phaser from 'phaser';

interface GameOption {
  key: string;
  title: string;
  emoji: string;
  description: string;
  color: number;
}

/**
 * MenuScene - Main game selector
 * Isaac's Game Collection - Choose your adventure!
 */
export class MenuScene extends Phaser.Scene {
  private games: GameOption[] = [
    {
      key: 'wheelchair-getaway',
      title: 'Wheelchair Getaway',
      emoji: '🧑‍🦼',
      description: 'Escape the cop in your electric wheelchair!',
      color: 0x4a90d9,
    },
    {
      key: 'alien-invasion',
      title: 'Alien Invasion',
      emoji: '👽',
      description: 'You are the last soldier alive. Defeat the aliens!',
      color: 0x44aa44,
    },
  ];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Starfield effect
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      const star = this.add.circle(x, y, size, 0xffffff, alpha);

      // Twinkle animation
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }

    // Title
    this.add.text(width / 2, 80, "🎮 ISAAC'S GAMES 🎮", {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 125, 'Choose Your Adventure', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Game cards
    const cardHeight = 140;
    const cardSpacing = 20;
    const startY = 180;

    this.games.forEach((game, index) => {
      const y = startY + index * (cardHeight + cardSpacing);
      this.createGameCard(game, width / 2, y, width * 0.85, cardHeight);
    });

    // Footer
    this.add.text(width / 2, height - 30, 'Made by the Navarro Brothers', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private createGameCard(game: GameOption, x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, game.color, 0.2);
    bg.setStrokeStyle(3, game.color);
    container.add(bg);

    // Emoji icon
    const emoji = this.add.text(-w / 2 + 50, 0, game.emoji, {
      fontSize: '48px',
    }).setOrigin(0.5);
    container.add(emoji);

    // Title
    const title = this.add.text(-w / 2 + 120, -20, game.title, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(title);

    // Description
    const desc = this.add.text(-w / 2 + 120, 15, game.description, {
      fontSize: '14px',
      color: '#aaaaaa',
      wordWrap: { width: w - 180 },
    }).setOrigin(0, 0.5);
    container.add(desc);

    // Play button
    const btnWidth = 80;
    const btnHeight = 40;
    const btn = this.add.rectangle(w / 2 - 60, 0, btnWidth, btnHeight, game.color);
    btn.setStrokeStyle(2, 0xffffff);
    container.add(btn);

    const btnText = this.add.text(w / 2 - 60, 0, 'PLAY', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(btnText);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(game.color, 0.4);
      this.tweens.add({
        targets: container,
        scale: 1.02,
        duration: 100,
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(game.color, 0.2);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100,
      });
    });

    bg.on('pointerdown', () => {
      this.launchGame(game.key);
    });
  }

  private launchGame(gameKey: string): void {
    // Fade out and launch game
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.time.delayedCall(300, () => {
      switch (gameKey) {
        case 'wheelchair-getaway':
          this.scene.start('WG_BootScene');
          break;
        case 'alien-invasion':
          this.scene.start('AI_BootScene');
          break;
      }
    });
  }
}
