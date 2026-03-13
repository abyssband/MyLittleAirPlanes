// ===== Airport Entity =====

export class Airport {
    constructor(x, y, name, code, isDestination = false) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.code = code;
        this.isDestination = isDestination;
        this.time = 0;
        this.runwayWidth = 600;    // long runway for braking
        this.runwayHeight = 12;

        // Landing zone (generous for forgiving gameplay)
        this.landingZoneX = x - 300;
        this.landingZoneWidth = 700;
        this.landingZoneY = y;
    }

    update(dt) {
        this.time += dt;
    }

    draw(ctx, cameraX, canvasH) {
        const screenX = this.x - cameraX;
        const groundY = this.y;

        // Runway
        ctx.fillStyle = '#555';
        ctx.fillRect(screenX - this.runwayWidth / 2, groundY - 2, this.runwayWidth, this.runwayHeight);

        // Runway markings (dashed center line)
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(screenX - this.runwayWidth / 2 + 20, groundY + 4);
        ctx.lineTo(screenX + this.runwayWidth / 2 - 20, groundY + 4);
        ctx.stroke();
        ctx.setLineDash([]);

        // Runway edge markings
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX - this.runwayWidth / 2, groundY - 2);
        ctx.lineTo(screenX + this.runwayWidth / 2, groundY - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX - this.runwayWidth / 2, groundY + this.runwayHeight);
        ctx.lineTo(screenX + this.runwayWidth / 2, groundY + this.runwayHeight);
        ctx.stroke();

        // Terminal building
        const bw = 60, bh = 45;
        const bx = screenX - 20;
        const by = groundY - bh - 8;

        // Building body
        ctx.fillStyle = '#F5E6D3';
        ctx.strokeStyle = '#D4C4B0';
        ctx.lineWidth = 2;
        this._roundRect(ctx, bx, by, bw, bh, 5);
        ctx.fill();
        ctx.stroke();

        // Roof
        ctx.fillStyle = '#FF8FAE';
        this._roundRect(ctx, bx - 5, by - 8, bw + 10, 12, 4);
        ctx.fill();

        // Windows
        ctx.fillStyle = '#87CEEB';
        for (let i = 0; i < 3; i++) {
            this._roundRect(ctx, bx + 8 + i * 18, by + 10, 12, 12, 2);
            ctx.fill();
            // Window shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(bx + 9 + i * 18, by + 11, 4, 5);
            ctx.fillStyle = '#87CEEB';
        }

        // Door
        ctx.fillStyle = '#C4956A';
        this._roundRect(ctx, bx + bw / 2 - 6, by + bh - 18, 12, 18, 2);
        ctx.fill();

        // Control tower
        const tx = screenX + 40;
        const towerH = 65;
        const towerTop = groundY - towerH - 8;

        // Tower shaft
        ctx.fillStyle = '#E8D8C8';
        ctx.fillRect(tx, towerTop + 20, 14, towerH - 20);
        ctx.strokeStyle = '#D4C4B0';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, towerTop + 20, 14, towerH - 20);

        // Tower cabin
        ctx.fillStyle = '#B8E6B8';
        this._roundRect(ctx, tx - 6, towerTop, 26, 24, 4);
        ctx.fill();
        ctx.strokeStyle = '#8CC88C';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tower windows
        ctx.fillStyle = '#87CEEB';
        this._roundRect(ctx, tx - 3, towerTop + 5, 20, 10, 3);
        ctx.fill();

        // Tower light (blinking)
        const blink = Math.sin(this.time * 3) > 0;
        if (blink) {
            ctx.beginPath();
            ctx.arc(tx + 7, towerTop - 4, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FF4444';
            ctx.fill();
            // Glow
            ctx.beginPath();
            ctx.arc(tx + 7, towerTop - 4, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
            ctx.fill();
        }

        // Windsock
        const wsX = screenX - 60;
        const wsY = groundY - 30;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wsX, groundY - 5);
        ctx.lineTo(wsX, wsY);
        ctx.stroke();

        const windAngle = Math.sin(this.time * 2) * 0.3 + 0.5;
        ctx.save();
        ctx.translate(wsX, wsY);
        ctx.rotate(windAngle);
        // Sock stripes
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#FF6B4A' : '#FFF';
            ctx.fillRect(i * 6, -3, 6, 6);
        }
        ctx.restore();

        // Airport code sign
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 14px Nunito';
        ctx.textAlign = 'center';
        ctx.fillText(this.code, screenX + 10, groundY + 28);

        // Name
        ctx.font = '12px Nunito';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(this.name, screenX + 10, groundY + 42);

        // Landing zone indicator (for destination)
        if (this.isDestination) {
            const pulse = (Math.sin(this.time * 4) + 1) / 2;
            ctx.strokeStyle = `rgba(46, 213, 115, ${0.3 + pulse * 0.5})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(
                screenX - this.landingZoneWidth / 2,
                groundY - 80,
                this.landingZoneWidth,
                85
            );
            ctx.setLineDash([]);

            // "LAND HERE" text
            ctx.fillStyle = `rgba(46, 213, 115, ${0.6 + pulse * 0.4})`;
            ctx.font = 'bold 16px Nunito';
            ctx.textAlign = 'center';
            ctx.fillText('🛬 LAND HERE', screenX, groundY - 88);
        }
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    isInLandingZone(planeX, planeY, canvasH) {
        if (!this.isDestination) return false;
        const zoneLeft = this.x - this.landingZoneWidth / 2;
        const zoneRight = this.x + this.landingZoneWidth / 2;
        const groundY = this.y;
        return planeX >= zoneLeft && planeX <= zoneRight && planeY >= groundY - 80 && planeY <= groundY;
    }
}
