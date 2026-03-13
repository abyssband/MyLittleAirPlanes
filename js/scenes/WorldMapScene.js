// ===== Character Select Scene =====
// Replaces the old route-selection world map
// Player picks cat or panda, then auto-starts the first available route
import { AIRPORTS, ROUTES, getAirport } from '../data/routes.js';
import { easeOutCubic, easeOutElastic, breathe, pointInRect, roundRect } from '../utils/helpers.js';

export class WorldMapScene {
    constructor(ctx, canvas, input) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.input = input;
        this.time = 0;
        this.onStartGame = null; // callback(route, characterType)
        this.fadeIn = 0;

        // Character selection
        this.selectedCharacter = 'cat'; // 'cat' or 'panda'
        this.characterImages = {};
        this._loadCharacterImages();

        // Decorative clouds
        this.floatingClouds = [];
        for (let i = 0; i < 15; i++) {
            this.floatingClouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 12 + Math.random() * 30,
                speed: 5 + Math.random() * 15,
                opacity: 0.1 + Math.random() * 0.2,
            });
        }

        // Mini flying planes decoration
        this.flyingPlanes = [];
        for (let i = 0; i < 3; i++) {
            this.flyingPlanes.push({
                x: Math.random() * canvas.width,
                y: 30 + Math.random() * 60,
                speed: 25 + Math.random() * 35,
                size: 8 + Math.random() * 6,
            });
        }

        // Stars / sparkle particles
        this.sparkles = [];
        for (let i = 0; i < 20; i++) {
            this.sparkles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.7,
                phase: Math.random() * Math.PI * 2,
                size: 1.5 + Math.random() * 2.5,
            });
        }
    }

    _loadCharacterImages() {
        const assets = {
            cat_card: 'assets/sprites/cat_happy.png',
            cat_idle: 'assets/sprites/cat_neutral.png',
            panda_card: 'assets/sprites/panda_happy.png',
            panda_idle: 'assets/sprites/panda_neutral.png',
            labrador_card: 'assets/sprites/labrador_happy.png',
            labrador_idle: 'assets/sprites/labrador_fly_1.png',
        };
        Object.entries(assets).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { this.characterImages[key] = img; };
        });
    }

    _getNextRoute() {
        // Find first unlocked route, or default to first route
        const route = ROUTES.find(r => r.unlocked) || ROUTES[0];
        return route;
    }

    update(dt) {
        this.time += dt;
        this.fadeIn = Math.min(this.fadeIn + dt * 2, 1);

        // Clouds
        this.floatingClouds.forEach(c => {
            c.x += c.speed * dt;
            if (c.x > this.canvas.width + 50) c.x = -50;
        });

        // Mini planes
        this.flyingPlanes.forEach(p => {
            p.x += p.speed * dt;
            if (p.x > this.canvas.width + 30) p.x = -30;
        });

        // Check clicks
        const clicks = this.input.getClicks();
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Card layout — 3 cards
        const cardW = Math.min(w * 0.25, 160);
        const cardH = cardW * 1.35;
        const gap = Math.min(w * 0.04, 24);
        const totalW = cardW * 3 + gap * 2;
        const startX = (w - totalW) / 2;
        const cardY = h * 0.22;

        // GO button
        const btnW = 200;
        const btnH = 52;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 90;

        clicks.forEach(click => {
            // Cat card
            if (pointInRect(click.x, click.y, startX, cardY, cardW, cardH)) {
                this.selectedCharacter = 'cat';
            }
            // Panda card
            if (pointInRect(click.x, click.y, startX + cardW + gap, cardY, cardW, cardH)) {
                this.selectedCharacter = 'panda';
            }
            // Labrador card
            if (pointInRect(click.x, click.y, startX + (cardW + gap) * 2, cardY, cardW, cardH)) {
                this.selectedCharacter = 'labrador';
            }
            // GO button
            if (pointInRect(click.x, click.y, btnX, btnY, btnW, btnH)) {
                const route = this._getNextRoute();
                if (this.onStartGame) this.onStartGame(route, this.selectedCharacter);
            }
        });
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const alpha = easeOutCubic(this.fadeIn);

        ctx.globalAlpha = alpha;

        // Background gradient — warm sky
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#A8D8EA');
        bg.addColorStop(0.4, '#D4EAFF');
        bg.addColorStop(0.7, '#FCE4EC');
        bg.addColorStop(1, '#FFF8E1');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Decorative clouds
        this.floatingClouds.forEach(c => {
            this._drawMiniCloud(ctx, c.x, c.y, c.size, c.opacity);
        });

        // Sparkles
        this._drawSparkles(ctx, w, h);

        // Mini flying planes
        this.flyingPlanes.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = 0.35;
            ctx.font = `${p.size * 2}px Nunito`;
            ctx.fillText('✈️', 0, 0);
            ctx.restore();
        });
        ctx.globalAlpha = alpha;

        // Title
        const titleY = h * 0.1;
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px Nunito';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText('✈️ My Little AirPlanes', w / 2, titleY);

        ctx.font = '15px Nunito';
        ctx.fillStyle = '#7F8C8D';
        ctx.fillText('選擇你的角色  Choose Your Pilot', w / 2, titleY + 28);

        // Character cards
        this._drawCharacterCards(ctx, w, h);

        // Route preview
        this._drawRoutePreview(ctx, w, h);

        // GO button
        this._drawGoButton(ctx, w, h);

        ctx.globalAlpha = 1;
    }

    _drawCharacterCards(ctx, w, h) {
        const cardW = Math.min(w * 0.25, 160);
        const cardH = cardW * 1.35;
        const gap = Math.min(w * 0.04, 24);
        const totalW = cardW * 3 + gap * 2;
        const startX = (w - totalW) / 2;
        const cardY = h * 0.22;
        const pulse = breathe(this.time, 2);

        const chars = [
            { key: 'cat', name: '小橘', sub: 'Ginger Cat', emoji: '🐱', color: '#FFA726' },
            { key: 'panda', name: '胖達', sub: 'Panda', emoji: '🐼', color: '#78909C' },
            { key: 'labrador', name: '旺財', sub: 'Labrador', emoji: '🐕', color: '#D4A574' },
        ];

        chars.forEach((char, i) => {
            const cx = startX + i * (cardW + gap);
            const isSelected = this.selectedCharacter === char.key;
            const bounce = isSelected ? easeOutElastic(breathe(this.time, 1.5)) : 0;

            ctx.save();

            // Bounce scale for selected
            if (isSelected) {
                ctx.translate(cx + cardW / 2, cardY + cardH / 2);
                ctx.scale(1 + bounce * 0.03, 1 + bounce * 0.03);
                ctx.translate(-(cx + cardW / 2), -(cardY + cardH / 2));
            }

            // Card shadow
            ctx.fillStyle = isSelected ? 'rgba(255, 107, 157, 0.15)' : 'rgba(0, 0, 0, 0.06)';
            this._roundRectFill(ctx, cx + 4, cardY + 6, cardW, cardH, 18);

            // Card body
            ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.97)' : 'rgba(255, 255, 255, 0.75)';
            this._roundRectFill(ctx, cx, cardY, cardW, cardH, 18);

            // Border
            if (isSelected) {
                ctx.beginPath();
                this._roundRectPath(ctx, cx - 2, cardY - 2, cardW + 4, cardH + 4, 20);
                ctx.strokeStyle = `rgba(255, 107, 157, ${0.6 + pulse * 0.3})`;
                ctx.lineWidth = 3;
                ctx.stroke();

                // Glow
                ctx.beginPath();
                this._roundRectPath(ctx, cx - 5, cardY - 5, cardW + 10, cardH + 10, 22);
                ctx.strokeStyle = `rgba(255, 107, 157, ${0.12 + pulse * 0.1})`;
                ctx.lineWidth = 4;
                ctx.stroke();
            } else {
                ctx.beginPath();
                this._roundRectPath(ctx, cx, cardY, cardW, cardH, 18);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Character image
            const imgKey = `${char.key}_card`;
            const img = this.characterImages[imgKey];
            const imgPad = cardW * 0.12;
            const imgSize = cardW - imgPad * 2;
            const imgY = cardY + imgPad;

            if (img) {
                ctx.drawImage(img, cx + imgPad, imgY, imgSize, imgSize);
            } else {
                // Emoji fallback
                ctx.font = `${imgSize * 0.7}px Nunito`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char.emoji, cx + cardW / 2, imgY + imgSize / 2);
            }

            // Character name
            const nameY = imgY + imgSize + 10;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = `bold ${Math.max(16, cardW * 0.1)}px Nunito`;
            ctx.fillStyle = '#2C3E50';
            ctx.fillText(char.name, cx + cardW / 2, nameY);

            ctx.font = `${Math.max(11, cardW * 0.07)}px Nunito`;
            ctx.fillStyle = '#999';
            ctx.fillText(char.sub, cx + cardW / 2, nameY + 22);

            // Selected check mark
            if (isSelected) {
                const checkR = 14;
                const checkX = cx + cardW - checkR - 6;
                const checkY = cardY + checkR + 6;
                ctx.beginPath();
                ctx.arc(checkX, checkY, checkR, 0, Math.PI * 2);
                ctx.fillStyle = '#FF6B9D';
                ctx.fill();
                ctx.font = 'bold 14px Nunito';
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✓', checkX, checkY);
            }

            ctx.restore();
        });

        ctx.textBaseline = 'alphabetic';
    }

    _drawRoutePreview(ctx, w, h) {
        const route = this._getNextRoute();
        const from = AIRPORTS[route.from];
        const to = AIRPORTS[route.to];

        const y = h * 0.72;
        ctx.textAlign = 'center';
        ctx.font = '13px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText('接下來的航線 Next Route', w / 2, y);

        ctx.font = 'bold 18px Nunito';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(`${from.flag} ${from.name}  ✈️  ${to.flag} ${to.name}`, w / 2, y + 26);

        const diffStars = '⭐'.repeat(route.difficulty);
        ctx.font = '12px Nunito';
        ctx.fillStyle = '#AAA';
        ctx.fillText(`難度 ${diffStars}`, w / 2, y + 46);
    }

    _drawGoButton(ctx, w, h) {
        const btnW = 200;
        const btnH = 52;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 90;
        const bounce = easeOutElastic(breathe(this.time, 1.5));

        ctx.save();
        ctx.translate(w / 2, btnY + btnH / 2);
        ctx.scale(0.97 + bounce * 0.05, 0.97 + bounce * 0.05);
        ctx.translate(-w / 2, -(btnY + btnH / 2));

        // Shadow
        ctx.fillStyle = 'rgba(255, 107, 157, 0.25)';
        this._roundRectFill(ctx, btnX + 3, btnY + 5, btnW, btnH, 26);

        // Button gradient
        const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        grad.addColorStop(0, '#FF6B9D');
        grad.addColorStop(1, '#FF4778');
        ctx.fillStyle = grad;
        this._roundRectFill(ctx, btnX, btnY, btnW, btnH, 26);

        // Text
        ctx.font = 'bold 22px Nunito';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('出發！GO ✈️', w / 2, btnY + btnH / 2 + 8);

        ctx.restore();
    }

    _drawSparkles(ctx, w, h) {
        this.sparkles.forEach(s => {
            const t = this.time + s.phase;
            const a = Math.max(0, Math.sin(t * 0.8) * 0.4 + 0.1);
            if (a < 0.05) return;

            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#FFE082';
            ctx.translate(s.x, s.y);

            const r = s.size + Math.sin(t * 1.5) * 1;
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
                const angle = (j / 4) * Math.PI * 2 + t * 0.5;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                const a2 = angle + Math.PI / 4;
                ctx.lineTo(Math.cos(a2) * r * 0.3, Math.sin(a2) * r * 0.3);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    _drawMiniCloud(ctx, x, y, size, opacity) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y - size * 0.1, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.2, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _roundRectFill(ctx, x, y, w, h, r) {
        ctx.beginPath();
        this._roundRectPath(ctx, x, y, w, h, r);
        ctx.fill();
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }
}
