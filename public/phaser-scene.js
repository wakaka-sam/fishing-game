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

    preload() {
      const characters = window.GAME_DATA?.CHARACTERS || [];
      characters.forEach((character) => {
        if (character.spriteImage) this.load.image(`character:${character.id}`, character.spriteImage);
      });
    }

    create() {
      sceneInstance = this;
      this.pixel = this.add.graphics();
      this.sceneGraphics = this.add.graphics();
      this.spriteLayer = this.add.group();
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

    clearSprites() {
      if (this.spriteLayer) this.spriteLayer.clear(true, true);
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
      const hasOverlay = !!snapshot.modal || !!(snapshot.hitbar && snapshot.hitbar.active);
      const rodSkin = snapshot.rodSkin || {
        rodColor: '#8b4513',
        rodHighlight: '#d7a15d',
        lineColor: '#e0e0e0',
      };

      this.pixel.clear();
      this.clearLabels();
      this.clearSprites();
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

      if (!hasOverlay && phase === 'waiting') this.drawLabel('等待鱼上钩...', WIDTH / 2, HEIGHT - 24, '#ffffff', 12);
      if (!hasOverlay && phase === 'hooked') this.drawLabel('!!! 鱼上钩了 !!!', WIDTH / 2, HEIGHT - 24, '#ff5722', 16);
      if (!hasOverlay && snapshot.hud) this.drawHud(snapshot.hud);
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
      if (modal.type === 'dex') this.drawDexModal(modal);
      if (modal.type === 'rod') this.drawRodModal(modal);
      if (modal.type === 'character') this.drawCharacterModal(modal);
      if (modal.type === 'pet') this.drawPetModal(modal);
      if (modal.type === 'accessory') this.drawAccessoryModal(modal);
      if (modal.type === 'rank') this.drawRankModal(modal);
      if (modal.type === 'gacha') this.drawGachaModal(modal);
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

    drawDexModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 24;
      const w = WIDTH - 68;
      const h = HEIGHT - 48;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '钓鱼图鉴', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      const tabs = modal.tabs || [];
      const tabY = y + 44;
      const gap = 4;
      const tabW = Math.floor((w - 36 - gap * Math.max(0, tabs.length - 1)) / Math.max(1, tabs.length));
      tabs.forEach((tab, index) => {
        this.drawButton('dex-tab', tab.label, x + 18 + index * (tabW + gap), tabY, tabW, 22, tab.active, { id: tab.id });
      });

      const items = modal.items || [];
      const itemW = Math.floor((w - 48) / 2);
      const itemH = 52;
      const startY = y + 76;
      items.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const itemX = x + 18 + col * (itemW + 12);
        const itemY = startY + row * (itemH + 8);
        const colorValue = Phaser.Display.Color.ValueToColor(item.color || '#888').color;
        this.pixel.fillStyle(item.unlocked ? 0x0d1421 : 0x121827, item.unlocked ? 0.98 : 0.78);
        this.pixel.fillRect(itemX, itemY, itemW, itemH);
        this.pixel.lineStyle(2, colorValue, item.unlocked ? 1 : 0.5);
        this.pixel.strokeRect(itemX, itemY, itemW, itemH);
        this.drawLabel(item.icon || '?', itemX + 22, itemY + 30, item.unlocked ? '#ffffff' : '#94a3b8', 18);
        this.drawLabel(item.name || '???', itemX + itemW / 2 + 8, itemY + 18, item.color || '#ffd700', 12);
        this.drawLabel(item.rarityName || '', itemX + itemW / 2 + 8, itemY + 34, item.color || '#ffd700', 10);
        const footer = item.extra ? `${item.extra}  ${item.stat || ''}` : (item.stat || '');
        this.drawLabel(footer.slice(0, 23), itemX + itemW / 2 + 8, itemY + 49, item.unlocked ? '#cbd5e1' : '#94a3b8', 9);
      });

      const stats = modal.stats || [];
      stats.slice(0, 2).forEach((line, index) => {
        this.drawLabel(line, x + 156 + index * 234, y + h - 52, index === 0 ? '#4ec9b0' : '#e8e8e8', 11);
      });
      stats.slice(2, 4).forEach((line, index) => {
        this.drawLabel(line, x + 156 + index * 234, y + h - 34, '#e8e8e8', 11);
      });
      this.drawButton('dex-page', '<', x + 18, y + h - 44, 34, 28, false, { delta: -1 }, modal.page <= 0);
      this.drawLabel(`${(modal.page || 0) + 1} / ${modal.pageCount || 1}`, x + 92, y + h - 36, '#ffd700', 12);
      this.drawButton('dex-page', '>', x + 128, y + h - 44, 34, 28, false, { delta: 1 }, modal.page >= (modal.pageCount || 1) - 1);
    }

    drawRodPreviewLine(item, x, y, w, h) {
      const baseX = x + w - 12;
      const baseY = y + h - 7;
      const tipX = x + 18;
      const tipY = y + 10;
      this.line([[baseX, baseY], [tipX, tipY]], item.rodColor || '#5d4037', 5);
      this.line([[baseX, baseY], [tipX, tipY]], item.rodHighlight || '#ffd700', 2);
      this.quadraticLine(tipX, tipY, tipX - 10, tipY + 20, tipX - 2, y + h - 6, item.lineColor || 'rgba(255,255,255,0.8)', 1);
    }

    drawRodModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 42;
      const y = 26;
      const w = WIDTH - 84;
      const h = HEIGHT - 52;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '鱼竿收藏', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`当前：${modal.currentName || '木竿'}`, x + 114, y + 54, '#4ec9b0', 12);
      this.drawLabel(`已收集鱼种：${modal.dexCount || 0}`, x + 270, y + 54, '#e8e8e8', 12);
      this.drawLabel(modal.nextText || '', x + w - 162, y + 54, '#94a3b8', 11);
      if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + h - 12, '#4ec9b0', 12);

      const items = modal.items || [];
      const startY = y + 72;
      const rowH = 45;
      items.forEach((item, index) => {
        const rowY = startY + index * (rowH + 8);
        const border = Phaser.Display.Color.ValueToColor(item.rodHighlight || '#ffd700').color;
        this.pixel.fillStyle(item.unlocked ? 0x0d1421 : 0x121827, item.unlocked ? 0.98 : 0.78);
        this.pixel.fillRect(x + 18, rowY, w - 36, rowH);
        this.pixel.lineStyle(item.active ? 3 : 2, item.active ? 0x4ec9b0 : border, item.unlocked ? 1 : 0.45);
        this.pixel.strokeRect(x + 18, rowY, w - 36, rowH);
        this.drawRodPreviewLine(item, x + 24, rowY + 3, 92, rowH - 6);
        this.drawLabel(`${item.emoji || '🎣'} ${item.name}`, x + 190, rowY + 17, item.rodHighlight || '#ffd700', 12);
        this.drawLabel((item.desc || '').slice(0, 22), x + 214, rowY + 32, item.unlocked ? '#cbd5e1' : '#94a3b8', 10);
        this.drawLabel(item.reqText || '', x + 380, rowY + 31, item.active ? '#4ec9b0' : (item.unlocked ? '#ffd700' : '#94a3b8'), 10);
        const label = item.active ? '装备中' : (item.unlocked ? '装备' : '锁定');
        this.drawButton('rod-equip', label, x + w - 78, rowY + 9, 54, 25, item.active, { id: item.id }, !item.unlocked || item.active);
      });

      this.drawButton('rod-page', '<', x + 18, y + h - 44, 34, 28, false, { delta: -1 }, modal.page <= 0);
      this.drawLabel(`${(modal.page || 0) + 1} / ${modal.pageCount || 1}`, x + 92, y + h - 36, '#ffd700', 12);
      this.drawButton('rod-page', '>', x + 128, y + h - 44, 34, 28, false, { delta: 1 }, modal.page >= (modal.pageCount || 1) - 1);
    }

    drawCharacterPortrait(item, x, y, w, h, t) {
      const key = `character:${item.id}`;
      if (item.spriteImage && this.textures.exists(key)) {
        const texture = this.textures.get(key).getSourceImage();
        const frameW = Math.floor(texture.width / 3);
        const frame = Math.floor((t * 3) % 3);
        const image = this.add.image(x + w / 2, y + h / 2, key);
        image.setOrigin(0.5);
        image.setCrop(frame * frameW, 0, frameW, texture.height);
        const scale = Math.min((w * 0.75) / frameW, (h * 0.9) / texture.height);
        image.setDisplaySize(frameW * scale, texture.height * scale);
        image.setAlpha(item.owned || item.canSynthesize ? 1 : 0.45);
        this.spriteLayer.add(image);
        return;
      }

      const coat = item.colors?.coat || '#2563eb';
      const trim = item.colors?.trim || '#facc15';
      const skin = item.sprite === 'teemo' ? '#f1c27d' : '#f2b48b';
      const hair = item.sprite === 'justin-bieber' ? '#fbbf24' : (item.sprite === 'teemo' ? '#5b3a1f' : '#4b2a1a');
      const alphaColor = item.owned || item.canSynthesize ? 1 : 0.45;
      const bodyColor = Phaser.Display.Color.ValueToColor(coat).color;
      const trimColor = Phaser.Display.Color.ValueToColor(trim).color;
      const skinColor = Phaser.Display.Color.ValueToColor(skin).color;
      const hairColor = Phaser.Display.Color.ValueToColor(hair).color;
      const baseX = x + w / 2 - 18;
      const baseY = y + h / 2 - 28 + Math.sin(t * 6) * 1.5;
      this.pixel.fillStyle(0x000000, 0.22 * alphaColor);
      this.pixel.fillRect(baseX + 2, baseY + 58, 38, 5);
      this.pixel.fillStyle(bodyColor, alphaColor);
      this.pixel.fillRect(baseX + 12, baseY + 30, 24, 28);
      this.pixel.fillStyle(trimColor, alphaColor);
      this.pixel.fillRect(baseX + 20, baseY + 32, 8, 24);
      this.pixel.fillStyle(0x1f2937, alphaColor);
      this.pixel.fillRect(baseX + 14, baseY + 56, 9, 15);
      this.pixel.fillRect(baseX + 27, baseY + 56, 9, 15);
      this.pixel.fillStyle(skinColor, alphaColor);
      this.pixel.fillRect(baseX + 14, baseY + 34, 8, 22);
      this.pixel.fillRect(baseX + 36, baseY + 34, 8, 22);
      this.pixel.fillRect(baseX + 16, baseY + 12, 20, 20);
      this.pixel.fillStyle(hairColor, alphaColor);
      this.pixel.fillRect(baseX + 14, baseY + 8, 24, 10);
      this.pixel.fillStyle(0x111111, alphaColor);
      this.pixel.fillRect(baseX + 22, baseY + 21, 4, 4);
      this.pixel.fillRect(baseX + 30, baseY + 21, 4, 4);
      if (item.sprite === 'fishing-master') {
        this.pixel.fillStyle(0xfacc15, alphaColor);
        this.pixel.fillRect(baseX + 8, baseY + 5, 32, 5);
        this.line([[baseX + 42, baseY + 18], [baseX + 48, baseY + 62]], '#8b5a2b', 3);
      }
      if (item.sprite === 'teemo') {
        this.pixel.fillStyle(0x16a34a, alphaColor);
        this.pixel.fillRect(baseX + 7, baseY + 4, 36, 8);
        this.pixel.fillStyle(0xdc2626, alphaColor);
        this.pixel.fillRect(baseX + 34, baseY - 1, 6, 5);
      }
    }

    drawCharacterModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 22;
      const w = WIDTH - 68;
      const h = HEIGHT - 44;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '角色', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`已解锁：${modal.ownedCount || 0} / ${modal.totalCount || 0}`, x + 118, y + 52, '#4ec9b0', 12);
      this.drawLabel(`碎片合成：${modal.required || 10} 个`, x + 286, y + 52, '#e8e8e8', 12);
      if (modal.status) this.drawLabel(modal.status, x + w - 146, y + 52, '#4ec9b0', 12);

      const items = modal.items || [];
      const cardW = Math.floor((w - 48) / 2);
      const cardH = 76;
      const startY = y + 70;
      items.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = x + 18 + col * (cardW + 12);
        const cardY = startY + row * (cardH + 8);
        const border = item.active ? 0x4ec9b0 : (item.owned ? 0xffd700 : (item.canSynthesize ? 0xf59e0b : 0x475569));
        this.pixel.fillStyle(item.owned || item.canSynthesize ? 0x0d1421 : 0x121827, item.owned || item.canSynthesize ? 0.98 : 0.76);
        this.pixel.fillRect(cardX, cardY, cardW, cardH);
        this.pixel.lineStyle(item.active ? 3 : 2, border, item.owned || item.canSynthesize ? 1 : 0.55);
        this.pixel.strokeRect(cardX, cardY, cardW, cardH);
        this.pixel.fillStyle(0x080c14, 0.9);
        this.pixel.fillRect(cardX + 8, cardY + 8, 58, 60);
        this.drawCharacterPortrait(item, cardX + 8, cardY + 8, 58, 60, Date.now() / 1000);
        this.drawLabel(item.name, cardX + 128, cardY + 19, item.owned ? '#ffd700' : '#94a3b8', 12);
        this.drawLabel((item.title || '').slice(0, 12), cardX + 136, cardY + 36, '#4ec9b0', 10);
        const stateText = item.owned
          ? (item.active ? '当前出战' : '已解锁')
          : (item.hasShardTarget ? `碎片 ${item.shardCount || 0}/${item.required || 10}` : item.obtain);
        this.drawLabel(stateText.slice(0, 12), cardX + 132, cardY + 55, item.owned || item.canSynthesize ? '#cbd5e1' : '#94a3b8', 9);
        let buttonLabel = '锁定';
        let action = 'character-equip';
        let payload = { id: item.id };
        let disabled = true;
        if (item.owned) {
          buttonLabel = item.active ? '装备中' : '装备';
          disabled = item.active;
        } else if (item.canSynthesize) {
          buttonLabel = '合成';
          action = 'character-compose';
          disabled = false;
        } else if (item.hasShardTarget) {
          buttonLabel = `${item.shardCount || 0}/${item.required || 10}`;
        }
        this.drawButton(action, buttonLabel, cardX + cardW - 58, cardY + 45, 48, 22, item.active, payload, disabled);
      });
    }

    drawPetPreview(pet, x, y, scale = 3, t = 0, alpha = 1) {
      const c = pet.colors || {};
      const bob = Math.sin(t * 4) * 1.2;
      const bx = x;
      const by = y + bob;
      const color = (value, fallback) => Phaser.Display.Color.ValueToColor(value || fallback).color;
      const body = color(c.body, '#f4a460');
      const belly = color(c.belly, c.body || '#f4a460');
      const ear = c.ear ? color(c.ear, c.body) : null;
      const eye = color(c.eye, '#111111');
      const nose = color(c.nose, '#333333');
      const limb = color(c.limb, c.body || '#f4a460');
      const tail = c.tail ? color(c.tail, c.body) : null;
      this.pixel.fillStyle(0x000000, 0.22 * alpha);
      this.pixel.fillRect(bx - scale * 3, by + scale * 4.8, scale * 7, scale);
      if (ear) {
        this.pixel.fillStyle(ear, alpha);
        this.pixel.fillRect(bx - scale * 2, by - scale * 6, scale, scale * 2);
        this.pixel.fillRect(bx + scale * 2, by - scale * 6, scale, scale * 2);
      }
      this.pixel.fillStyle(body, alpha);
      this.pixel.fillRect(bx - scale * 2, by - scale * 4.6, scale * 5, scale * 4);
      this.pixel.fillStyle(eye, alpha);
      this.pixel.fillRect(bx - scale, by - scale * 3.4, scale, scale);
      this.pixel.fillRect(bx + scale, by - scale * 3.4, scale, scale);
      this.pixel.fillStyle(nose, alpha);
      this.pixel.fillRect(bx, by - scale * 2, scale, Math.max(1, scale * 0.6));
      this.pixel.fillStyle(body, alpha);
      this.pixel.fillRect(bx - scale * 1.5, by - scale * 0.6, scale * 4, scale * 4);
      this.pixel.fillStyle(belly, alpha);
      this.pixel.fillRect(bx - scale * 0.4, by + scale * 0.5, scale * 2, scale * 2);
      this.pixel.fillStyle(limb, alpha);
      this.pixel.fillRect(bx - scale * 3, by, scale, scale * 3);
      this.pixel.fillRect(bx + scale * 2.5, by, scale, scale * 3);
      this.pixel.fillRect(bx - scale, by + scale * 3, scale, scale * 2);
      this.pixel.fillRect(bx + scale, by + scale * 3, scale, scale * 2);
      if (tail) {
        this.pixel.fillStyle(tail, alpha);
        this.pixel.fillRect(bx + scale * 2.6, by + scale, scale * 2, scale);
        this.pixel.fillRect(bx + scale * 3.6, by + scale * 0.4 + Math.sin(t * 7) * scale * 0.4, scale, scale);
      }
      if (pet.id === 'unicorn') {
        this.pixel.fillStyle(0xffd700, alpha);
        this.pixel.fillRect(bx, by - scale * 7.6, scale, scale * 3);
      }
    }

    drawPetModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 22;
      const w = WIDTH - 68;
      const h = HEIGHT - 44;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '宠物', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`已拥有：${modal.ownedCount || 0} / ${modal.totalCount || 0}`, x + 120, y + 52, '#4ec9b0', 12);
      const active = (modal.items || []).find(item => item.active);
      this.drawLabel(`出战：${active ? active.name : '未装备'}`, x + 286, y + 52, '#e8e8e8', 12);
      if (modal.status) this.drawLabel(modal.status, x + w - 142, y + 52, '#4ec9b0', 12);

      const items = modal.items || [];
      const gap = 10;
      const cardW = Math.floor((w - 36 - gap * 3) / 4);
      const cardH = 98;
      const startY = y + 72;
      items.forEach((item, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const cardX = x + 18 + col * (cardW + gap);
        const cardY = startY + row * (cardH + gap);
        const border = item.active ? 0x4caf50 : (item.owned ? 0xffd700 : 0x475569);
        this.pixel.fillStyle(item.owned ? 0x0d1421 : 0x121827, item.owned ? 0.98 : 0.7);
        this.pixel.fillRect(cardX, cardY, cardW, cardH);
        this.pixel.lineStyle(item.active ? 3 : 2, border, item.owned ? 1 : 0.55);
        this.pixel.strokeRect(cardX, cardY, cardW, cardH);
        this.pixel.fillStyle(0x080c14, 0.88);
        this.pixel.fillRect(cardX + 8, cardY + 8, cardW - 16, 32);
        this.drawPetPreview(item, cardX + cardW / 2, cardY + 30, 3, Date.now() / 1000, item.owned ? 1 : 0.45);
        this.drawLabel(item.name, cardX + cardW / 2, cardY + 53, item.owned ? '#ffd700' : '#94a3b8', 11);
        this.drawLabel((item.abilityText || item.desc || '').slice(0, 10), cardX + cardW / 2, cardY + 69, item.owned ? '#4ec9b0' : '#94a3b8', 9);
        const label = item.owned ? (item.active ? '卸下' : '装备') : (item.obtain || '活动获取');
        this.drawButton('pet-toggle', label.slice(0, 5), cardX + cardW / 2 - 25, cardY + 76, 50, 20, item.active, { id: item.id }, !item.owned);
      });
    }

    drawAccessoryModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 22;
      const w = WIDTH - 68;
      const h = HEIGHT - 44;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '首饰', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`金币：${modal.money || 0}`, x + 102, y + 52, '#ffd700', 12);
      this.drawLabel(`拥有：${modal.totalCount || 0}`, x + 220, y + 52, '#4ec9b0', 12);
      const equipped = modal.equipped;
      const equipText = equipped ? `${equipped.icon} ${equipped.name} ${equipped.star}★` : '未装备首饰';
      this.drawLabel(`装备：${equipText}`, x + 386, y + 52, equipped?.color || '#e8e8e8', 12);
      if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + h - 12, modal.status.includes('失败') ? '#ffae42' : '#4ec9b0', 11);

      const items = modal.items || [];
      if (items.length === 0) {
        this.pixel.fillStyle(0x0d1421, 0.95);
        this.pixel.fillRect(x + 48, y + 88, w - 96, 68);
        this.pixel.lineStyle(2, 0x334155, 1);
        this.pixel.strokeRect(x + 48, y + 88, w - 96, 68);
        this.drawLabel('暂无首饰', WIDTH / 2, y + 116, '#ffd700', 16);
        this.drawLabel('可在钻石抽奖第三期获得首饰', WIDTH / 2, y + 142, '#94a3b8', 12);
      }

      const cardW = Math.floor((w - 48) / 2);
      const cardH = 74;
      const startY = y + 74;
      items.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = x + 18 + col * (cardW + 12);
        const cardY = startY + row * (cardH + 10);
        const border = Phaser.Display.Color.ValueToColor(item.color || '#ffd700').color;
        this.pixel.fillStyle(0x0d1421, 0.98);
        this.pixel.fillRect(cardX, cardY, cardW, cardH);
        this.pixel.lineStyle(item.equipped ? 3 : 2, border, item.equipped ? 1 : 0.75);
        this.pixel.strokeRect(cardX, cardY, cardW, cardH);
        this.drawLabel(item.icon || '💍', cardX + 24, cardY + 31, '#ffffff', 20);
        this.drawLabel(item.name || '首饰', cardX + 92, cardY + 18, item.color || '#ffd700', 11);
        this.drawLabel(item.starsText || '', cardX + 174, cardY + 18, '#ffd700', 10);
        this.drawLabel((item.effectText || '').slice(0, 18), cardX + 116, cardY + 37, '#4ec9b0', 9);
        const materialLine = item.atMax
          ? '已满星'
          : (item.canUpgrade ? `${item.cost}金+材料` : (!item.hasMaterial ? '缺同款材料' : `金币不足${item.cost}`));
        this.drawLabel(materialLine, cardX + 112, cardY + 58, item.canUpgrade ? '#ffd700' : '#94a3b8', 8);
        this.drawButton('accessory-toggle', item.equipped ? '卸下' : '装备', cardX + cardW - 102, cardY + 43, 44, 20, item.equipped, { uid: item.uid });
        this.drawButton('accessory-upgrade', item.atMax ? '满星' : '强化', cardX + cardW - 52, cardY + 43, 44, 20, false, { uid: item.uid }, !item.canUpgrade);
      });

      const catalog = modal.catalog || [];
      if (catalog.length > 0) {
        const catalogY = y + h - 42;
        this.drawLabel('来源：钻石抽奖第三期', x + 250, catalogY, '#94a3b8', 10);
        catalog.slice(0, 3).forEach((item, index) => {
          this.drawLabel(`${item.icon} ${item.name}`, x + 400 + index * 74, catalogY, item.color || '#ffd700', 10);
        });
      }
      this.drawButton('accessory-page', '<', x + 18, y + h - 44, 34, 28, false, { delta: -1 }, modal.page <= 0);
      this.drawLabel(`${(modal.page || 0) + 1} / ${modal.pageCount || 1}`, x + 92, y + h - 36, '#ffd700', 12);
      this.drawButton('accessory-page', '>', x + 128, y + h - 44, 34, 28, false, { delta: 1 }, modal.page >= (modal.pageCount || 1) - 1);
    }

    drawRankModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 22;
      const w = WIDTH - 68;
      const h = HEIGHT - 44;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '排行榜', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      const tabs = modal.tabs || [];
      const tabY = y + 44;
      const gap = 6;
      const tabW = Math.floor((w - 36 - gap * Math.max(0, tabs.length - 1)) / Math.max(1, tabs.length));
      tabs.forEach((tab, index) => {
        this.drawButton('rank-tab', tab.label, x + 18 + index * (tabW + gap), tabY, tabW, 22, tab.active, { id: tab.id });
      });

      const hasSide = !!modal.rewardBanner || (modal.history || []).length > 0;
      const listX = x + 18;
      const listY = y + 80;
      const listW = hasSide ? 354 : w - 36;
      const headerH = 22;
      this.pixel.fillStyle(0x0b1220, 0.96);
      this.pixel.fillRect(listX, listY, listW, headerH);
      this.pixel.lineStyle(1, 0x334155, 1);
      this.pixel.strokeRect(listX, listY, listW, headerH);
      this.drawLabel('#', listX + 28, listY + 17, '#94a3b8', 10);
      this.drawLabel('玩家', listX + 132, listY + 17, '#94a3b8', 10);
      this.drawLabel(modal.valueLabel || '数量', listX + listW - 44, listY + 17, '#94a3b8', 10);

      const rows = modal.rows || [];
      const rowH = 25;
      if (modal.loading) {
        this.drawLabel('加载中...', listX + listW / 2, listY + 88, '#ffd700', 15);
      } else if (rows.length === 0) {
        this.drawLabel(modal.status || '暂无数据', listX + listW / 2, listY + 88, modal.status ? '#ffae42' : '#94a3b8', 15);
      } else {
        rows.forEach((row, index) => {
          const rowY = listY + headerH + index * rowH;
          const rankColor = row.rank === 1 ? '#ffd700' : (row.rank === 2 ? '#c0c0c0' : (row.rank === 3 ? '#cd7f32' : '#cbd5e1'));
          this.pixel.fillStyle(row.isMe ? 0x0f3b32 : 0x0d1421, row.isMe ? 0.98 : 0.88);
          this.pixel.fillRect(listX, rowY, listW, rowH - 2);
          this.pixel.lineStyle(1, row.isMe ? 0x4ec9b0 : 0x1f2937, 1);
          this.pixel.strokeRect(listX, rowY, listW, rowH - 2);
          this.drawLabel(row.medal || String(row.rank), listX + 28, rowY + 18, rankColor, row.rank <= 3 ? 12 : 10);
          this.drawLabel(String(row.username || '').slice(0, hasSide ? 14 : 22), listX + 148, rowY + 18, row.isMe ? '#4ec9b0' : '#e8e8e8', 11);
          this.drawLabel(row.valueText || '0', listX + listW - 44, rowY + 18, '#4ec9b0', 11);
        });
      }

      if (hasSide) {
        const sideX = listX + listW + 12;
        const sideW = x + w - 18 - sideX;
        this.pixel.fillStyle(0x0b1220, 0.94);
        this.pixel.fillRect(sideX, listY, sideW, 174);
        this.pixel.lineStyle(2, 0x334155, 1);
        this.pixel.strokeRect(sideX, listY, sideW, 174);
        if (modal.rewardBanner) {
          this.drawLabel('今日奖励', sideX + sideW / 2, listY + 24, '#ffd700', 13);
          this.drawLabel('第一名 5000 钻石', sideX + sideW / 2, listY + 48, '#ffd700', 11);
          this.drawLabel('每晚 23:59 结算', sideX + sideW / 2, listY + 66, '#94a3b8', 10);
        }
        const history = modal.history || [];
        if (history.length > 0) {
          this.drawLabel('近期获奖记录', sideX + sideW / 2, listY + 92, '#4ec9b0', 11);
          history.slice(0, 4).forEach((item, index) => {
            const text = `${item.date} ${item.username} ${item.catches}次 +${item.diamonds}`;
            this.drawLabel(text.slice(0, 22), sideX + sideW / 2, listY + 116 + index * 16, '#cbd5e1', 9);
          });
        }
      }

      if (modal.status && !modal.loading) this.drawLabel(modal.status, WIDTH / 2, y + h - 12, modal.status.includes('失败') ? '#ffae42' : '#4ec9b0', 11);
      this.drawButton('rank-page', '<', x + 18, y + h - 44, 34, 28, false, { delta: -1 }, modal.page <= 0);
      this.drawLabel(`${(modal.page || 0) + 1} / ${modal.pageCount || 1}`, x + 92, y + h - 36, '#ffd700', 12);
      this.drawButton('rank-page', '>', x + 128, y + h - 44, 34, 28, false, { delta: 1 }, modal.page >= (modal.pageCount || 1) - 1);
      this.drawLabel(`共 ${modal.totalRows || 0} 条`, x + 218, y + h - 36, '#94a3b8', 11);
      this.drawButton('rank-refresh', '刷新', x + w - 78, y + h - 44, 54, 28, false);
    }

    getToneColor(tone) {
      return {
        ultimate: '#ffae42',
        legendary: '#c4b5fd',
        rare: '#4ec9b0',
        coin: '#ffd700',
        diamond: '#66e6ff',
        accessory: '#e8d28a',
        common: '#94a3b8',
      }[tone] || '#ffd700';
    }

    drawGachaModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 34;
      const y = 22;
      const w = WIDTH - 68;
      const h = HEIGHT - 44;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '幸运抽奖', WIDTH / 2, y + 28, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`金币 ${modal.money || 0}   钻石 ${modal.diamonds || 0}`, x + w - 138, y + 54, '#e8e8e8', 12);

      const currencyTabs = modal.currencyTabs || [];
      currencyTabs.forEach((tab, index) => {
        this.drawButton('gacha-tab', tab.label, x + 18 + index * 100, y + 44, 92, 22, tab.active, { currency: tab.currency });
      });

      const seasonTabs = modal.seasonTabs || [];
      seasonTabs.forEach((tab, index) => {
        this.drawButton('gacha-season', tab.label, x + 18 + index * 70, y + 72, 62, 22, tab.active, { currency: tab.currency, season: tab.season });
      });

      const prizeX = x + 18;
      const prizeY = y + 106;
      const prizeW = 236;
      const prizeH = 144;
      this.pixel.fillStyle(0x0b1220, 0.96);
      this.pixel.fillRect(prizeX, prizeY, prizeW, prizeH);
      this.pixel.lineStyle(2, 0x334155, 1);
      this.pixel.strokeRect(prizeX, prizeY, prizeW, prizeH);
      this.drawLabel('奖池概率', prizeX + prizeW / 2, prizeY + 22, '#ffd700', 13);
      (modal.prizes || []).slice(0, 5).forEach((item, index) => {
        const rowY = prizeY + 34 + index * 21;
        const color = this.getToneColor(item.tone);
        this.pixel.fillStyle(0x0d1421, 0.92);
        this.pixel.fillRect(prizeX + 10, rowY, prizeW - 20, 17);
        this.pixel.lineStyle(1, Phaser.Display.Color.ValueToColor(color).color, 0.8);
        this.pixel.strokeRect(prizeX + 10, rowY, prizeW - 20, 17);
        this.drawLabel((item.label || '').slice(0, 17), prizeX + 90, rowY + 14, color, 9);
        this.drawLabel(item.chance || '', prizeX + prizeW - 38, rowY + 14, '#94a3b8', 8);
      });

      const resultX = x + 270;
      const resultY = y + 76;
      const resultW = w - 288;
      const resultH = 174;
      this.pixel.fillStyle(0x0b1220, 0.96);
      this.pixel.fillRect(resultX, resultY, resultW, resultH);
      this.pixel.lineStyle(2, 0x334155, 1);
      this.pixel.strokeRect(resultX, resultY, resultW, resultH);
      this.drawLabel('抽奖结果', resultX + resultW / 2, resultY + 22, '#4ec9b0', 13);

      const results = modal.results || [];
      if (results.length === 0) {
        this.drawLabel('选择奖池后开始抽奖', resultX + resultW / 2, resultY + 88, '#94a3b8', 12);
      } else {
        const itemW = Math.floor((resultW - 24) / 2);
        results.slice(0, 10).forEach((item, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const itemX = resultX + 8 + col * (itemW + 8);
          const itemY = resultY + 34 + row * 23;
          const color = this.getToneColor(item.tone);
          this.pixel.fillStyle(0x0d1421, 0.95);
          this.pixel.fillRect(itemX, itemY, itemW, 19);
          this.pixel.lineStyle(1, Phaser.Display.Color.ValueToColor(color).color, 0.9);
          this.pixel.strokeRect(itemX, itemY, itemW, 19);
          this.drawLabel(item.icon || '🎁', itemX + 14, itemY + 15, '#ffffff', 11);
          this.drawLabel((item.name || '').slice(0, 9), itemX + itemW / 2 + 8, itemY + 15, color, 8);
        });
      }

      const summary = modal.summary || [];
      summary.slice(0, 2).forEach((line, index) => {
        this.drawLabel(line.slice(0, 30), resultX + resultW / 2, resultY + resultH + 18 + index * 16, index === 0 ? '#ffd700' : '#4ec9b0', 9);
      });

      const buttons = modal.drawButtons || [];
      buttons.forEach((button, index) => {
        this.drawButton('gacha-draw', button.label, prizeX + index * 118, y + h - 44, 108, 28, false, {
          count: button.count,
          currency: modal.currency,
          season: modal.season,
        }, button.disabled);
      });
      if (modal.status && summary.length === 0) {
        this.drawLabel(modal.status, x + w - 154, y + h - 24, modal.status.includes('不足') || modal.status.includes('错误') ? '#ffae42' : '#4ec9b0', 11);
      }
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
