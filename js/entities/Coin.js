// ===== Coin Entity =====
import { circleCollision } from '../utils/helpers.js';

export class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.collected = false;
        this.time = Math.random() * Math.PI * 2;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.sparkles = [];
        this.collectAnim = 0;
    }

    update(dt) {
        this.time += dt;
        if (this.collected) {
            this.collectAnim += dt * 4;
        }

        // Sparkle particles
        if (!this.collected && Math.random() < 0.05) {
            this.sparkles.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y + (Math.random() - 0.5) * 20,
                life: 1,
                size: 1 + Math.random() * 2,
            });
        }
        this.sparkles = this.sparkles.filter(s => {
            s.life -= dt * 2;
            s.y -= 15 * dt;
            return s.life > 0;
        });
    }

    checkCollision(planeX, planeY, planeW) {
        if (this.collected) return false;
        if (circleCollision(this.x, this.y, this.radius, planeX, planeY, planeW * 0.4)) {
            this.collected = true;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX) {
        if (this.collected && this.collectAnim > 1) return;

        const screenX = this.x - cameraX;
        const bob = Math.sin(this.time * 2 + this.bobOffset) * 4;
        const scale = this.collected ? 1 + this.collectAnim * 2 : 1;
        const alpha = this.collected ? 1 - this.collectAnim : 1;

        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(screenX, this.y + bob);
        ctx.scale(scale, scale);

        // Coin body
        const squeeze = Math.cos(this.time * 3) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * squeeze, this.radius, 0, 0, Math.PI * 2);
        const coinGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, this.radius);
        coinGrad.addColorStop(0, '#FFE44D');
        coinGrad.addColorStop(0.7, '#FFD700');
        coinGrad.addColorStop(1, '#DAA520');
        ctx.fillStyle = coinGrad;
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Star symbol on coin
        if (squeeze > 0.5) {
            ctx.fillStyle = '#DAA520';
            ctx.font = `bold ${this.radius}px Nunito`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 1);
        }

        ctx.restore();

        // Draw sparkles
        this.sparkles.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x - cameraX, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${s.life})`;
            ctx.fill();
        });

        ctx.globalAlpha = 1;
    }
}
