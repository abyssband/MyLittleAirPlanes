// ===== PowerUp Entity =====
// Collectible power-ups during flight

export class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'speed_boost', 'shield', 'magnet', 'star'
        this.time = Math.random() * 10;
        this.collected = false;
        this.baseY = y;
        this.size = 18;

        this.config = {
            speed_boost: { color: '#FF6B35', icon: '⚡', duration: 3, glow: '#FFB088' },
            shield: { color: '#4ECDC4', icon: '🛡️', duration: 5, glow: '#A8ECE7' },
            magnet: { color: '#C77DFF', icon: '🧲', duration: 4, glow: '#E0B0FF' },
            star: { color: '#FFD700', icon: '⭐', duration: 0, glow: '#FFF3B0' },
        }[type];
    }

    update(dt) {
        this.time += dt;
        this.y = this.baseY + Math.sin(this.time * 2) * 8;
    }

    checkCollision(planeX, planeY, planeRadius = 25) {
        if (this.collected) return false;
        const dx = planeX - this.x;
        const dy = planeY - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < this.size + planeRadius) {
            this.collected = true;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX) {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX < -50 || screenX > ctx.canvas.width / (window.devicePixelRatio || 1) + 50) return;

        const c = this.config;
        const pulse = 1 + Math.sin(this.time * 3) * 0.1;
        const r = this.size * pulse;

        // Glow
        ctx.beginPath();
        ctx.arc(screenX, this.y, r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = c.glow.replace(')', ', 0.2)').replace('rgb', 'rgba');
        // Fallback for hex colors
        ctx.globalAlpha = 0.2 + Math.sin(this.time * 4) * 0.1;
        const glowGrad = ctx.createRadialGradient(screenX, this.y, r * 0.3, screenX, this.y, r * 1.8);
        glowGrad.addColorStop(0, c.glow);
        glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glowGrad;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Circle background
        ctx.beginPath();
        ctx.arc(screenX, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(screenX - r * 0.2, this.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();

        // Icon
        ctx.font = `${r}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.icon, screenX, this.y + 1);
    }
}
