(function () {
  if (!window.Phaser) {
    console.warn('Phaser runtime missing, fallback canvas renderer will be used.');
    return;
  }

  const WORLD_WIDTH = 640;
  const WORLD_HEIGHT = 360;
  const WIDTH = 700;
  const HEIGHT = 716;
  const SCENE = { x: 30, y: 172, w: WORLD_WIDTH, h: WORLD_HEIGHT };
  const TOPBAR = { x: 0, y: 0, w: WIDTH, h: 164 };
  const GAMEBAR = { x: 0, y: 542, w: WIDTH, h: 174 };
  let sceneInstance = null;
  let pendingActionHandler = null;

  class FishingScene extends Phaser.Scene {
    constructor() {
      super('FishingScene');
      this.snapshot = null;
      this.pixel = null;
      this.overlayPixel = null;
      this.actionHandler = null;
      this.hitZones = [];
      this.overlayMode = false;
      this.drawOffsetX = 0;
      this.drawOffsetY = 0;
      this.drawScaleX = 1;
      this.drawScaleY = 1;
    }

    preload() {
      const characters = window.GAME_DATA?.CHARACTERS || [];
      characters.forEach((character) => {
        if (character.spriteImage) this.load.image(`character:${character.id}`, character.spriteImage);
      });
      this.load.image('group-qr', 'group_qr_code.jpg');
    }

    create() {
      sceneInstance = this;
      this.pixel = this.add.graphics();
      this.pixel.setDepth(0);
      this.overlayPixel = this.add.graphics();
      this.overlayPixel.setDepth(20);
      this.sceneGraphics = this.add.graphics();
      this.spriteLayer = this.add.group();
      this.textLayer = this.add.group();
      this.actionHandler = pendingActionHandler;
      this.game.canvas.tabIndex = 0;
      this.game.canvas.addEventListener('pointerdown', (event) => this.handlePointer({ event }));
    }

    setSnapshot(snapshot) {
      this.snapshot = snapshot;
    }

    update() {
      this.draw(this.snapshot || {});
    }

    setDrawTransform(x = 0, y = 0, scaleX = 1, scaleY = 1) {
      this.drawOffsetX = x;
      this.drawOffsetY = y;
      this.drawScaleX = scaleX;
      this.drawScaleY = scaleY;
    }

    drawOverlay(drawFn) {
      const basePixel = this.pixel;
      const baseOverlayMode = this.overlayMode;
      this.pixel = this.overlayPixel;
      this.overlayMode = true;
      drawFn();
      this.pixel = basePixel;
      this.overlayMode = baseOverlayMode;
    }

    mapX(x) {
      return this.drawOffsetX + x * this.drawScaleX;
    }

    mapY(y) {
      return this.drawOffsetY + y * this.drawScaleY;
    }

    px(x, y, w, h, color) {
      this.pixel.fillStyle(Phaser.Display.Color.ValueToColor(color).color, Phaser.Display.Color.ValueToColor(color).alphaGL);
      this.pixel.fillRect(
        Math.floor(this.mapX(x)),
        Math.floor(this.mapY(y)),
        Math.floor(w * this.drawScaleX),
        Math.floor(h * this.drawScaleY)
      );
    }

    line(points, color, width = 1) {
      this.pixel.lineStyle(width, Phaser.Display.Color.ValueToColor(color).color, Phaser.Display.Color.ValueToColor(color).alphaGL);
      this.pixel.beginPath();
      this.pixel.moveTo(this.mapX(points[0][0]), this.mapY(points[0][1]));
      for (let i = 1; i < points.length; i += 1) this.pixel.lineTo(this.mapX(points[i][0]), this.mapY(points[i][1]));
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
      const label = this.add.text(this.mapX(x), this.mapY(y - size), value, {
        fontFamily: 'Courier New, monospace',
        fontSize: `${Math.max(8, Math.round(size * Math.min(this.drawScaleX, this.drawScaleY)))}px`,
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(0,0,0,0.6)',
        align: 'center',
        padding: { x: 6, y: 2 },
      });
      label.setOrigin(0.5, 0);
      label.setDepth(this.overlayMode ? 30 : 10);
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
      this.hitZones.push({
        action,
        x: this.mapX(x),
        y: this.mapY(y),
        w: w * this.drawScaleX,
        h: h * this.drawScaleY,
        payload,
      });
    }

    draw(snapshot) {
      const now = Date.now() / 1000;
      const t = snapshot.time || now;
      const phase = snapshot.phase || 'idle';
      const hookX = snapshot.hookX || WORLD_WIDTH / 2;
      const hookY = snapshot.hookY || WORLD_HEIGHT * 0.55;
      const hasOverlay = !!snapshot.modal || !!(snapshot.hitbar && snapshot.hitbar.active);
      const rodSkin = snapshot.rodSkin || {
        rodColor: '#8b4513',
        rodHighlight: '#d7a15d',
        lineColor: '#e0e0e0',
      };

      this.pixel.clear();
      if (this.overlayPixel) this.overlayPixel.clear();
      this.clearLabels();
      this.clearSprites();
      this.hitZones = [];
      this.setDrawTransform();
      this.px(0, 0, WIDTH, HEIGHT, '#0d1421');

      if (snapshot.login) {
        this.drawLogin(snapshot.login, t);
        return;
      }

      this.setDrawTransform(SCENE.x, SCENE.y);
      const skyH = WORLD_HEIGHT * 0.4;
      for (let y = 0; y < skyH; y += 4) {
        const r = 135 + (255 - 135) * (y / skyH) * 0.1;
        const g = 206 + (200 - 206) * (y / skyH) * 0.1;
        const b = 235 - (235 - 180) * (y / skyH) * 0.3;
        this.px(0, y, WORLD_WIDTH, 4, `rgb(${r | 0},${g | 0},${b | 0})`);
      }

      this.pixel.fillStyle(Phaser.Display.Color.ValueToColor('#3d5a73').color);
      this.pixel.beginPath();
      this.pixel.moveTo(this.mapX(0), this.mapY(skyH));
      for (let x = 0; x <= WORLD_WIDTH; x += 20) {
        const mountainH = 30 + Math.sin(x * 0.02) * 15 + Math.sin(x * 0.05) * 8;
        this.pixel.lineTo(this.mapX(x), this.mapY(skyH - mountainH));
      }
      this.pixel.lineTo(this.mapX(WORLD_WIDTH), this.mapY(skyH));
      this.pixel.closePath();
      this.pixel.fillPath();

      this.px(0, skyH, WORLD_WIDTH, WORLD_HEIGHT - skyH, '#1e6091');
      for (let y = skyH; y < WORLD_HEIGHT; y += 6) {
        const wave = Math.sin(t * 2 + y * 0.1) * 2;
        const shade = 30 + ((y - skyH) / (WORLD_HEIGHT - skyH)) * 60;
        this.px(0, y + wave, WORLD_WIDTH, 2, `rgb(${20 + shade * 0.3 | 0},${60 + shade * 0.5 | 0},${120 + shade * 0.4 | 0})`);
      }
      for (let i = 0; i < 30; i += 1) {
        const x = (i * 47 + t * 30) % WORLD_WIDTH;
        const y = skyH + ((i * 31) % (WORLD_HEIGHT - skyH));
        this.px(x, y, 3, 1, 'rgba(255,255,255,0.5)');
      }

      this.px(WORLD_WIDTH - 80, 40, 24, 24, '#ffeb3b');
      this.px(WORLD_WIDTH - 84, 48, 32, 8, '#ffeb3b');
      this.px(WORLD_WIDTH - 80, 36, 24, 4, '#ffeb3b');

      const rodTipX = WORLD_WIDTH * 0.45 + Math.sin(t * 1.5) * 4;
      const rodTipY = WORLD_HEIGHT * 0.35;
      const rodBaseX = WORLD_WIDTH * 0.95;
      const rodBaseY = WORLD_HEIGHT + 10;

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

      this.px(WORLD_WIDTH * 0.78, WORLD_HEIGHT - 30, 30, 30, '#fdbcb4');
      this.px(WORLD_WIDTH * 0.78, WORLD_HEIGHT - 30, 30, 6, '#d99086');
      this.px(WORLD_WIDTH * 0.85, WORLD_HEIGHT - 24, 18, 18, '#fdbcb4');

      if (snapshot.pet) this.drawPet(snapshot.pet, t);

      if (!hasOverlay && phase === 'waiting') this.drawLabel('等待鱼上钩...', WORLD_WIDTH / 2, WORLD_HEIGHT - 24, '#ffffff', 12);
      if (!hasOverlay && phase === 'hooked') this.drawLabel('!!! 鱼上钩了 !!!', WORLD_WIDTH / 2, WORLD_HEIGHT - 24, '#ff5722', 16);
      this.setDrawTransform();
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(SCENE.x, SCENE.y, SCENE.w, SCENE.h);
      if (snapshot.hud) this.drawHud(snapshot.hud);
      if (snapshot.modal) this.drawOverlay(() => this.drawModal(snapshot.modal));
      if (snapshot.hitbar && snapshot.hitbar.active) this.drawOverlay(() => this.drawHitbar(snapshot.hitbar));
    }

    drawButton(action, label, x, y, w, h, active = false, payload = null, disabled = false, variant = 'default') {
      if (!disabled) this.addHitZone(action, x, y, w, h, payload);
      const isPrimary = variant === 'primary' || variant === 'primary-large';
      this.pixel.fillStyle(disabled ? 0x303642 : (active || isPrimary ? 0xd35400 : 0x1a1a2e), 0.95);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(2, disabled ? 0x64748b : (active || isPrimary ? 0xffae42 : 0xffd700), 1);
      this.pixel.strokeRect(x, y, w, h);
      const labelSize = variant === 'primary-large' ? 18 : (isPrimary ? 13 : 11);
      this.drawLabel(label, x + w / 2, y + h / 2 + 6, disabled ? '#94a3b8' : (active || isPrimary ? '#ffffff' : '#ffd700'), labelSize);
    }

    drawLogin(login, t) {
      for (let y = 0; y < HEIGHT; y += 4) {
        const mix = y / HEIGHT;
        const r = Math.round(26 + (13 - 26) * mix);
        const g = Math.round(58 + (20 - 58) * mix);
        const b = Math.round(92 + (33 - 92) * mix);
        this.px(0, y, WIDTH, 4, `rgb(${r},${g},${b})`);
      }
      const w = 380;
      const h = 360;
      const x = Math.floor((WIDTH - w) / 2);
      const y = Math.floor((HEIGHT - h) / 2);
      this.pixel.fillStyle(0x1a1a2e, 0.98);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.pixel.lineStyle(2, 0x0d1421, 1);
      this.pixel.strokeRect(x - 7, y - 7, w + 14, h + 14);
      this.pixel.lineStyle(2, 0xffd700, 1);
      this.pixel.strokeRect(x - 12, y - 12, w + 24, h + 24);

      this.drawLabel(`🎣 ${login.title || '像素钓鱼'}`, WIDTH / 2, y + 82, '#ffd700', 31);
      this.drawLabel('输入用户名开始游戏', WIDTH / 2, y + 122, '#cbd5e1', 14);

      const inputX = x + 70;
      const inputY = y + 140;
      const inputW = 240;
      this.pixel.fillStyle(0x0b1220, 0.98);
      this.pixel.fillRect(inputX, inputY, inputW, 34);
      this.pixel.lineStyle(2, 0xffd700, 1);
      this.pixel.strokeRect(inputX, inputY, inputW, 34);
      const username = login.username || '';
      const cursor = Math.floor(t * 2) % 2 === 0 && !login.loading ? '_' : '';
      this.drawLabel(username ? username + cursor : '用户名', WIDTH / 2, inputY + 25, username ? '#f0e68c' : '#64748b', 14);

      if (username) this.drawButton('login-clear', '清空', inputX, inputY + 52, 78, 38, false, null, login.loading);
      this.drawButton('login-submit', login.loading ? '登录中' : '开始钓鱼', WIDTH / 2 - 46, inputY + 52, 92, 38, false, null, login.loading);
      this.drawLabel('数据将以用户名为键保存到服务器', WIDTH / 2, y + h - 86, '#94a3b8', 11);
      if (login.status) {
        const isError = login.status.includes('失败') || login.status.includes('请输入') || login.status.includes('检测到');
        this.drawLabel(login.status.slice(0, 44), WIDTH / 2, y + h - 52, isError ? '#ffae42' : '#4ec9b0', 11);
      } else if (login.version) {
        this.drawLabel(`v${login.version}`, x + w - 34, y + h - 18, '#64748b', 10);
      }
    }

    drawHud(hud) {
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(TOPBAR.x, TOPBAR.y, TOPBAR.w, TOPBAR.h);
      this.pixel.fillRect(GAMEBAR.x, GAMEBAR.y, GAMEBAR.w, GAMEBAR.h);
      this.pixel.lineStyle(2, 0xffd700, 1);
      this.pixel.strokeRect(TOPBAR.x, TOPBAR.y, TOPBAR.w, TOPBAR.h);
      this.pixel.strokeRect(GAMEBAR.x, GAMEBAR.y, GAMEBAR.w, GAMEBAR.h);

      const actionIcons = {
        shop: '🎁',
        dex: '📖',
        rod: '🎣',
        character: '🧍',
        accessory: '💍',
        pet: '🐾',
        rank: '🏆',
        gacha: '🎰',
        redeem: '🎫',
        share: '📤',
      };
      const username = String(hud.username || '玩家');
      const usernameLabel = username.length > 18 ? `${username.slice(0, 17)}...` : username;
      this.drawLabel(usernameLabel, 88, 48, '#4ec9b0', 14);
      this.drawLabel(`💰 ${Math.floor(hud.money || 0)}`, 74, 94, '#ffd700', 15);
      this.drawLabel(`💎 ${Math.floor(hud.diamonds || 0)}`, 154, 94, '#66e6ff', 15);
      this.drawButton('version', `v${hud.version || ''}`, 18, 120, 56, 22, false);

      const actions = (hud.actions || []).filter(item => item.action !== 'logout');
      const actionLayout = [
        ['shop', 'dex', 'rod', 'character', 'accessory'],
        ['pet', 'rank', 'gacha', 'vip-auto'],
        ['redeem', 'share', 'logout'],
      ];
      const actionMap = new Map(actions.map(item => [item.action, item]));
      actionMap.set('logout', { action: 'logout', label: '退出' });
      if (hud.vipVisible) actionMap.set('vip-auto', { action: 'vip-auto', label: hud.vipLabel || 'VIP自动', active: hud.vipActive });
      const rowY = [24, 74, 124];
      const rowX = [198, 264, 424];
      const buttonW = [90, 90, 90];
      actionLayout.forEach((row, rowIndex) => {
        let x = rowX[rowIndex];
        row.forEach((action) => {
          const item = actionMap.get(action);
          if (!item) return;
          const label = actionIcons[action] ? `${actionIcons[action]} ${item.label}` : item.label;
          const width = action === 'vip-auto' ? 124 : buttonW[rowIndex];
          this.drawButton(item.action, label, x, rowY[rowIndex], width, 42, !!item.active);
          x += width + 10;
        });
      });

      const baitY = GAMEBAR.y + 44;
      this.drawLabel('当前鱼饵:', 250, baitY, '#e8e8e8', 14);
      this.drawButton('bait-next', `${hud.baitName || ''} (×${hud.baitCount || 0}) ▾`, 316, GAMEBAR.y + 26, 132, 38, false);
      this.drawLabel(`剩余 ${hud.baitCount || 0} 个`, 510, baitY, '#e8e8e8', 13);
      this.drawLabel(`🎣 ${String(hud.rodName || '').replace(/^鱼竿：/, '')}`, 282, GAMEBAR.y + 92, '#ffae42', 12);
      this.drawLabel('钓鱼高手', 370, GAMEBAR.y + 92, '#ffd700', 12);
      this.drawButton('cast', `${hud.castLabel || '抛竿钓鱼'} ${hud.phase === 'idle' ? '(空格)' : ''}`.trim(), 285, GAMEBAR.y + 104, 150, 40, hud.phase !== 'idle', null, false, 'primary');
      this.drawLabel(hud.status || '', WIDTH / 2, GAMEBAR.y + 158, '#4ec9b0', 13);
    }

    drawModal(modal) {
      if (modal.type === 'announcement') this.drawAnnouncementModal(modal);
      if (modal.type === 'rank-reward') this.drawRankRewardModal(modal);
      if (modal.type === 'shop') this.drawShopModal(modal);
      if (modal.type === 'result' || modal.type === 'miss') this.drawResultModal(modal);
      if (modal.type === 'dex') this.drawDexModal(modal);
      if (modal.type === 'rod') this.drawRodModal(modal);
      if (modal.type === 'character') this.drawCharacterModal(modal);
      if (modal.type === 'pet') this.drawPetModal(modal);
      if (modal.type === 'accessory') this.drawAccessoryModal(modal);
      if (modal.type === 'rank') this.drawRankModal(modal);
      if (modal.type === 'gacha') this.drawGachaModal(modal);
      if (modal.type === 'redeem') this.drawRedeemModal(modal);
      if (modal.type === 'share') this.drawShareModal(modal);
    }

    drawAnnouncementModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 44;
      const y = 28;
      const w = WIDTH - 88;
      const h = HEIGHT - 56;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '更新公告', WIDTH / 2, y + 30, '#ffd700', 19);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      const entries = modal.entries || [];
      let rowY = y + 58;
      entries.forEach((entry) => {
        this.drawLabel(`v${entry.version || ''}`, x + 58, rowY, '#ffd700', 13);
        this.drawLabel(entry.date || '', x + 142, rowY, '#94a3b8', 10);
        rowY += 18;
        (entry.changes || []).slice(0, 4).forEach((change) => {
          this.drawLabel(`• ${String(change).slice(0, 34)}`, x + 214, rowY, '#cbd5e1', 11);
          rowY += 16;
        });
        rowY += 7;
      });

      const page = modal.page || 0;
      const totalPages = modal.totalPages || 1;
      this.drawButton('announcement-page', '<', x + 18, y + h - 36, 34, 24, false, { delta: -1 }, page <= 0);
      this.drawLabel(`${page + 1} / ${totalPages}`, WIDTH / 2, y + h - 18, '#94a3b8', 11);
      this.drawButton('announcement-page', '>', x + w - 52, y + h - 36, 34, 24, false, { delta: 1 }, page >= totalPages - 1);
    }

    drawRankRewardModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 116;
      const y = 66;
      const w = WIDTH - 232;
      const h = HEIGHT - 132;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '排名奖励', WIDTH / 2, y + 32, '#ffd700', 20);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);
      this.drawLabel(`恭喜你在 ${modal.date || ''} 获得`, WIDTH / 2, y + 74, '#ffd700', 14);
      this.drawLabel('今日钓鱼数第一名', WIDTH / 2, y + 108, '#ffffff', 18);
      this.drawLabel(`钓鱼 ${modal.catches || 0} 次`, WIDTH / 2, y + 140, '#cbd5e1', 13);
      this.drawLabel(`钻石 +${modal.diamonds || 0}`, WIDTH / 2, y + 174, '#66e6ff', 18);
      this.drawButton('modal-close', '关闭', WIDTH / 2 - 44, y + h - 36, 88, 26, false);
    }

    drawShopModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 38;
      const y = 86;
      const w = WIDTH - 76;
      const h = HEIGHT - 100;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel('鱼饵商店', WIDTH / 2, y + 52, '#ffd700', 24);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      const adX = x + 28;
      const adY = y + 76;
      const adW = w - 56;
      const adH = 70;
      this.pixel.fillStyle(0x123d19, 1);
      this.pixel.fillRect(adX, adY, adW, adH);
      this.pixel.lineStyle(1, 0x22c55e, 1);
      this.pixel.strokeRect(adX, adY, adW, adH);
      this.drawLabel('📺', adX + 34, adY + 44, '#e8e8e8', 27);
      this.drawLabel('看广告领钻石', adX + 126, adY + 32, '#4ade80', 17);
      this.drawLabel('观看一段视频广告，免费获得 50 钻石', adX + 204, adY + 58, '#cbd5e1', 12);
      this.pixel.fillStyle(modal.adDisabled ? 0x303642 : 0x4caf50, 1);
      this.pixel.fillRect(adX + adW - 94, adY + 16, 78, 40);
      this.pixel.lineStyle(0, 0x4caf50, 0);
      if (!modal.adDisabled) this.addHitZone('shop-ad-reward', adX + adW - 94, adY + 16, 78, 40);
      this.drawLabel('免费领取', adX + adW - 55, adY + 43, modal.adDisabled ? '#94a3b8' : '#ffffff', 13);
      if (modal.status) this.drawLabel(modal.status, WIDTH / 2, y + h - 10, '#4ec9b0', 12);

      const items = modal.items || [];
      items.forEach((item, index) => {
        const cardW = Math.floor((w - 68) / 2);
        const cardH = 128;
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = x + 28 + col * (cardW + 12);
        const rowY = y + 166 + row * (cardH + 12);
        this.pixel.fillStyle(0x0d1421, 0.96);
        this.pixel.fillRect(cardX, rowY, cardW, cardH);
        this.pixel.lineStyle(2, 0x555555, 1);
        this.pixel.strokeRect(cardX, rowY, cardW, cardH);
        this.drawLabel(item.name || '', cardX + 52, rowY + 30, item.color || '#ffd700', 18);
        this.drawLabel((item.desc || '').slice(0, 18), cardX + 92, rowY + 58, '#cbd5e1', 12);
        this.drawLabel(`${item.currencyIcon || '💰'} ${item.price || 0}/个`, cardX + 62, rowY + 88, '#ffd700', 14);
        this.drawLabel(`已有 ${item.owned || 0}`, cardX + cardW - 45, rowY + 88, '#cbd5e1', 12);
        this.drawButton('shop-buy', '买 ×1', cardX + 14, rowY + 102, 74, 34, false, { id: item.id, count: 1 });
        this.drawButton('shop-buy', '买 ×10', cardX + cardW - 100, rowY + 102, 84, 34, false, { id: item.id, count: 10 });
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
        image.setDepth(this.overlayMode ? 30 : 10);
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

    drawRedeemModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 86;
      const y = 58;
      const w = WIDTH - 172;
      const h = HEIGHT - 116;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '兑换码', WIDTH / 2, y + 32, '#ffd700', 20);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      this.drawLabel('输入兑换码获取奖励', WIDTH / 2, y + 66, '#cbd5e1', 12);
      const inputX = x + 54;
      const inputY = y + 82;
      const inputW = w - 108;
      this.pixel.fillStyle(0x0b1220, 0.98);
      this.pixel.fillRect(inputX, inputY, inputW, 34);
      this.pixel.lineStyle(2, modal.canSubmit ? 0x4ec9b0 : 0x334155, 1);
      this.pixel.strokeRect(inputX, inputY, inputW, 34);
      const code = modal.code || '';
      this.drawLabel(code || '键盘输入，最多20位', WIDTH / 2, inputY + 25, code ? '#ffffff' : '#64748b', 14);
      this.drawLabel('Backspace 删除 / Enter 兑换 / Esc 关闭', WIDTH / 2, inputY + 55, '#94a3b8', 10);

      const btnY = y + 150;
      this.drawButton('redeem-paste', '粘贴', x + 72, btnY, 74, 28, false);
      this.drawButton('redeem-clear', '清空', x + 166, btnY, 74, 28, false, null, !code);
      this.drawButton('redeem-submit', '兑换', x + w - 146, btnY, 74, 28, false, null, !modal.canSubmit);
      if (modal.status) {
        const isError = modal.status.includes('失败') || modal.status.includes('错误') || modal.status.includes('请输入') || modal.status.includes('无法');
        this.drawLabel(String(modal.status).slice(0, 42), WIDTH / 2, y + h - 28, isError ? '#ffae42' : '#4ec9b0', 11);
      }
    }

    drawShareModal(modal) {
      this.pixel.fillStyle(0x000000, 0.76);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const x = 58;
      const y = 36;
      const w = WIDTH - 116;
      const h = HEIGHT - 72;
      this.pixel.fillStyle(0x1a1a2e, 1);
      this.pixel.fillRect(x, y, w, h);
      this.pixel.lineStyle(4, 0xffd700, 1);
      this.pixel.strokeRect(x, y, w, h);
      this.drawLabel(modal.title || '分享到微信', WIDTH / 2, y + 30, '#ffd700', 18);
      this.drawButton('modal-close', '×', x + w - 36, y + 8, 26, 24, false);

      const leftX = x + 28;
      const linkY = y + 82;
      this.drawLabel(modal.rewardText || '复制链接可领取奖励', leftX + 152, y + 56, '#cbd5e1', 12);
      this.pixel.fillStyle(0x0b1220, 0.98);
      this.pixel.fillRect(leftX, linkY, 318, 38);
      this.pixel.lineStyle(2, 0x334155, 1);
      this.pixel.strokeRect(leftX, linkY, 318, 38);
      this.drawLabel((modal.link || '').replace(/^https?:\/\//, '').slice(0, 34), leftX + 159, linkY + 25, '#e8e8e8', 10);
      this.drawButton('share-copy', modal.rewardClaimed ? '复制链接' : '复制领奖', leftX + 88, linkY + 56, 96, 28, false);
      const statusColor = modal.status && modal.status.includes('失败') ? '#ffae42' : '#4ec9b0';
      this.drawLabel(modal.status || '复制后打开微信发送给好友', leftX + 168, linkY + 96, statusColor, 11);

      const qrX = x + w - 132;
      const qrY = y + 70;
      this.pixel.fillStyle(0x0b1220, 0.96);
      this.pixel.fillRect(qrX - 14, qrY - 14, 124, 146);
      this.pixel.lineStyle(2, 0x334155, 1);
      this.pixel.strokeRect(qrX - 14, qrY - 14, 124, 146);
      if (this.textures.exists('group-qr')) {
        const image = this.add.image(qrX + 48, qrY + 46, 'group-qr');
        image.setOrigin(0.5);
        image.setDisplaySize(102, 102);
        image.setDepth(this.overlayMode ? 30 : 10);
        this.spriteLayer.add(image);
      } else {
        this.drawLabel('微信群二维码', qrX + 48, qrY + 48, '#94a3b8', 10);
      }
      this.drawLabel('微信群二维码', qrX + 48, qrY + 126, '#94a3b8', 10);
      this.drawLabel(modal.rewardClaimed ? '今日奖励已领取' : '今日可领取 10 金币', x + w / 2, y + h - 32, modal.rewardClaimed ? '#94a3b8' : '#ffd700', 12);
    }

    drawHitbar(hitbar) {
      this.addHitZone('cast', 0, 0, WIDTH, HEIGHT);
      this.pixel.fillStyle(0x000000, 0.82);
      this.pixel.fillRect(0, 0, WIDTH, HEIGHT);
      const color = hitbar.color || '#ffae42';
      this.drawLabel(hitbar.message || '鱼上钩了！', WIDTH / 2, 350, color, 22);
      this.drawLabel(`${hitbar.hits || 0} / ${hitbar.hitsNeeded || 0} 命中`, WIDTH / 2, 392, '#4ec9b0', 16);
      this.drawLabel(`${Math.max(0, hitbar.timeLeft || 0).toFixed(1)}s`, WIDTH / 2, 420, '#ff5722', 15);

      const barX = 100;
      const barY = 446;
      const barW = WIDTH - 200;
      const barH = 40;
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
      this.drawButton('cast', '击 中! (空格)', WIDTH / 2 - 100, 520, 200, 44, false, null, false, 'primary-large');
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
      const bx = pet.canvasX * WORLD_WIDTH;
      const by = pet.canvasY * WORLD_HEIGHT + Math.sin(t * 2) * 2;
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
