// ===== Landmark Entity =====
// Famous landmarks that appear during flight based on route theme

export class Landmark {
    constructor(x, groundY, type) {
        this.x = x;
        this.groundY = groundY;
        this.type = type;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
    }

    draw(ctx, cameraX) {
        const screenX = this.x - cameraX;
        if (screenX < -200 || screenX > ctx.canvas.width / (window.devicePixelRatio || 1) + 200) return;

        ctx.save();
        ctx.translate(screenX, this.groundY);

        switch (this.type) {
            case 'tokyo_tower': this._drawTokyoTower(ctx); break;
            case 'eiffel': this._drawEiffel(ctx); break;
            case 'statue_liberty': this._drawStatueOfLiberty(ctx); break;
            case 'pyramid': this._drawPyramid(ctx); break;
            case 'opera_house': this._drawOperaHouse(ctx); break;
            case 'torii': this._drawTorii(ctx); break;
            case 'big_ben': this._drawBigBen(ctx); break;
            case 'pagoda': this._drawPagoda(ctx); break;
        }

        ctx.restore();
    }

    _drawTokyoTower(ctx) {
        const h = 120;
        // Main structure - red/orange lattice
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 3;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-6, -h);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(6, -h);
        ctx.stroke();
        // Cross beams
        for (let i = 1; i < 6; i++) {
            const y = -i * (h / 6);
            const w = 25 * (1 - i / 7);
            ctx.beginPath();
            ctx.moveTo(-w, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        // Top antenna
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(-2, -h - 20, 4, 20);
        // Observation deck
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(-12, -h * 0.55, 24, 8);
        ctx.fillRect(-8, -h * 0.75, 16, 6);
        // Light
        const blink = Math.sin(this.time * 3) > 0;
        if (blink) {
            ctx.beginPath();
            ctx.arc(0, -h - 22, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FF0000';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -h - 22, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fill();
        }
    }

    _drawEiffel(ctx) {
        const h = 130;
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 2.5;
        // Left leg (curved)
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.quadraticCurveTo(-20, -h * 0.4, -5, -h);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.quadraticCurveTo(20, -h * 0.4, 5, -h);
        ctx.stroke();
        // Cross beams
        ctx.lineWidth = 2;
        for (let i = 1; i < 5; i++) {
            const y = -i * (h / 5);
            const w = 28 * (1 - i / 6);
            ctx.beginPath();
            ctx.moveTo(-w, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        // Platform decks
        ctx.fillStyle = '#9B8B75';
        ctx.fillRect(-18, -h * 0.35, 36, 5);
        ctx.fillRect(-10, -h * 0.65, 20, 4);
        // Top antenna
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(-1.5, -h - 15, 3, 18);
        // Arch
        ctx.beginPath();
        ctx.arc(0, -h * 0.15, 15, Math.PI, 0);
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _drawStatueOfLiberty(ctx) {
        const h = 100;
        // Pedestal
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(-15, -25, 30, 25);
        ctx.fillStyle = '#B0B0B0';
        ctx.fillRect(-20, -5, 40, 5);
        // Body
        ctx.fillStyle = '#5DAE8B';
        ctx.beginPath();
        ctx.moveTo(-10, -25);
        ctx.lineTo(-12, -h * 0.6);
        ctx.lineTo(-6, -h * 0.85);
        ctx.lineTo(0, -h * 0.9);
        ctx.lineTo(6, -h * 0.85);
        ctx.lineTo(10, -h * 0.6);
        ctx.lineTo(12, -25);
        ctx.closePath();
        ctx.fill();
        // Torch arm (right, raised)
        ctx.beginPath();
        ctx.moveTo(3, -h * 0.85);
        ctx.lineTo(10, -h);
        ctx.lineTo(12, -h);
        ctx.lineTo(6, -h * 0.82);
        ctx.closePath();
        ctx.fill();
        // Torch flame
        ctx.beginPath();
        ctx.arc(11, -h - 5, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        // Crown
        ctx.fillStyle = '#5DAE8B';
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI * 0.8 + i * 0.35;
            ctx.fillRect(
                Math.cos(angle) * 8 - 1, -h * 0.9 + Math.sin(angle) * 8,
                2, -6
            );
        }
    }

    _drawPyramid(ctx) {
        // Great Pyramid
        ctx.beginPath();
        ctx.moveTo(0, -80);
        ctx.lineTo(-60, 0);
        ctx.lineTo(60, 0);
        ctx.closePath();
        ctx.fillStyle = '#E8C97A';
        ctx.fill();
        // Shading side
        ctx.beginPath();
        ctx.moveTo(0, -80);
        ctx.lineTo(5, 0);
        ctx.lineTo(60, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        // Stone texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            const y = -i * 13;
            const w = 55 * (1 - i / 7);
            ctx.beginPath();
            ctx.moveTo(-w, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    _drawOperaHouse(ctx) {
        // Sydney Opera House sails
        ctx.fillStyle = '#F5F5F5';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-20 + i * 18, 0);
            ctx.quadraticCurveTo(-10 + i * 18, -55 - i * 5, 5 + i * 18, 0);
            ctx.fill();
            ctx.strokeStyle = '#DDD';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Base
        ctx.fillStyle = '#D4C4A0';
        ctx.fillRect(-25, -3, 75, 6);
    }

    _drawTorii(ctx) {
        const h = 60;
        // Pillars
        ctx.fillStyle = '#CC3333';
        ctx.fillRect(-25, -h, 5, h);
        ctx.fillRect(20, -h, 5, h);
        // Top beam (kasagi)
        ctx.fillRect(-32, -h - 4, 64, 6);
        // Second beam (nuki)
        ctx.fillRect(-28, -h * 0.75, 56, 4);
        // Curved top
        ctx.beginPath();
        ctx.moveTo(-35, -h - 4);
        ctx.quadraticCurveTo(0, -h - 15, 35, -h - 4);
        ctx.lineTo(35, -h - 1);
        ctx.quadraticCurveTo(0, -h - 10, -35, -h - 1);
        ctx.closePath();
        ctx.fillStyle = '#CC3333';
        ctx.fill();
    }

    _drawBigBen(ctx) {
        const h = 110;
        // Tower body
        ctx.fillStyle = '#D4C4A0';
        ctx.fillRect(-12, -h, 24, h);
        ctx.strokeStyle = '#B8A880';
        ctx.lineWidth = 1;
        ctx.strokeRect(-12, -h, 24, h);
        // Clock face
        ctx.beginPath();
        ctx.arc(0, -h * 0.7, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFF0';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Clock hands
        const hour = (this.time * 0.1) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.7);
        ctx.lineTo(Math.cos(hour) * 6, -h * 0.7 + Math.sin(hour) * 6);
        ctx.stroke();
        // Spire
        ctx.fillStyle = '#B8A880';
        ctx.beginPath();
        ctx.moveTo(-8, -h);
        ctx.lineTo(0, -h - 20);
        ctx.lineTo(8, -h);
        ctx.closePath();
        ctx.fill();
    }

    _drawPagoda(ctx) {
        const h = 80;
        const floors = 5;
        for (let i = 0; i < floors; i++) {
            const y = -i * (h / floors);
            const fw = 25 - i * 3;
            const fh = h / floors - 3;
            // Floor body
            ctx.fillStyle = '#C9302C';
            ctx.fillRect(-fw / 2, y - fh, fw, fh);
            // Roof eaves
            ctx.beginPath();
            ctx.moveTo(-fw / 2 - 8, y - fh);
            ctx.quadraticCurveTo(0, y - fh - 6, fw / 2 + 8, y - fh);
            ctx.lineTo(fw / 2 + 5, y - fh + 2);
            ctx.quadraticCurveTo(0, y - fh - 3, -fw / 2 - 5, y - fh + 2);
            ctx.closePath();
            ctx.fillStyle = '#8B0000';
            ctx.fill();
        }
        // Top finial
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-1.5, -h - 10, 3, 12);
        ctx.beginPath();
        ctx.arc(0, -h - 12, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
