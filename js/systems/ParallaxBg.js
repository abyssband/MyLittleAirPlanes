// ===== Parallax Background System =====
// Enhanced with ground scenery, water waves, and atmospheric effects
import { lerp, hsl } from '../utils/helpers.js';

export class ParallaxBg {
    constructor(theme = 'ocean') {
        this.theme = theme;
        this.layers = [];
        this.time = 0;
        this._buildLayers();
        this._generateScenery();
    }

    _buildLayers() {
        const themes = {
            ocean: {
                skyTop: '#5B9BD5',
                skyMid: '#87CEEB',
                skyBottom: '#E8F4FD',
                sunColor: '#FFE082',
                sunGlow: 'rgba(255, 200, 80, 0.3)',
                layers: [
                    { type: 'clouds_far', speed: 0.08, y: 0.15, color: 'rgba(255,255,255,0.25)' },
                    { type: 'mountains', speed: 0.15, y: 0.55, colors: ['#B8D4E3', '#9BBFD4'] },
                    { type: 'hills', speed: 0.3, y: 0.65, colors: ['#7EC8A0', '#6BB58E'] },
                    { type: 'water', speed: 0.45, y: 0.8, colors: ['#3FA9D8', '#2E98C7'] },
                    { type: 'ground', speed: 0.6, y: 0.88, colors: ['#A8D8A8', '#8CC98C'] },
                ],
            },
            continent: {
                skyTop: '#D4856A',
                skyMid: '#F5C6A8',
                skyBottom: '#FCF0E3',
                sunColor: '#FFD54F',
                sunGlow: 'rgba(255, 180, 60, 0.35)',
                layers: [
                    { type: 'clouds_far', speed: 0.08, y: 0.15, color: 'rgba(255,255,255,0.35)' },
                    { type: 'mountains', speed: 0.15, y: 0.5, colors: ['#C49574', '#B88562'] },
                    { type: 'hills', speed: 0.3, y: 0.62, colors: ['#8BC78B', '#72B572'] },
                    { type: 'hills', speed: 0.38, y: 0.72, colors: ['#6BB56B', '#5AA35A'] },
                    { type: 'ground', speed: 0.6, y: 0.88, colors: ['#90C890', '#78B878'] },
                ],
            },
            desert: {
                skyTop: '#E8A87C',
                skyMid: '#FFD4A8',
                skyBottom: '#FFF5E6',
                sunColor: '#FFF176',
                sunGlow: 'rgba(255, 220, 100, 0.4)',
                layers: [
                    { type: 'clouds_far', speed: 0.08, y: 0.2, color: 'rgba(255,255,255,0.15)' },
                    { type: 'mountains', speed: 0.15, y: 0.55, colors: ['#DEB887', '#D2A06D'] },
                    { type: 'dunes', speed: 0.3, y: 0.68, colors: ['#F4D58C', '#E8C97A'] },
                    { type: 'ground', speed: 0.6, y: 0.88, colors: ['#EDC373', '#E0B560'] },
                ],
            },
        };
        const t = themes[this.theme] || themes.ocean;
        this.skyTop = t.skyTop;
        this.skyMid = t.skyMid;
        this.skyBottom = t.skyBottom;
        this.sunColor = t.sunColor;
        this.sunGlow = t.sunGlow;
        this.layers = t.layers;

        // Generate terrain shapes for each layer
        this.terrainPoints = {};
        this.layers.forEach((layer, i) => {
            if (layer.type !== 'clouds_far') {
                this.terrainPoints[i] = this._generateTerrain(layer.type);
            }
        });
    }

    _generateTerrain(type) {
        const points = [];
        const segments = 40;
        for (let i = 0; i <= segments * 3; i++) {
            let height;
            const x = i / segments;
            if (type === 'mountains') {
                height = Math.sin(x * 2.5) * 0.15 + Math.sin(x * 5.1) * 0.08 + Math.sin(x * 1.3) * 0.12;
            } else if (type === 'hills' || type === 'dunes') {
                height = Math.sin(x * 3.7) * 0.08 + Math.sin(x * 7.3) * 0.04 + Math.sin(x * 1.8) * 0.06;
            } else if (type === 'water') {
                height = Math.sin(x * 5) * 0.02 + Math.sin(x * 12) * 0.01;
            } else {
                height = Math.sin(x * 4.2) * 0.02 + Math.sin(x * 8.6) * 0.01;
            }
            points.push(height);
        }
        return points;
    }

    _generateScenery() {
        // Ground-level scenery objects (trees, houses, etc.)
        this.sceneryItems = [];
        const seed = this.theme === 'ocean' ? 42 : this.theme === 'desert' ? 99 : 77;
        const rng = (i) => {
            const s = Math.sin(seed + i * 127.1 + i * i * 43.7) * 43758.5453;
            return s - Math.floor(s);
        };

        for (let i = 0; i < 120; i++) {
            const r = rng(i);
            const x = i * 250 + rng(i + 100) * 150;
            let itemType;
            if (this.theme === 'desert') {
                itemType = r < 0.3 ? 'cactus' : r < 0.5 ? 'pyramid_small' : r < 0.7 ? 'rock' : 'bush_dry';
            } else if (this.theme === 'continent') {
                itemType = r < 0.2 ? 'tree_pine' : r < 0.35 ? 'tree_round' : r < 0.5 ? 'house' : r < 0.6 ? 'windmill' : r < 0.8 ? 'flower' : 'bush';
            } else {
                itemType = r < 0.15 ? 'tree_pine' : r < 0.3 ? 'tree_round' : r < 0.45 ? 'house' : r < 0.55 ? 'lighthouse' : r < 0.75 ? 'flower' : 'bush';
            }
            this.sceneryItems.push({
                x,
                type: itemType,
                scale: 0.6 + rng(i + 200) * 0.8,
                flip: rng(i + 300) > 0.5,
            });
        }
    }

    update(dt) {
        this.time += dt;
    }

    draw(ctx, cameraX, canvasW, canvasH) {
        // Sky gradient (3-stop for richer atmosphere)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasH * 0.8);
        gradient.addColorStop(0, this.skyTop);
        gradient.addColorStop(0.45, this.skyMid);
        gradient.addColorStop(1, this.skyBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Atmospheric light rays
        this._drawLightRays(ctx, canvasW, canvasH);

        // Sun with glow
        this._drawSun(ctx, canvasW, canvasH);

        // Rainbow
        this._drawRainbow(ctx, cameraX, canvasW, canvasH);

        // Draw each layer
        this.layers.forEach((layer, i) => {
            if (layer.type === 'clouds_far') {
                this._drawFarClouds(ctx, cameraX, canvasW, canvasH, layer);
            } else if (layer.type === 'water') {
                this._drawTerrainLayer(ctx, cameraX, canvasW, canvasH, layer, i);
                this._drawWaterEffects(ctx, cameraX, canvasW, canvasH, layer);
            } else {
                this._drawTerrainLayer(ctx, cameraX, canvasW, canvasH, layer, i);
            }
        });

        // Ground scenery (trees, houses, etc.)
        this._drawScenery(ctx, cameraX, canvasW, canvasH);

        // Sparkle particles
        this._drawSparkles(ctx, cameraX, canvasW, canvasH);
    }

    _drawLightRays(ctx, w, h) {
        const sunX = w * 0.85;
        const sunY = h * 0.1;
        const rayCount = 6;

        ctx.save();
        ctx.globalAlpha = 0.06 + Math.sin(this.time * 0.5) * 0.02;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 0.6 + Math.PI * 0.5;
            const len = h * 1.2;
            ctx.beginPath();
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(
                sunX + Math.cos(angle - 0.05) * len,
                sunY + Math.sin(angle - 0.05) * len
            );
            ctx.lineTo(
                sunX + Math.cos(angle + 0.05) * len,
                sunY + Math.sin(angle + 0.05) * len
            );
            ctx.closePath();
            ctx.fillStyle = this.sunGlow;
            ctx.fill();
        }
        ctx.restore();
    }

    _drawSun(ctx, w, h) {
        const sunX = w * 0.85;
        const sunY = h * 0.12;
        const r = Math.min(w, h) * 0.06;

        // Outer glow
        const glow = ctx.createRadialGradient(sunX, sunY, r * 0.3, sunX, sunY, r * 4);
        glow.addColorStop(0, this.sunGlow);
        glow.addColorStop(0.5, 'rgba(255, 200, 80, 0.1)');
        glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sunX - r * 5, sunY - r * 5, r * 10, r * 10);

        // Rotating rays (cute pointy rays)
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(this.time * 0.15);
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const innerR = r * 1.15;
            const outerR = r * 1.5 + Math.sin(this.time * 2 + i) * r * 0.15;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle - 0.12) * innerR, Math.sin(angle - 0.12) * innerR);
            ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
            ctx.lineTo(Math.cos(angle + 0.12) * innerR, Math.sin(angle + 0.12) * innerR);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 230, 120, 0.6)';
            ctx.fill();
        }
        ctx.restore();

        // Sun body
        ctx.beginPath();
        ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFE082';
        ctx.fill();

        // Inner glow
        ctx.beginPath();
        ctx.arc(sunX, sunY, r * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEE58';
        ctx.fill();

        // === Kawaii Face ===
        const eyeSpacing = r * 0.28;
        const eyeY = sunY - r * 0.05;
        const eyeR = r * 0.1;

        // Blink cycle
        const blinkCycle = (this.time % 4);
        const isBlinking = blinkCycle > 3.8;

        if (isBlinking) {
            // Closed happy eyes
            ctx.strokeStyle = '#D4890A';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(sunX - eyeSpacing, eyeY, eyeR, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sunX + eyeSpacing, eyeY, eyeR, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else {
            // Open eyes
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.arc(sunX - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sunX + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlights
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(sunX - eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sunX + eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Blush cheeks
        ctx.beginPath();
        ctx.ellipse(sunX - r * 0.45, sunY + r * 0.2, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 150, 100, 0.35)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sunX + r * 0.45, sunY + r * 0.2, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(sunX, sunY + r * 0.05, r * 0.22, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = '#D4890A';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    _drawFarClouds(ctx, cameraX, w, h, layer) {
        const offset = cameraX * layer.speed;
        ctx.fillStyle = layer.color;
        for (let i = 0; i < 10; i++) {
            const cx = ((i * w * 0.35 - offset) % (w * 3.5) + w * 3.5) % (w * 3.5) - w * 0.5;
            const cy = h * layer.y + Math.sin(i * 2.3 + this.time * 0.3) * h * 0.02;
            const size = w * 0.05 + (i % 4) * w * 0.015;
            this._drawCloudShape(ctx, cx, cy, size);
        }
    }

    _drawCloudShape(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.5, y, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x - size * 0.5, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTerrainLayer(ctx, cameraX, w, h, layer, index) {
        const points = this.terrainPoints[index];
        if (!points) return;

        const offset = cameraX * layer.speed;
        const baseY = h * layer.y;
        const segments = 40;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let px = -10; px <= w + 10; px += 5) {
            const worldX = px + offset;
            const idx = ((worldX / (w / segments)) % points.length + points.length) % points.length;
            const idx0 = Math.floor(idx);
            const idx1 = (idx0 + 1) % points.length;
            const frac = idx - idx0;
            const terrainH = lerp(points[idx0], points[idx1], frac);
            const py = baseY - terrainH * h;
            ctx.lineTo(px, py);
        }

        ctx.lineTo(w + 10, h);
        ctx.lineTo(-10, h);
        ctx.closePath();

        // Gradient fill
        const grad = ctx.createLinearGradient(0, baseY - h * 0.15, 0, h);
        grad.addColorStop(0, layer.colors[0]);
        grad.addColorStop(1, layer.colors[1] || layer.colors[0]);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    _drawWaterEffects(ctx, cameraX, w, h, layer) {
        const baseY = h * layer.y;
        const offset = cameraX * layer.speed;

        // Wave highlights
        ctx.save();
        for (let i = 0; i < 15; i++) {
            const waveX = ((i * 120 - offset * 1.3 + this.time * 40) % (w + 200)) - 50;
            const waveY = baseY + 5 + Math.sin(i * 1.7 + this.time * 2) * 3;
            const waveLen = 30 + Math.sin(i * 2.1) * 15;

            ctx.beginPath();
            ctx.moveTo(waveX, waveY);
            ctx.quadraticCurveTo(waveX + waveLen / 2, waveY - 4, waveX + waveLen, waveY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + Math.sin(this.time * 2 + i) * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Sparkle reflections
        for (let i = 0; i < 8; i++) {
            const sparklePhase = this.time * 3 + i * 1.5;
            const sparkleAlpha = Math.max(0, Math.sin(sparklePhase) * 0.5);
            if (sparkleAlpha > 0.05) {
                const sx = ((i * 180 - offset + this.time * 20) % (w + 100)) - 30;
                const sy = baseY + 8 + Math.sin(i * 3.2) * 5;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
                ctx.fill();
            }
        }
        ctx.restore();
    }

    _drawScenery(ctx, cameraX, w, h) {
        const groundY = h * 0.88;
        const offset = cameraX * 0.6; // same speed as ground layer

        this.sceneryItems.forEach(item => {
            const screenX = item.x - offset;
            // Wrap around for infinite scrolling feel
            const wrappedX = ((screenX % 30000) + 30000) % 30000 - 500;
            if (wrappedX < -80 || wrappedX > w + 80) return;

            ctx.save();
            ctx.translate(wrappedX, groundY);
            if (item.flip) ctx.scale(-1, 1);
            const s = item.scale;

            switch (item.type) {
                case 'tree_pine': this._drawPineTree(ctx, s); break;
                case 'tree_round': this._drawRoundTree(ctx, s); break;
                case 'house': this._drawHouse(ctx, s); break;
                case 'bush': this._drawBush(ctx, s, '#5DAE5D'); break;
                case 'bush_dry': this._drawBush(ctx, s, '#B8A060'); break;
                case 'cactus': this._drawCactus(ctx, s); break;
                case 'rock': this._drawRock(ctx, s); break;
                case 'lighthouse': this._drawLighthouse(ctx, s); break;
                case 'windmill': this._drawWindmill(ctx, s); break;
                case 'pyramid_small': this._drawPyramid(ctx, s); break;
                case 'flower': this._drawFlower(ctx, s); break;
            }
            ctx.restore();
        });
    }

    _drawPineTree(ctx, s) {
        // Trunk
        ctx.fillStyle = '#8B6F4E';
        ctx.fillRect(-3 * s, -20 * s, 6 * s, 20 * s);
        // Foliage layers
        const colors = ['#2D7A3A', '#3A9148', '#4DAB5C'];
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (-50 + i * 10) * s);
            ctx.lineTo((-12 - i * 4) * s, (-25 + i * 10) * s);
            ctx.lineTo((12 + i * 4) * s, (-25 + i * 10) * s);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
        }
    }

    _drawRoundTree(ctx, s) {
        // Trunk
        ctx.fillStyle = '#9B7653';
        ctx.fillRect(-3 * s, -18 * s, 6 * s, 18 * s);
        // Round canopy
        ctx.beginPath();
        ctx.arc(0, -28 * s, 14 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
        // Highlight
        ctx.beginPath();
        ctx.arc(-4 * s, -32 * s, 6 * s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
    }

    _drawHouse(ctx, s) {
        const bw = 22 * s, bh = 18 * s;
        // Body
        ctx.fillStyle = '#F5E6D3';
        ctx.fillRect(-bw / 2, -bh, bw, bh);
        ctx.strokeStyle = '#D4C4B0';
        ctx.lineWidth = 1;
        ctx.strokeRect(-bw / 2, -bh, bw, bh);
        // Roof
        ctx.beginPath();
        ctx.moveTo(-bw / 2 - 4 * s, -bh);
        ctx.lineTo(0, -bh - 12 * s);
        ctx.lineTo(bw / 2 + 4 * s, -bh);
        ctx.closePath();
        ctx.fillStyle = '#E57373';
        ctx.fill();
        // Window
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-4 * s, -bh + 5 * s, 8 * s, 6 * s);
        // Door
        ctx.fillStyle = '#A1887F';
        ctx.fillRect(-3 * s, -8 * s, 6 * s, 8 * s);
    }

    _drawBush(ctx, s, color) {
        ctx.beginPath();
        ctx.arc(0, -6 * s, 8 * s, 0, Math.PI * 2);
        ctx.arc(7 * s, -4 * s, 6 * s, 0, Math.PI * 2);
        ctx.arc(-6 * s, -4 * s, 5 * s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawCactus(ctx, s) {
        ctx.fillStyle = '#5D8A3C';
        // Main body
        ctx.beginPath();
        ctx.roundRect(-4 * s, -30 * s, 8 * s, 30 * s, 4 * s);
        ctx.fill();
        // Left arm
        ctx.beginPath();
        ctx.roundRect(-12 * s, -22 * s, 8 * s, 10 * s, 3 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-12 * s, -26 * s, 5 * s, 8 * s, 2 * s);
        ctx.fill();
        // Right arm
        ctx.beginPath();
        ctx.roundRect(4 * s, -18 * s, 8 * s, 8 * s, 3 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(8 * s, -24 * s, 5 * s, 10 * s, 2 * s);
        ctx.fill();
    }

    _drawRock(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(-10 * s, 0);
        ctx.lineTo(-8 * s, -8 * s);
        ctx.lineTo(-2 * s, -12 * s);
        ctx.lineTo(6 * s, -9 * s);
        ctx.lineTo(10 * s, -3 * s);
        ctx.lineTo(8 * s, 0);
        ctx.closePath();
        ctx.fillStyle = '#A09080';
        ctx.fill();
        // Highlight
        ctx.beginPath();
        ctx.moveTo(-5 * s, -6 * s);
        ctx.lineTo(-1 * s, -10 * s);
        ctx.lineTo(3 * s, -8 * s);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
    }

    _drawLighthouse(ctx, s) {
        // Body
        ctx.fillStyle = '#F5F5F5';
        ctx.beginPath();
        ctx.moveTo(-6 * s, 0);
        ctx.lineTo(-4 * s, -35 * s);
        ctx.lineTo(4 * s, -35 * s);
        ctx.lineTo(6 * s, 0);
        ctx.closePath();
        ctx.fill();
        // Red stripe
        ctx.fillStyle = '#E53935';
        ctx.fillRect(-5 * s, -20 * s, 10 * s, 8 * s);
        // Light room
        ctx.fillStyle = '#FFEE58';
        ctx.fillRect(-5 * s, -40 * s, 10 * s, 6 * s);
        // Light beam (animated)
        const beamAlpha = 0.15 + Math.sin(this.time * 4) * 0.1;
        ctx.fillStyle = `rgba(255, 238, 88, ${beamAlpha})`;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -38 * s);
        ctx.lineTo(-30 * s, -50 * s);
        ctx.lineTo(-25 * s, -35 * s);
        ctx.closePath();
        ctx.fill();
    }

    _drawWindmill(ctx, s) {
        // Tower
        ctx.fillStyle = '#E8D8C8';
        ctx.beginPath();
        ctx.moveTo(-5 * s, 0);
        ctx.lineTo(-3 * s, -32 * s);
        ctx.lineTo(3 * s, -32 * s);
        ctx.lineTo(5 * s, 0);
        ctx.closePath();
        ctx.fill();
        // Blades (rotating)
        ctx.save();
        ctx.translate(0, -33 * s);
        ctx.rotate(this.time * 1.5);
        ctx.fillStyle = '#D4C4B0';
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.fillRect(-2 * s, 0, 4 * s, 18 * s);
            ctx.restore();
        }
        ctx.restore();
        // Hub
        ctx.beginPath();
        ctx.arc(0, -33 * s, 3 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#A09080';
        ctx.fill();
    }

    _drawPyramid(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(0, -20 * s);
        ctx.lineTo(-16 * s, 0);
        ctx.lineTo(16 * s, 0);
        ctx.closePath();
        ctx.fillStyle = '#E8C97A';
        ctx.fill();
        // Shading
        ctx.beginPath();
        ctx.moveTo(0, -20 * s);
        ctx.lineTo(2 * s, 0);
        ctx.lineTo(16 * s, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
    }

    _drawRainbow(ctx, cameraX, w, h) {
        const rainbowX = 3000 - cameraX * 0.2;
        if (rainbowX < -300 || rainbowX > w + 300) return;

        const colors = [
            'rgba(255, 100, 100, 0.12)',
            'rgba(255, 170, 80, 0.12)',
            'rgba(255, 240, 100, 0.12)',
            'rgba(100, 220, 100, 0.12)',
            'rgba(100, 180, 255, 0.12)',
            'rgba(130, 100, 200, 0.10)',
            'rgba(200, 100, 230, 0.10)',
        ];
        const baseR = h * 0.5;
        ctx.save();
        ctx.lineWidth = 6;
        colors.forEach((c, i) => {
            ctx.beginPath();
            ctx.arc(rainbowX, h * 0.6, baseR - i * 7, Math.PI, 0);
            ctx.strokeStyle = c;
            ctx.stroke();
        });
        ctx.restore();
    }

    _drawSparkles(ctx, cameraX, w, h) {
        ctx.save();
        for (let i = 0; i < 20; i++) {
            const phase = this.time * 0.5 + i * 1.37;
            const alpha = Math.max(0, Math.sin(phase) * 0.5 + 0.1);
            if (alpha < 0.05) continue;

            const sx = ((i * 347 + this.time * 8) % (w + 100)) - 50;
            const sy = (i * 131 + Math.sin(this.time * 0.7 + i) * 30) % (h * 0.7) + 20;
            const size = 2 + Math.sin(phase * 1.5) * 1.5;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFE082';

            // Draw 4-point star
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
                const a = (j / 4) * Math.PI * 2 + this.time + i;
                const r1 = size;
                const r2 = size * 0.3;
                ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
                const a2 = a + Math.PI / 4;
                ctx.lineTo(sx + Math.cos(a2) * r2, sy + Math.sin(a2) * r2);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    _drawFlower(ctx, s) {
        const petalColors = ['#FF9EBB', '#FFB3CC', '#FF85A8', '#FFD1DC', '#FFA0C0'];
        const numPetals = 5;
        const petalR = 5 * s;

        // Petals
        for (let i = 0; i < numPetals; i++) {
            const angle = (i / numPetals) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * petalR * 0.7;
            const py = -8 * s + Math.sin(angle) * petalR * 0.7;
            ctx.beginPath();
            ctx.arc(px, py, petalR * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = petalColors[i % petalColors.length];
            ctx.fill();
        }

        // Center
        ctx.beginPath();
        ctx.arc(0, -8 * s, petalR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();

        // Stem
        ctx.strokeStyle = '#5DAE5D';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(0, -3 * s);
        ctx.lineTo(0, 0);
        ctx.stroke();
    }
}
