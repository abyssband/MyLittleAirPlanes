// ===== Cloud Entity =====
// Enhanced with 3D shading, volume, kawaii faces, and fog effect

export class Cloud {
    constructor(x, y, size = 40) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.time = Math.random() * 10;
        this.bobSpeed = 0.3 + Math.random() * 0.3;
        this.bobAmount = 3 + Math.random() * 5;
        this.baseY = y;

        // Some clouds get cute faces!
        this.hasFace = Math.random() < 0.25;
        this.faceBlinkTimer = 2 + Math.random() * 3;
        this.faceBlinking = false;

        // Random puff configuration for unique shapes
        this.puffs = [];
        const numPuffs = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numPuffs; i++) {
            this.puffs.push({
                ox: (i - numPuffs / 2) * size * 0.5 + (Math.random() - 0.5) * size * 0.3,
                oy: (Math.random() - 0.5) * size * 0.3,
                r: size * (0.35 + Math.random() * 0.35),
            });
        }
    }

    update(dt) {
        this.time += dt;
        this.y = this.baseY + Math.sin(this.time * this.bobSpeed) * this.bobAmount;

        // Blink timer for face
        if (this.hasFace) {
            this.faceBlinkTimer -= dt;
            if (this.faceBlinkTimer <= 0) {
                this.faceBlinking = !this.faceBlinking;
                this.faceBlinkTimer = this.faceBlinking ? 0.15 : 2.5 + Math.random() * 3;
            }
        }
    }

    draw(ctx, cameraX) {
        const screenX = this.x - cameraX * 0.4; // clouds move slower for depth
        const screenY = this.y;

        // Skip if offscreen
        if (screenX < -this.size * 3 || screenX > ctx.canvas.width / (window.devicePixelRatio || 1) + this.size * 3) return;

        ctx.save();

        // Bottom shadow for 3D effect
        ctx.fillStyle = 'rgba(180, 200, 220, 0.15)';
        this.puffs.forEach(p => {
            ctx.beginPath();
            ctx.ellipse(screenX + p.ox, screenY + p.r * 0.3, p.r * 0.9, p.r * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // Main cloud body (white)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        this.puffs.forEach(p => {
            ctx.moveTo(screenX + p.ox + p.r, screenY + p.oy);
            ctx.arc(screenX + p.ox, screenY + p.oy, p.r, 0, Math.PI * 2);
        });
        ctx.fill();

        // Top highlight for volume
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.puffs.forEach(p => {
            ctx.beginPath();
            ctx.arc(
                screenX + p.ox - p.r * 0.15,
                screenY + p.oy - p.r * 0.25,
                p.r * 0.55,
                0, Math.PI * 2
            );
            ctx.fill();
        });

        // Kawaii face on some clouds
        if (this.hasFace && this.size > 35) {
            this._drawFace(ctx, screenX, screenY);
        }

        ctx.restore();
    }

    _drawFace(ctx, x, y) {
        const s = this.size * 0.02;
        const eyeSpacing = 8 * s;
        const eyeY = y - 2 * s;
        const eyeR = 2.5 * s;

        if (this.faceBlinking) {
            // Happy closed eyes
            ctx.strokeStyle = 'rgba(120, 140, 160, 0.5)';
            ctx.lineWidth = 1.5 * s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(x - eyeSpacing, eyeY, eyeR * 0.8, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            // Open eyes
            ctx.fillStyle = 'rgba(80, 100, 120, 0.5)';
            ctx.beginPath();
            ctx.arc(x - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(x - eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Blush
        ctx.beginPath();
        ctx.ellipse(x - eyeSpacing * 1.5, y + 3 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 180, 200, 0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + eyeSpacing * 1.5, y + 3 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(x, y + 3 * s, 4 * s, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = 'rgba(120, 140, 160, 0.4)';
        ctx.lineWidth = 1.2 * s;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // Check if plane is inside cloud for fog effect
    isPlaneInside(planeX, planeY) {
        const dx = planeX - this.x;
        const dy = planeY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.size * 1.5;
    }
}
