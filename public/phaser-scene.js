(function () {
  if (!window.Phaser) {
    console.warn('Phaser runtime missing, fallback canvas renderer will be used.');
    return;
  }

  const WIDTH = 640;
  const HEIGHT = 360;
  let sceneInstance = null;
  let pendingActionHandler = null;

  class FishingScene extends Phaser.Scene {
    constructor() {
      super('FishingScene');
      this.snapshot = null;
      this.pixel = null;
      this.actionHandler = null;
      this.hitZones = [];
    }

    create() {
      sceneInstance = this;
      this.pixel = this.add.graphics();
      this.sceneGraphics = this.add.graphics();
      this.textLayer = this.add.group();
      this.actionHandler = pendingActionHandler;
      this.game.canvas.addEventListener('pointerdown', (event) => this.handlePointer({ event }));
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

    quadraticLine(fromX, fromY, controlX, controlY, toX, toY, color, width = 1) {
      const points = [];
      for (let i = 0; i <= 18; i += 1) {
        const p = i / 18;
        const inv = 1 - p;
        points.push([
          inv * inv * fromX + 2 * inv * p * controlX + p * p * toX,
          inv * inv * fromY + 2 * inv * p * controlY + p * p * toY,
        ]);
      }
      this.line(points, color, width);
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

    setActionHandler(handler) {
      this.actionHandler = handler;
    }

    handlePointer(pointer) {
      const rect = this.game.canvas.getBoundingClientRect();
      const rawX = pointer.event
        ? (pointer.event.clientX - rect.left) * (WIDTH / rect.width)
        : pointer.x;
      const rawY = pointer.event
        ? (pointer.event.clientY - rect.top) * (HEIGHT / rect.height)
        : pointer.y;
      const x = Math.round(rawX);
      const y = Math.round(rawY);
      const zone = this.hitZones.slice().reverse().find((item) =>
        x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h
      );
      if (zone && this.actionHandler) {
        this.actionHandler(zone.action, zone.payload || null);
      }
    }

    addHitZone(action, x, y, w, h, payload) {
      this.hitZones.push({ action, x, y, w, h, payload });
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
      this.hitZones = [];

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
        this.quadraticLine(rodTipX, rodTipY, midX, midY, hookX, hookY, rodSkin.lineColor || '#e0e0e0', 1);

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
      if (snapshot.hud) this.drawHud(snapshot.hud);
      if (snapshot.modal) this.drawModal(snapshot.modal);
      if (snapshot.hitbar && snapshot.hitbar.active) this.drawHitbar(snapshot.hitbar);
    }

    drawButton(action, label, x, y, w, h, active = false, payload = null, disabled = false) {
      if (!disabled) this.addHitZone(action, x, y, w, h, payload);
      this.pixel.fillStyle(disabled ? 0x303642 : (active ? 0xd35400 : 0x1a1a2e), 0.95);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(2, disabled ? 0x64748b : (active ? 0xffae42 : 0xffd700), 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(label, x + w / 2, y + h / 2 + 6, disabled ? '#94a3b8' : (active ? '#ffffff' : '#ffd700'), 11);
    }

    drawHud(hud) {
      this.pixel.fillStyle(0x0d1421, 0.86);
      this.pixel.fillRect(0, 0, WIDTH, 74);
      this.pixel.fillRect(0, HEIGHT - 76, WIDTH, 76);
      this.pixel.lineStyle(2, 0xffd700, 0.9);
      this.pixel.strokeRect(0, 0, WIDTH, 74);
      this.pixel.strokeRect(0, HEIGHT - 76, WIDTH, 76);

      this.drawLabel(hud.username || '玩家', 48, 23, '#4ec9b0', 13);
      this.drawLabel(`金币 ${hud.money || 0}`, 142, 23, '#ffd700', 13);
      this.drawLabel(`钻石 ${hud.diamonds || 0}`, 238, 23, '#66e6ff', 13);
      this.drawButton('version', `v${hud.version || ''}`, WIDTH - 70, 9, 58, 22, false);

      const actions = hud.actions || [];
      const gap = 4;
      const buttonW = Math.floor((WIDTH - 20 - gap * (actions.length - 1)) / Math.max(1, actions.length));
      actions.forEach((item, index) => {
        this.drawButton(item.action, item.label, 10 + index * (buttonW + gap), 42, buttonW, 23, item.active);
      });

      this.drawLabel(`当前鱼饵：${hud.baitName || ''} x${hud.baitCount || 0}`, 126, HEIGHT - 51, hud.baitColor || '#ffd700', 14);
      this.drawButton('bait-prev', '<', 12, HEIGHT - 63, 34, 28, false);
      this.drawButton('bait-next', '>', 52, HEIGHT - 63, 34, 28, false);
      this.drawLabel(hud.rodName || '', 332, HEIGHT - 51, '#cbd5e1', 12);
      this.drawLabel(hud.status || '', 214, HEIGHT - 20, '#4ec9b0', 12);
      this.drawButton('cast', hud.castLabel || '抛竿', WIDTH - 110, HEIGHT - 61, 96, 34, hud.phase !== 'idle');
      if (hud.vipVisible) {
        this.drawButton('vip-auto', hud.vipLabel || 'VIP自动', WIDTH - 110, HEIGHT - 25, 96, 20, hud.vipActive);
      }
    }

    drawModal(modal) {
      if (modal.type === 'shop') this.drawShopModal(modal);
      if (modal.type === 'result' || modal.type === 'miss') this.drawResultModal(modal);
    }

    drawShopModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 42;
      const y = 32;
      const w = WIDTH - 84;
      const h = HEIGHT - 64;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel('鱼饵商店', WIDTH / 2, y + 32, '#ffd700', 20);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawButton('shop-ad-reward', modal.adLabel || '看广告领 50 钻石', x + 18, y + 52, 150, 26, false, null, modal.adDisabled);
      this.drawLabel(`金币 ${modal.money || 0}   钻石 ${modal.diamonds || 0}`, x + w - 128, y + 72, '#e8e8e8', 13);
      if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + h - 10, '#4ec9b0', 12);

      const items = modal.items || [];
      items.forEach((item, index) => {
        const rowY = y + 88 + index * 35;
        this.pixel.fillStyle(0x0d1421, 0.96);
        this.pixel.fillRect(x + 18, rowY, w - 36, 29);
        this.pixel.lineStyle(1, Phaser.Display.Color.ValueToColor(item.color || '#555').color, 1);
        this.pixel.strokeRect(x + 18, rowY, w - 36, 29);
        this.drawLabel(`${item.name} x${item.owned}`, x + 82, rowY + 20, item.color || '#ffd700', 12);
        this.drawLabel(`${item.currencyIcon} ${item.price}/个`, x + 226, rowY + 20, '#ffd700', 12);
        this.drawLabel((item.desc || '').slice(0, 12), x + 330, rowY + 20, '#94a3b8', 11);
        this.drawButton('shop-buy', '买1', x + w - 110, rowY + 4, 42, 21, false, { id: item.id, count: 1 });
        this.drawButton('shop-buy', '买10', x + w - 62, rowY + 4, 48, 21, false, { id: item.id, count: 10 });
      });
    }

    drawResultModal(modal) {
      this.pixel.fillStyle(0x000000, 0.74);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 76;
      const y = 52;
      const w = WIDTH - 152;
      const h = HEIGHT - 104;
      const accent = Phaser.Display.Color.ValueToColor(modal.color || '#ffd700').color;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, accent, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      if (modal.type === 'miss') {
        this.drawLabel(modal.icon || '💧', WIDTH / 2, y + 58, '#ffffff', 30);
        this.drawLabel(modal.message || '鱼跑了', WIDTH / 2, y + 100, '#ffae42', 19);
        if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + 133, '#4ec9b0', 12);
        this.drawButton('result-retry', modal.retryLabel || '看广告再来一次', WIDTH / 2 - 78, y + 156, 156, 28, false, null, !modal.canRetry);
        this.drawButton('modal-close', '关闭', WIDTH / 2 - 45, y + 194, 90, 26, false);
        return;
      }

      this.drawLabel(modal.title || '钓获成功', WIDTH / 2, y + 34, '#ffd700', 18);
      this.drawLabel(modal.icon || '🎣', WIDTH / 2, y + 72, '#ffffff', 27);
      this.drawLabel(modal.name || '', WIDTH / 2, y + 106, modal.color || '#ffd700', 18);
      this.drawLabel(`★ ${modal.rarityName || ''} ★`, WIDTH / 2, y + 132, modal.color || '#ffd700', 13);

      const lines = [...(modal.detailLines || []), ...(modal.rewardLines || [])];
      lines.slice(0, 6).forEach((line, index) => {
        const color = index < (modal.detailLines || []).length ? '#e8e8e8' : '#4ec9b0';
        this.drawLabel(line, WIDTH / 2, y + 157 + index * 19, color, 12);
      });
      if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + h - 44, '#4ec9b0', 12);
      this.drawButton('modal-close', '关闭', WIDTH / 2 - 45, y + h - 32, 90, 26, false);
    }

    drawHitbar(hitbar) {
      this.pixel.fillStyle(0x000000, 0.82);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const panelX = 56;
      const panelY = 70;
      const panelW = WIDTH - panelX * 2;
      const panelH = 220;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(panelX, panelY, panelW, panelH);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(panelX, panelY, panelW, panelH);

      const color = hitbar.color || '#ffae42';
      this.drawLabel(hitbar.message || '鱼上钩了！', WIDTH / 2, panelY + 54, color, 22);
      this.drawLabel(`${hitbar.hits || 0} / ${hitbar.hitsNeeded || 0} 命中`, WIDTH / 2, panelY + 90, '#4ec9b0', 16);
      this.drawLabel(`${Math.max(0, hitbar.timeLeft || 0).toFixed(1)}s`, WIDTH / 2, panelY + 118, '#ff5722', 15);

      const barX = panelX + 42;
      const barY = panelY + 142;
      const barW = panelW - 84;
      const barH = 34;
      this.pixel.fillStyle(0x2c3e50, 1);
      this.pixel.fillRect(barX, barY, barW, barH);
      this.pixel.lineStyle(3, 0xffd700, 1);
      this.pixel.strokeRect(barX, barY, barW, barH);

      this.pixel.fillStyle(0xff5722, 1);
      this.pixel.fillRect(barX + barW * hitbar.zoneStart, barY, barW * hitbar.zoneWidth, barH);
      this.pixel.lineStyle(2, 0xffffff, 1);
      this.pixel.beginPath();
      this.pixel.moveTo(barX + barW * hitbar.zoneStart, barY);
      this.pixel.lineTo(barX + barW * hitbar.zoneStart, barY + barH);
      this.pixel.moveTo(barX + barW * (hitbar.zoneStart + hitbar.zoneWidth), barY);
      this.pixel.lineTo(barX + barW * (hitbar.zoneStart + hitbar.zoneWidth), barY + barH);
      this.pixel.strokePath();

      this.pixel.fillStyle(0xffffff, 1);
      this.pixel.fillRect(barX + barW * hitbar.cursorPos - 2, barY - 4, 4, barH + 8);
      this.drawLabel('空格 / 点击画面 / 手机按钮：击中', WIDTH / 2, panelY + 198, '#ffd700', 13);
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
    setActionHandler(handler) {
      pendingActionHandler = handler;
      if (sceneInstance) sceneInstance.setActionHandler(handler);
    },
    getCanvas() {
      return game.canvas;
    },
  };
}());
