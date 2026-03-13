// ===== Result Scene =====
import { easeOutCubic, easeOutBounce, easeOutElastic, breathe, roundRect } from '../utils/helpers.js';
import { getAirport, unlockRoutesFrom } from '../data/routes.js';

export class ResultScene {
    constructor(ctx, canvas, input, result) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.input = input;
        this.result = result;
        this.time = 0;
        this.onBackToMap = null;
        this.fadeIn = 0;

        // Unlock connected routes
        unlockRoutesFrom(result.route.to);

        // Update route stats
        if (result.stars > result.route.stars) {
            result.route.stars = result.stars;
        }

        // Animation states
        this.starsRevealed = 0;
        this.coinCountAnim = 0;
        this.particleEffects = [];

        // Generate celebration particles
        for (let i = 0; i < 30; i++) {
            this.particleEffects.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 300,
                y: canvas.height / 2 + (Math.random() - 0.5) * 200,
                vx: (Math.random() - 0.5) * 100,
                vy: -50 - Math.random() * 100,
                size: 3 + Math.random() * 5,
                color: ['#FF6B9D', '#FFD700', '#5BCEFA', '#2ED573', '#FF4757'][Math.floor(Math.random() * 5)],
                life: 1 + Math.random(),
                rotation: Math.random() * Math.PI * 2,
            });
        }
    }

    update(dt) {
        this.time += dt;
        this.fadeIn = Math.min(this.fadeIn + dt * 2, 1);

        // Star reveal animation (staggered)
        if (this.time > 0.5) this.starsRevealed = Math.min(this.starsRevealed + dt * 2, this.result.stars);

        // Coin count animation
        this.coinCountAnim = Math.min(this.coinCountAnim + dt * 1.5, 1);

        // Particles
        this.particleEffects = this.particleEffects.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt;
            p.life -= dt;
            p.rotation += dt * 3;
            return p.life > 0;
        });

        // Check click on button
        const clicks = this.input.getClicks();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const btnW = 180;
        const btnH = 50;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 100;

        clicks.forEach(click => {
            if (click.x >= btnX && click.x <= btnX + btnW &&
                click.y >= btnY && click.y <= btnY + btnH) {
                if (this.onBackToMap) this.onBackToMap();
            }
        });
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const alpha = easeOutCubic(this.fadeIn);

        ctx.globalAlpha = alpha;

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#FDE2C8');
        bg.addColorStop(0.5, '#FCEADC');
        bg.addColorStop(1, '#E8D8FF');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Decorative circles in background
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(
                w * (0.1 + i * 0.18),
                h * (0.3 + Math.sin(i * 1.5 + this.time * 0.5) * 0.1),
                30 + i * 10,
                0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 107, 157, ${0.05 + i * 0.01})`;
            ctx.fill();
        }

        // Celebration particles
        this.particleEffects.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
        ctx.globalAlpha = alpha;

        // Result card
        const cardW = Math.min(w * 0.85, 400);
        const cardH = 320;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2 - 20;

        // Card shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        roundRect(ctx, cardX + 4, cardY + 6, cardW, cardH, 20);
        ctx.fill();

        // Card background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        roundRect(ctx, cardX, cardY, cardW, cardH, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 107, 157, 0.2)';
        ctx.lineWidth = 2;
        roundRect(ctx, cardX, cardY, cardW, cardH, 20);
        ctx.stroke();

        // Landing text
        const fromInfo = getAirport(this.result.route.from);
        const toInfo = getAirport(this.result.route.to);

        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText(`${fromInfo.flag} ${fromInfo.code}  →  ${toInfo.flag} ${toInfo.code}`, w / 2, cardY + 35);

        // Landing quality text
        ctx.font = 'bold 28px Nunito';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(this.result.landingText, w / 2, cardY + 75);

        // Stars
        const starY = cardY + 120;
        const starSize = 40;
        const starSpacing = 55;
        const starStartX = w / 2 - (starSpacing * (3 - 1)) / 2;

        for (let i = 0; i < 3; i++) {
            const sx = starStartX + i * starSpacing;
            const revealed = i < Math.floor(this.starsRevealed);
            const revealing = i < this.starsRevealed && !revealed;

            ctx.save();
            if (revealed) {
                const bounceT = easeOutBounce(Math.min((this.starsRevealed - i) * 2, 1));
                const scale = bounceT;
                ctx.translate(sx, starY);
                ctx.scale(scale, scale);
                ctx.font = `${starSize}px Nunito`;
                ctx.fillText('⭐', 0, starSize * 0.35);
            } else if (revealing) {
                const t = this.starsRevealed - i;
                const scale = easeOutElastic(t);
                ctx.translate(sx, starY);
                ctx.scale(scale, scale);
                ctx.font = `${starSize}px Nunito`;
                ctx.fillText('⭐', 0, starSize * 0.35);
            } else {
                ctx.translate(sx, starY);
                ctx.font = `${starSize * 0.8}px Nunito`;
                ctx.globalAlpha = 0.2;
                ctx.fillText('☆', 0, starSize * 0.35);
                ctx.globalAlpha = alpha;
            }
            ctx.restore();
        }

        // Divider
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 40, cardY + 160);
        ctx.lineTo(cardX + cardW - 40, cardY + 160);
        ctx.stroke();

        // Stats
        const statsY = cardY + 195;
        const statsLeft = cardX + 50;
        const statsRight = cardX + cardW - 50;

        // Coins
        ctx.textAlign = 'left';
        ctx.font = '14px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText('🪙 金幣', statsLeft, statsY);
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px Nunito';
        ctx.fillStyle = '#DAA520';
        const displayCoins = Math.floor(this.coinCountAnim * this.result.coinsCollected);
        ctx.fillText(`${displayCoins}`, statsRight, statsY);

        // Flight time
        ctx.textAlign = 'left';
        ctx.font = '14px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText('⏱ 飛行時間', statsLeft, statsY + 40);
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px Nunito';
        ctx.fillStyle = '#2C3E50';
        const minutes = Math.floor(this.result.flightTime / 60);
        const seconds = Math.floor(this.result.flightTime % 60);
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, statsRight, statsY + 40);

        // Max altitude
        ctx.textAlign = 'left';
        ctx.font = '14px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText('📏 最高高度', statsLeft, statsY + 80);
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px Nunito';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(`${Math.floor(this.result.maxAltitude * 3)}m`, statsRight, statsY + 80);

        // Back to map button
        const btnW = 180;
        const btnH = 50;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 100;
        const bounce = breathe(this.time, 1.5);

        ctx.save();
        ctx.translate(w / 2, btnY + btnH / 2);
        ctx.scale(1 + bounce * 0.03, 1 + bounce * 0.03);
        ctx.translate(-w / 2, -(btnY + btnH / 2));

        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        btnGrad.addColorStop(0, '#5BCEFA');
        btnGrad.addColorStop(1, '#4AB8D8');
        ctx.fillStyle = btnGrad;
        roundRect(ctx, btnX, btnY, btnW, btnH, 25);
        ctx.fill();

        ctx.shadowColor = 'rgba(91, 206, 250, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        roundRect(ctx, btnX, btnY, btnW, btnH, 25);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.font = 'bold 18px Nunito';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('🗺️ 返回地圖', w / 2, btnY + btnH / 2 + 6);
        ctx.restore();

        ctx.globalAlpha = 1;
    }
}
