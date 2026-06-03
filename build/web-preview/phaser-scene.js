(function () {
  if (!window.Phaser) {
    console.warn('Phaser runtime missing, fallback canvas renderer will be used.');
    return;
  }

  const WIDTH = 640;
  const HEIGHT = 360;

  class FishingScene extends Phaser.Scene {
    constructor() {
      super('FishingScene');
      this.snapshot = null;
      this.pixel = null;
    }

    create() {
      sceneInstance = this;
      this.pixel = this.add.graphics();
      this.sceneGraphics = this.add.graphics();
      this.textLayer = this.add.group();
    }

    setSnapshot(snapshot) {
      this.snapshot = snapshot;
    }

    update() {
      this.draw(this.snapshot || {});
    }

    px(x, y, w, h, color) {
      this.pixel.fillStyle(Phaser.Display.Color.ValueToColor(color).color, Phaser.Display.Color.ValueToColor(color).alphaGL);
      this.pixel.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }

    line(points, color, width = 1) {
      this.pixel.lineStyle(width, Phaser.Display.Color.ValueToColor(color).color, Phaser.Display.Color.ValueToColor(color).alphaGL);
      this.pixel.beginPath();
      this.pixel.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) this.pixel.lineTo(points[i][0], points[i][1]);
      this.pixel.strokePath();
    }

    drawLabel(value, x, y, color, size) {
      const label = this.add.text(x, y - size, value, {
        fontFamily: 'Courier New, monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(0,0,0,0.6)',
        align: 'center',
        padding: { x: 6, y: 2 },
      });
      label.setOrigin(0.5, 0);
      this.textLayer.add(label);
    }

    clearLabels() {
      this.textLayer.clear(true, true);
    }

    draw(snapshot) {
      const now = Date.now() / 1000;
      const t = snapshot.time || now;
      const phase = snapshot.phase || 'idle';
      const hookX = snapshot.hookX || WIDTH / 2;
      const hookY = snapshot.hookY || HEIGHT * 0.55;
      const rodSkin = snapshot.rodSkin || {
        rodColor: '#8b4513',
        rodHighlight: '#d7a15d',
        lineColor: '#e0e0e0',
      };

      this.pixel.clear();
      this.clearLabels();

      const skyH = HEIGHT * 0.4;
      for (let y = 0; y < skyH; y += 4) {
        const r = 135 + (255 - 135) * (y / skyH) * 0.1;
        const g = 206 + (200 - 206) * (y / skyH) * 0.1;
        const b = 235 - (235 - 180) * (y / skyH) * 0.3;
        this.px(0, y, WIDTH, 4, `rgb(${r | 0},${g | 0},${b | 0})`);
      }

      this.pixel.fillStyle(Phaser.Display.Color.ValueToColor('#3d5a73').color);
      this.pixel.beginPath();
      this.pixel.moveTo(0, skyH);
      for (let x = 0; x <= WIDTH; x += 20) {
        const mountainH = 30 + Math.sin(x * 0.02) * 15 + Math.sin(x * 0.05) * 8;
        this.pixel.lineTo(x, skyH - mountainH);
      }
      this.pixel.lineTo(WIDTH, skyH);
      this.pixel.closePath();
      this.pixel.fillPath();

      this.px(0, skyH, WIDTH, HEIGHT - skyH, '#1e6091');
      for (let y = skyH; y < HEIGHT; y += 6) {
        const wave = Math.sin(t * 2 + y * 0.1) * 2;
        const shade = 30 + ((y - skyH) / (HEIGHT - skyH)) * 60;
        this.px(0, y + wave, WIDTH, 2, `rgb(${20 + shade * 0.3 | 0},${60 + shade * 0.5 | 0},${120 + shade * 0.4 | 0})`);
      }
      for (let i = 0; i < 30; i += 1) {
        const x = (i * 47 + t * 30) % WIDTH;
        const y = skyH + ((i * 31) % (HEIGHT - skyH));
        this.px(x, y, 3, 1, 'rgba(255,255,255,0.5)');
      }

      this.px(WIDTH - 80, 40, 24, 24, '#ffeb3b');
      this.px(WIDTH - 84, 48, 32, 8, '#ffeb3b');
      this.px(WIDTH - 80, 36, 24, 4, '#ffeb3b');

      const rodTipX = WIDTH * 0.45 + Math.sin(t * 1.5) * 4;
      const rodTipY = HEIGHT * 0.35;
      const rodBaseX = WIDTH * 0.95;
      const rodBaseY = HEIGHT + 10;

      if (rodSkin.fx === 'night') {
        this.line([[rodBaseX, rodBaseY], [rodTipX, rodTipY]], 'rgba(139,92,246,0.75)', 8);
        for (let i = 0; i < 6; i += 1) {
          const frac = (i + t * 0.5) % 1;
          const x = rodBaseX + (rodTipX - rodBaseX) * frac;
          const y = rodBaseY + (rodTipY - rodBaseY) * frac + Math.sin(t * 4 + i * 2) * 4;
          this.px(x - 2, y - 2, 4, 4, 'rgba(139,92,246,0.65)');
        }
      }

      this.line([[rodBaseX, rodBaseY], [rodTipX, rodTipY]], rodSkin.rodColor || '#8b4513', 6);
      this.line([[rodBaseX, rodBaseY], [rodTipX, rodTipY]], rodSkin.rodHighlight || '#d7a15d', 2);
      this.drawAccessoryParticles(snapshot.accessoryDef, snapshot.accessoryStar || 1, rodBaseX, rodBaseY, rodTipX, rodTipY, t);

      if (phase !== 'idle' || hookY > rodTipY + 10) {
        const midX = (rodTipX + hookX) / 2;
        const midY = (rodTipY + hookY) / 2 + 10 + Math.sin(t * 3) * 2;
        this.pixel.lineStyle(1, Phaser.Display.Color.ValueToColor(rodSkin.lineColor || '#e0e0e0').color);
        this.pixel.beginPath();
        this.pixel.moveTo(rodTipX, rodTipY);
        this.pixel.quadraticCurveTo(midX, midY, hookX, hookY);
        this.pixel.strokePath();

        const bobY = hookY + Math.sin(t * 4) * (phase === 'hooked' ? 5 : 1);
        this.px(hookX - 4, bobY - 8, 8, 8, '#ff5722');
        this.px(hookX - 2, bobY - 8, 4, 4, '#fff');
        this.px(hookX - 1, bobY, 2, 6, '#3e2723');
      }

      this.px(WIDTH * 0.78, HEIGHT - 30, 30, 30, '#fdbcb4');
      this.px(WIDTH * 0.78, HEIGHT - 30, 30, 6, '#d99086');
      this.px(WIDTH * 0.85, HEIGHT - 24, 18, 18, '#fdbcb4');

      if (snapshot.pet) this.drawPet(snapshot.pet, t);

      if (phase === 'waiting') this.drawLabel('等待鱼上钩...', WIDTH / 2, HEIGHT - 24, '#ffffff', 12);
      if (phase === 'hooked') this.drawLabel('!!! 鱼上钩了 !!!', WIDTH / 2, HEIGHT - 24, '#ff5722', 16);
    }

    drawAccessoryParticles(def, star, rodBaseX, rodBaseY, rodTipX, rodTipY, t) {
      if (!def) return;
      const count = Math.min(18, 5 + Math.floor(star / 2));
      for (let i = 0; i < count; i += 1) {
        const frac = (i / count + t * (0.22 + star * 0.004)) % 1;
        const wave = Math.sin(t * 4 + i * 1.7) * (3 + star * 0.12);
        const x = rodBaseX + (rodTipX - rodBaseX) * frac + wave;
        const y = rodBaseY + (rodTipY - rodBaseY) * frac + Math.cos(t * 3 + i) * 3;
        if (def.particle === 'tide') {
          this.px(x - 3, y - 1, 6, 2, 'rgba(78,201,176,0.65)');
          this.px(x - 1, y - 3, 2, 6, 'rgba(102,230,255,0.45)');
        } else if (def.particle === 'star') {
          this.px(x - 1, y - 5, 2, 10, 'rgba(255,215,0,0.65)');
          this.px(x - 5, y - 1, 10, 2, 'rgba(255,215,0,0.65)');
        } else {
          this.px(x - 2, y - 2, 4, 4, 'rgba(102,230,255,0.65)');
          this.px(x + 2, y, 2, 2, 'rgba(255,255,255,0.5)');
        }
      }
    }

    drawPet(pet, t) {
      const bx = pet.canvasX * WIDTH;
      const by = pet.canvasY * HEIGHT + Math.sin(t * 2) * 2;
      const s = 4;
      const c = pet.colors || {};
      const legSwing = Math.sin(t * 4) * 2;
      if (c.ear) {
        this.px(bx - s * 2, by - s * 7, s, s * 2, c.ear);
        this.px(bx + s * 2, by - s * 7, s, s * 2, c.ear);
      }
      this.px(bx - s * 2, by - s * 5, s * 5, s * 4, c.body || '#fff');
      this.px(bx - s, by - s * 4, s, s, c.eye || '#111');
      this.px(bx + s, by - s * 4, s, s, c.eye || '#111');
      this.px(bx, by - s * 2.5, s, Math.ceil(s * 0.5), c.nose || '#333');
      this.px(bx - s * 1.5, by - s, s * 4, s * 4, c.body || '#fff');
      if (c.belly) this.px(bx - s * 0.5, by, s * 2, s * 2, c.belly);
      const armSwing = Math.sin(t * 3) * 1.5;
      this.px(bx - s * 3, by - s * 0.5 + armSwing, s, s * 3, c.limb || c.body || '#fff');
      this.px(bx + s * 2.5, by - s * 0.5 - armSwing, s, s * 3, c.limb || c.body || '#fff');
      this.px(bx - s, by + s * 3 + legSwing, s, s * 2, c.limb || c.body || '#fff');
      this.px(bx + s, by + s * 3 - legSwing, s, s * 2, c.limb || c.body || '#fff');
      if (c.tail) {
        const tailY = Math.sin(t * 5) * 2;
        this.px(bx + s * 2.5, by + s, s * 2, s, c.tail);
        this.px(bx + s * 3.5, by + s * 0.5 + tailY, s, s, c.tail);
      }
    }
  }

  let sceneInstance = null;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#87ceeb',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
    },
    scene: [FishingScene],
  });

  window.FishingPhaser = {
    game,
    render(snapshot) {
      if (sceneInstance) sceneInstance.setSnapshot(snapshot);
    },
    getCanvas() {
      return game.canvas;
    },
  };
}());
