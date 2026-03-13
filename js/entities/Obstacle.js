// ===== Obstacle Entity =====
// Mountains, birds, hot air balloons that the plane must avoid

export class Obstacle {
    constructor(x, y, type, config = {}) {
        this.x = x;
        this.y = y;
        this.type = type; // 'mountain', 'bird', 'balloon', 'cloud_storm'
        this.time = Math.random() * 10;
        this.alive = true;
        this.hit = false;
        this.hitFlash = 0;

        // Size/collision
        switch (type) {
            case 'mountain':
                this.width = config.width || 80 + Math.random() * 60;
                this.height = config.height || 100 + Math.random() * 80;
                this.collisionRadius = Math.min(this.width, this.height) * 0.35;
                this.speed = 0; // static
                break;
            case 'bird':
                this.width = 25;
                this.height = 15;
                this.collisionRadius = 15;
                this.speed = 60 + Math.random() * 40; // moves left
                this.wingPhase = Math.random() * Math.PI * 2;
                this.floatY = y;
                this.floatAmp = 15 + Math.random() * 20;
                this.floatSpeed = 1 + Math.random() * 0.5;
                break;
            case 'balloon':
                this.width = 35;
                this.height = 50;
                this.collisionRadius = 22;
                this.speed = 20 + Math.random() * 20;
                this.floatY = y;
                this.floatAmp = 10 + Math.random() * 15;
                this.floatSpeed = 0.5 + Math.random() * 0.3;
                this.color = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BD6'][Math.floor(Math.random() * 5)];
                break;
            case 'cloud_storm':
                this.width = 80;
                this.height = 50;
                this.collisionRadius = 35;
                this.speed = 0;
                this.lightningTimer = 2 + Math.random() * 3;
                this.lightningFlash = 0;
                break;
        }
    }

    update(dt) {
        this.time += dt;

        if (this.hitFlash > 0) this.hitFlash -= dt * 3;

        switch (this.type) {
            case 'bird':
                this.x -= this.speed * dt;
                this.wingPhase += dt * 8;
                this.y = this.floatY + Math.sin(this.time * this.floatSpeed) * this.floatAmp;
                break;
            case 'balloon':
                this.x -= this.speed * dt;
                this.y = this.floatY + Math.sin(this.time * this.floatSpeed) * this.floatAmp;
                break;
            case 'cloud_storm':
                this.lightningTimer -= dt;
                if (this.lightningTimer <= 0) {
                    this.lightningFlash = 0.3;
                    this.lightningTimer = 1.5 + Math.random() * 3;
                }
                if (this.lightningFlash > 0) this.lightningFlash -= dt * 2;
                break;
        }
    }

    checkCollision(planeX, planeY, planeRadius = 20) {
        if (this.hit) return false;
        let cx = this.x;
        let cy = this.type === 'mountain' ? this.y - this.height * 0.4 : this.y;
        const dx = planeX - cx;
        const dy = planeY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.collisionRadius + planeRadius) {
            this.hit = true;
            this.hitFlash = 1;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX) {
        const screenX = this.x - cameraX;
        if (screenX < -150 || screenX > ctx.canvas.width / (window.devicePixelRatio || 1) + 150) return;

        ctx.save();

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(this.time * 30) * 0.3;
        }

        switch (this.type) {
            case 'mountain': this._drawMountain(ctx, screenX); break;
            case 'bird': this._drawBird(ctx, screenX); break;
            case 'balloon': this._drawBalloon(ctx, screenX); break;
            case 'cloud_storm': this._drawStormCloud(ctx, screenX); break;
        }

        ctx.restore();
    }

    _drawMountain(ctx, screenX) {
        const baseY = this.y;
        const w = this.width;
        const h = this.height;

        // Mountain body
        ctx.beginPath();
        ctx.moveTo(screenX - w / 2, baseY);
        ctx.lineTo(screenX - w * 0.1, baseY - h);
        ctx.lineTo(screenX + w * 0.1, baseY - h * 0.95);
        ctx.lineTo(screenX + w / 2, baseY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(screenX, baseY - h, screenX, baseY);
        grad.addColorStop(0, '#8B7355');
        grad.addColorStop(0.3, '#9B8365');
        grad.addColorStop(1, '#6B5B4B');
        ctx.fillStyle = grad;
        ctx.fill();

        // Snow cap
        if (h > 120) {
            ctx.beginPath();
            ctx.moveTo(screenX - w * 0.15, baseY - h * 0.8);
            ctx.lineTo(screenX - w * 0.1, baseY - h);
            ctx.lineTo(screenX + w * 0.1, baseY - h * 0.95);
            ctx.lineTo(screenX + w * 0.12, baseY - h * 0.78);
            ctx.closePath();
            ctx.fillStyle = '#F5F5F5';
            ctx.fill();
        }

        // Danger sign (⚠️ visual warning)
        ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', screenX, baseY - h - 10);
    }

    _drawBird(ctx, screenX) {
        const screenY = this.y;
        const wing = Math.sin(this.wingPhase) * 12;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Left wing
        ctx.beginPath();
        ctx.moveTo(screenX - 2, screenY);
        ctx.quadraticCurveTo(screenX - 10, screenY + wing, screenX - 18, screenY + wing * 0.5);
        ctx.stroke();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(screenX + 2, screenY);
        ctx.quadraticCurveTo(screenX + 10, screenY + wing, screenX + 18, screenY + wing * 0.5);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
    }

    _drawBalloon(ctx, screenX) {
        const screenY = this.y;

        // Basket ropes
        ctx.strokeStyle = '#8B6F4E';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX - 8, screenY + 20);
        ctx.lineTo(screenX - 12, screenY - 5);
        ctx.moveTo(screenX + 8, screenY + 20);
        ctx.lineTo(screenX + 12, screenY - 5);
        ctx.stroke();

        // Balloon envelope
        ctx.beginPath();
        ctx.ellipse(screenX, screenY - 15, 18, 25, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.ellipse(screenX - 5, screenY - 22, 6, 10, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();

        // Stripes
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY - 15, 14, -0.8, 0.8);
        ctx.stroke();

        // Basket
        ctx.fillStyle = '#8B6F4E';
        ctx.fillRect(screenX - 8, screenY + 18, 16, 10);
        ctx.strokeStyle = '#6B4F2E';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 8, screenY + 18, 16, 10);
    }

    _drawStormCloud(ctx, screenX) {
        const screenY = this.y;

        // Dark cloud body
        ctx.fillStyle = 'rgba(80, 80, 100, 0.8)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 30, 0, Math.PI * 2);
        ctx.arc(screenX + 25, screenY + 5, 22, 0, Math.PI * 2);
        ctx.arc(screenX - 20, screenY + 3, 20, 0, Math.PI * 2);
        ctx.arc(screenX + 10, screenY - 15, 18, 0, Math.PI * 2);
        ctx.fill();

        // Lightning bolt
        if (this.lightningFlash > 0) {
            ctx.strokeStyle = `rgba(255, 255, 100, ${this.lightningFlash * 3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX + 5, screenY + 20);
            ctx.lineTo(screenX - 3, screenY + 35);
            ctx.lineTo(screenX + 5, screenY + 33);
            ctx.lineTo(screenX - 2, screenY + 50);
            ctx.stroke();

            // Glow
            ctx.beginPath();
            ctx.arc(screenX, screenY + 35, 15, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 150, ${this.lightningFlash * 0.3})`;
            ctx.fill();
        }

        // ⚡ warning
        ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', screenX, screenY - 30);
    }
}
