// ===== Game Scene =====
import { Plane } from '../entities/Plane.js';
import { Cloud } from '../entities/Cloud.js';
import { Coin } from '../entities/Coin.js';
import { Airport } from '../entities/Airport.js';
import { Landmark } from '../entities/Landmark.js';
import { Obstacle } from '../entities/Obstacle.js';
import { PowerUp } from '../entities/PowerUp.js';
import { ParallaxBg } from '../systems/ParallaxBg.js';
import { clamp, lerp, randRange, randInt, easeOutCubic, breathe, roundRect } from '../utils/helpers.js';
import { AIRPORTS, getAirport } from '../data/routes.js';

const PHASE_TAKEOFF = 'takeoff';
const PHASE_FLIGHT = 'flight';
const PHASE_LANDING = 'landing';
const PHASE_BRAKING = 'braking';

export class GameScene {
    constructor(ctx, canvas, input, route, characterType = 'cat') {
        this.ctx = ctx;
        this.canvas = canvas;
        this.input = input;
        this.route = route;
        this.time = 0;
        this.phase = PHASE_TAKEOFF;
        this.onComplete = null;  // callback(result)
        this.onQuit = null;

        // Camera
        this.cameraX = 0;
        this.cameraTargetX = 0;

        // World dimensions
        this.worldWidth = route.distance;
        const groundY = canvas.height * 0.82;

        // Airport info
        const fromInfo = getAirport(route.from);
        const toInfo = getAirport(route.to);

        // Create entities
        this.departureAirport = new Airport(200, groundY, fromInfo.name, fromInfo.code, false);
        this.arrivalAirport = new Airport(this.worldWidth, groundY, toInfo.name, toInfo.code, true);

        this.plane = new Plane(200, groundY - 30, characterType);
        this.background = new ParallaxBg(route.theme || 'ocean');

        // Generate clouds
        this.clouds = [];
        for (let i = 0; i < Math.floor(this.worldWidth / 200); i++) {
            this.clouds.push(new Cloud(
                randRange(100, this.worldWidth + 500),
                randRange(50, canvas.height * 0.5),
                randRange(25, 70)
            ));
        }

        // Generate coins (groups scattered along route)
        this.coins = [];
        const numGroups = Math.floor(this.worldWidth / 800);
        for (let g = 0; g < numGroups; g++) {
            const groupX = 600 + g * (this.worldWidth - 800) / numGroups;
            const groupY = randRange(canvas.height * 0.2, canvas.height * 0.6);
            const groupSize = randInt(3, 7);
            for (let i = 0; i < groupSize; i++) {
                this.coins.push(new Coin(
                    groupX + i * 35 + randRange(-5, 5),
                    groupY + randRange(-30, 30)
                ));
            }
        }

        // Stats
        this.coinsCollected = 0;
        this.flightTime = 0;
        this.maxAltitude = 0;

        // Cloud fog opacity
        this.cloudFogAlpha = 0;

        // Generate landmarks along route
        this.landmarks = this._generateLandmarks(route, groundY);

        // === OBSTACLES ===
        this.obstacles = this._generateObstacles(route, groundY);

        // === POWER-UPS ===
        this.powerUps = this._generatePowerUps(route);
        this.activePowerUps = {}; // type -> remaining duration
        this.powerUpFlash = 0;

        // === COMBO SYSTEM ===
        this.combo = 0;
        this.comboTimer = 0;
        this.comboDecayTime = 1.5; // seconds before combo resets
        this.comboPopups = []; // floating +N text

        // === HP SYSTEM ===
        this.hp = 3;
        this.maxHp = 3;
        this.invincibleTimer = 0;
        this.hitFlashTimer = 0;
        this.damageShakeTimer = 0;

        // === WIND/WEATHER ===
        this.windZones = this._generateWindZones(route);
        this.currentWind = 0;
        this.windIndicatorAlpha = 0;

        // Slingshot UI
        this.slingshotGuide = { active: false, pullX: 0, pullY: 0 };

        // Speed lines (visual speed streaks)
        this.speedLines = [];

        // Phase transition effects
        this.phaseText = '';
        this.phaseTextTimer = 0;

        // Animation override timer
        this.animOverrideTimer = 0;

        // Fade in
        this.fadeIn = 0;

        // Countdown for takeoff hint
        this.showTakeoffHint = true;
    }

    update(dt) {
        this.time += dt;
        this.fadeIn = Math.min(this.fadeIn + dt * 3, 1);

        // Update background
        this.background.update(dt);

        // Update clouds
        this.clouds.forEach(c => c.update(dt));

        // Update coins
        this.coins.forEach(c => c.update(dt));

        // Update speed lines
        this._updateSpeedLines(dt);

        // Update obstacles
        this.obstacles.forEach(o => o.update(dt));

        // Update power-ups
        this.powerUps.forEach(p => p.update(dt));

        // Update active power-up durations
        Object.keys(this.activePowerUps).forEach(type => {
            this.activePowerUps[type] -= dt;
            if (this.activePowerUps[type] <= 0) {
                delete this.activePowerUps[type];
            }
        });

        // Combo decay
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // Combo popups
        this.comboPopups = this.comboPopups.filter(p => {
            p.y -= 40 * dt;
            p.life -= dt * 1.5;
            return p.life > 0;
        });

        // Invincibility timer
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.damageShakeTimer > 0) this.damageShakeTimer -= dt;
        if (this.powerUpFlash > 0) this.powerUpFlash -= dt * 3;

        // Wind calculation
        this._updateWind(dt);

        // Update airports
        this.departureAirport.update(dt);
        this.arrivalAirport.update(dt);

        // Update landmarks
        this.landmarks.forEach(l => l.update(dt));

        // Cloud fog effect
        let inCloud = false;
        this.clouds.forEach(c => {
            if (c.isPlaneInside(this.plane.x, this.plane.y)) inCloud = true;
        });
        const targetFog = inCloud ? 0.35 : 0;
        this.cloudFogAlpha = lerp(this.cloudFogAlpha, targetFog, dt * 4);

        // Phase-specific update
        switch (this.phase) {
            case PHASE_TAKEOFF:
                this._updateTakeoff(dt);
                break;
            case PHASE_FLIGHT:
                this._updateFlight(dt);
                break;
            case PHASE_LANDING:
                this._updateLanding(dt);
                break;
            case PHASE_BRAKING:
                this._updateBraking(dt);
                break;
        }

        // Phase text timer
        if (this.phaseTextTimer > 0) {
            this.phaseTextTimer -= dt;
        }

        // Update animOverride timer
        if (this.animOverrideTimer > 0) {
            this.animOverrideTimer -= dt;
            if (this.animOverrideTimer <= 0) {
                this.plane.animOverride = null;
            }
        }

        // Camera follows plane
        if (this.plane.launched) {
            // During landing/braking, center camera more to show runway
            let cameraOffset, cameraSpeed;
            if (this.phase === PHASE_BRAKING) {
                cameraOffset = this.canvas.width * 0.4;
                cameraSpeed = 4;
            } else if (this.phase === PHASE_LANDING) {
                cameraOffset = this.canvas.width * 0.35;
                cameraSpeed = 2;
            } else {
                cameraOffset = this.canvas.width * 0.25;
                cameraSpeed = 3;
            }
            this.cameraTargetX = this.plane.x - cameraOffset;
            this.cameraX += (this.cameraTargetX - this.cameraX) * dt * cameraSpeed;
        }
    }

    _updateTakeoff(dt) {
        const input = this.input;
        const plane = this.plane;

        if (input.mouse.justPressed) {
            // Check if clicking near the plane
            const planeScreenX = plane.x - this.cameraX;
            const dx = input.mouse.x - planeScreenX;
            const dy = input.mouse.y - plane.y;
            if (Math.sqrt(dx * dx + dy * dy) < 80) {
                plane.slingshotActive = true;
                this.showTakeoffHint = false;
            }
        }

        if (plane.slingshotActive && input.dragState.dragging) {
            const planeScreenX = plane.x - this.cameraX;
            plane.slingshotPullX = input.dragState.currentX - planeScreenX;
            plane.slingshotPullY = input.dragState.currentY - plane.y;
            this.slingshotGuide.active = true;
            this.slingshotGuide.pullX = plane.slingshotPullX;
            this.slingshotGuide.pullY = plane.slingshotPullY;
        }

        if (plane.slingshotActive && input.mouse.justReleased) {
            // Launch!
            const pullX = plane.slingshotPullX;
            const pullY = plane.slingshotPullY;
            if (Math.sqrt(pullX * pullX + pullY * pullY) > 20) {
                plane.launch(pullX, pullY);
                this.phase = PHASE_FLIGHT;
                this.phaseText = '✈️ 起飛！';
                this.phaseTextTimer = 2;
            }
            plane.slingshotActive = false;
            this.slingshotGuide.active = false;
        }

        plane.update(dt, 0, this.canvas.height);
    }

    _updateFlight(dt) {
        const input = this.input;
        let verticalInput = input.getVerticalInput();

        // Apply wind effect
        verticalInput += this.currentWind * 0.3;

        // Apply speed boost
        if (this.activePowerUps['speed_boost']) {
            this.plane.vx = Math.max(this.plane.vx, this.plane.cruiseSpeed * 1.5);
        }

        this.plane.update(dt, verticalInput, this.canvas.height);
        this.flightTime += dt;

        // Track altitude
        const altitude = this.canvas.height * 0.82 - this.plane.y;
        this.maxAltitude = Math.max(this.maxAltitude, altitude);

        // Collect coins
        const magnetActive = !!this.activePowerUps['magnet'];
        this.coins.forEach(coin => {
            // Magnet: attract coins within range
            if (magnetActive && !coin.collected) {
                const dx = this.plane.x - coin.x;
                const dy = this.plane.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    coin.x += dx * dt * 5;
                    coin.y += dy * dt * 5;
                }
            }
            if (coin.checkCollision(this.plane.x, this.plane.y, this.plane.width)) {
                // Combo!
                this.combo++;
                this.comboTimer = this.comboDecayTime;
                const points = 1 * Math.min(this.combo, 10);
                this.coinsCollected += points;

                // Combo popup
                if (this.combo > 1) {
                    this.comboPopups.push({
                        x: this.plane.x,
                        y: this.plane.y - 30,
                        text: `x${this.combo}`,
                        life: 1,
                    });
                }
            }
        });

        // Collect power-ups
        this.powerUps.forEach(pu => {
            if (pu.checkCollision(this.plane.x, this.plane.y)) {
                if (pu.type === 'star') {
                    this.coinsCollected += 5;
                } else {
                    this.activePowerUps[pu.type] = pu.config.duration;
                }
                this.powerUpFlash = 1;
                this.phaseText = `${pu.config.icon} ${pu.type === 'speed_boost' ? '加速！' : pu.type === 'shield' ? '護盾！' : pu.type === 'magnet' ? '磁鐵！' : '⭐+5'}`;
                this.phaseTextTimer = 1.2;
            }
        });

        // Check obstacle collisions
        if (this.invincibleTimer <= 0) {
            this.obstacles.forEach(obs => {
                if (obs.checkCollision(this.plane.x, this.plane.y, 18)) {
                    if (this.activePowerUps['shield']) {
                        // Shield absorbs hit
                        delete this.activePowerUps['shield'];
                        this.phaseText = '🛡️ 護盾擋住了！';
                        this.phaseTextTimer = 1;
                        this.plane.shakeAmount = 3;
                    } else {
                        this.hp--;
                        this.invincibleTimer = 2;
                        this.hitFlashTimer = 0.5;
                        this.damageShakeTimer = 0.3;
                        this.plane.shakeAmount = 8;
                        this.combo = 0;

                        // Set hit animation
                        this.plane.animOverride = 'hit';
                        this.animOverrideTimer = 0.5;

                        if (this.hp <= 0) {
                            this.plane.alive = false;
                            this.plane.landed = true;
                            this.plane.animOverride = 'crash';
                            this.animOverrideTimer = 999;
                            this._completeLanding();
                        }
                    }
                }
            });
        }

        // Check if approaching destination
        const distToArrival = this.arrivalAirport.x - this.plane.x;
        if (distToArrival < 800) {
            this.phase = PHASE_LANDING;
            this.plane.landing = true;
            this.phaseText = '🛬 準備降落！';
            this.phaseTextTimer = 2;
        }
    }

    _updateLanding(dt) {
        const input = this.input;
        const verticalInput = input.getVerticalInput();

        this.plane.update(dt, verticalInput, this.canvas.height);
        this.flightTime += dt;

        // Collect coins
        this.coins.forEach(coin => {
            if (coin.checkCollision(this.plane.x, this.plane.y, this.plane.width)) {
                this.coinsCollected++;
            }
        });

        // Check touchdown on runway
        const groundY = this.canvas.height * 0.82;
        const distFromGround = groundY - this.plane.y;

        if (this.arrivalAirport.isInLandingZone(this.plane.x, this.plane.y, this.canvas.height)) {
            if (distFromGround < 25) {
                // Touchdown! Start braking
                this._startBraking(distFromGround);
                return;
            }
        }

        // Auto-touchdown if at the airport and low
        if (this.plane.x >= this.arrivalAirport.x - 100 && distFromGround < 60) {
            this._startBraking(distFromGround);
            return;
        }

        // Auto-complete if way past airport
        if (this.plane.x > this.arrivalAirport.x + 600) {
            this.plane.landed = true;
            this._completeLanding();
        }
    }

    _startBraking(distFromGround) {
        this.phase = PHASE_BRAKING;
        this.plane.startBraking();
        this.phaseText = '🛬 著陸！';
        this.phaseTextTimer = 1.5;

        // Calculate landing quality based on approach
        const speed = Math.abs(this.plane.vy);
        const angleOff = Math.abs(this.plane.angle);

        if (distFromGround < 15 && speed < 50 && angleOff < 0.15) {
            this.landingQuality = 3;
            this.landingText = '完美降落！';
            this.plane.animOverride = 'land_success';
            this.animOverrideTimer = 999;
        } else if (distFromGround < 30 && speed < 100) {
            this.landingQuality = 2;
            this.landingText = '平穩著陸';
            this.plane.animOverride = 'land_success';
            this.animOverrideTimer = 999;
        } else {
            this.landingQuality = 1;
            this.landingText = '安全著陸';
            this.plane.animOverride = 'land_fail';
            this.animOverrideTimer = 999;
        }
    }

    _updateBraking(dt) {
        this.plane.update(dt, 0, this.canvas.height);

        // When plane has fully stopped, complete the landing
        if (this.plane.landed) {
            this._completeLanding();
        }
    }

    _completeLanding() {
        // Use pre-calculated quality from _startBraking, or fallback
        const stars = this.landingQuality || 1;
        const landingText = this.landingText || '安全著陸';

        const result = {
            route: this.route,
            stars,
            landingText,
            coinsCollected: this.coinsCollected,
            flightTime: this.flightTime,
            maxAltitude: this.maxAltitude,
        };

        // Short delay before showing result
        setTimeout(() => {
            if (this.onComplete) this.onComplete(result);
        }, 800);
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const alpha = easeOutCubic(this.fadeIn);

        ctx.globalAlpha = alpha;

        // Background
        this.background.draw(ctx, this.cameraX, w, h);

        // Airports
        this.departureAirport.draw(ctx, this.cameraX, h);
        this.arrivalAirport.draw(ctx, this.cameraX, h);

        // Landmarks
        this.landmarks.forEach(l => l.draw(ctx, this.cameraX));

        // Clouds
        this.clouds.forEach(c => c.draw(ctx, this.cameraX));

        // Coins
        this.coins.forEach(c => c.draw(ctx, this.cameraX));

        // Obstacles
        this.obstacles.forEach(o => o.draw(ctx, this.cameraX));

        // Power-ups
        this.powerUps.forEach(p => p.draw(ctx, this.cameraX));

        // Speed lines (drawn between bg and plane for depth)
        this._drawSpeedLines(ctx, w, h);

        // Slingshot guide
        if (this.slingshotGuide.active) {
            this._drawSlingshot(ctx);
        }

        // Plane (flash if invincible)
        if (this.invincibleTimer > 0 && Math.sin(this.time * 20) > 0) {
            ctx.globalAlpha = alpha * 0.5;
        }
        this.plane.draw(ctx, this.cameraX);
        ctx.globalAlpha = alpha;

        // Shield visual
        if (this.activePowerUps['shield']) {
            const sx = this.plane.x - this.cameraX;
            ctx.beginPath();
            ctx.arc(sx, this.plane.y, 35, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(78, 205, 196, ${0.4 + Math.sin(this.time * 3) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = `rgba(78, 205, 196, 0.1)`;
            ctx.fill();
        }

        // Combo popups
        this.comboPopups.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.font = `bold ${14 + p.life * 8}px Nunito`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 3;
            ctx.strokeText(p.text, p.x - this.cameraX, p.y);
            ctx.fillText(p.text, p.x - this.cameraX, p.y);
            ctx.restore();
        });

        // UI Layer
        this._drawUI(ctx, w, h);

        // Phase text
        if (this.phaseTextTimer > 0) {
            this._drawPhaseText(ctx, w, h);
        }

        // Hit red flash
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.hitFlashTimer * 0.3})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Power-up flash
        if (this.powerUpFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 200, ${this.powerUpFlash * 0.15})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Cloud fog overlay
        if (this.cloudFogAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.cloudFogAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Takeoff hint
        if (this.showTakeoffHint && this.phase === PHASE_TAKEOFF) {
            this._drawTakeoffHint(ctx, w, h);
        }

        ctx.globalAlpha = 1;
    }

    _drawSlingshot(ctx) {
        const planeScreenX = this.plane.x - this.cameraX;
        const planeY = this.plane.y;
        const pullX = this.slingshotGuide.pullX;
        const pullY = this.slingshotGuide.pullY;

        // Elastic band
        ctx.strokeStyle = '#FF6B9D';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(planeScreenX, planeY);
        ctx.lineTo(planeScreenX + pullX, planeY + pullY);
        ctx.stroke();

        // Power indicator (circle)
        const power = Math.sqrt(pullX * pullX + pullY * pullY);
        const maxPull = 150;
        const ratio = Math.min(power / maxPull, 1);

        ctx.beginPath();
        ctx.arc(planeScreenX + pullX, planeY + pullY, 12, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${120 - ratio * 120}, 80%, 50%)`;
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction arrow (opposite direction)
        const arrowLen = 40 + ratio * 60;
        const angle = Math.atan2(-pullY, -pullX);
        const arrowX = planeScreenX + Math.cos(angle) * arrowLen;
        const arrowY = planeY + Math.sin(angle) * arrowLen;

        ctx.strokeStyle = 'rgba(255, 107, 157, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(planeScreenX, planeY);
        ctx.lineTo(arrowX, arrowY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head
        const headLen = 10;
        ctx.fillStyle = 'rgba(255, 107, 157, 0.5)';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
            arrowX - headLen * Math.cos(angle - 0.4),
            arrowY - headLen * Math.sin(angle - 0.4)
        );
        ctx.lineTo(
            arrowX - headLen * Math.cos(angle + 0.4),
            arrowY - headLen * Math.sin(angle + 0.4)
        );
        ctx.closePath();
        ctx.fill();
    }

    _drawUI(ctx, w, h) {
        // Mini map
        this._drawMiniMap(ctx, w, h);

        // Altitude meter
        this._drawAltitude(ctx, w, h);

        // Speed indicator
        this._drawSpeed(ctx, w, h);

        // HP hearts
        this._drawHP(ctx, w, h);

        // Combo display
        if (this.combo > 1) {
            this._drawCombo(ctx, w, h);
        }

        // Active power-ups
        this._drawActivePowerUps(ctx, w, h);

        // Wind indicator
        this._drawWindIndicator(ctx, w, h);

        // Coin counter
        this._drawCoinCounter(ctx, w, h);

        // Back button
        this._drawBackButton(ctx, w, h);
    }

    _drawMiniMap(ctx, w, h) {
        const mapW = Math.min(w * 0.6, 350);
        const mapH = 60;
        const mapX = (w - mapW) / 2;
        const mapY = h - mapH - 18;
        const r = 12;

        // Background
        ctx.fillStyle = 'rgba(180, 220, 255, 0.75)';
        roundRect(ctx, mapX, mapY, mapW, mapH, r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, mapX, mapY, mapW, mapH, r);
        ctx.stroke();

        // Simplified land masses
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, mapX, mapY, mapW, mapH, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(168, 216, 168, 0.45)';
        // Small blob continents
        const blobs = [
            { x: 0.13, y: 0.35, rw: 0.08, rh: 0.35 },
            { x: 0.18, y: 0.7, rw: 0.04, rh: 0.2 },
            { x: 0.44, y: 0.25, rw: 0.06, rh: 0.2 },
            { x: 0.47, y: 0.5, rw: 0.05, rh: 0.3 },
            { x: 0.65, y: 0.25, rw: 0.12, rh: 0.35 },
            { x: 0.82, y: 0.7, rw: 0.06, rh: 0.15 },
        ];
        blobs.forEach(b => {
            ctx.beginPath();
            ctx.ellipse(
                mapX + b.x * mapW, mapY + b.y * mapH,
                b.rw * mapW, b.rh * mapH,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        });
        ctx.restore();

        // Airport positions from data
        const fromInfo = getAirport(this.route.from);
        const toInfo = getAirport(this.route.to);
        const fromAirport = AIRPORTS[this.route.from];
        const toAirport = AIRPORTS[this.route.to];

        const fromX = mapX + fromAirport.mapX * mapW;
        const fromY = mapY + fromAirport.mapY * mapH;
        const toX = mapX + toAirport.mapX * mapW;
        const toY = mapY + toAirport.mapY * mapH;

        // Route line (curved)
        const midX = (fromX + toX) / 2;
        const midY = Math.min(fromY, toY) - 15;

        ctx.strokeStyle = 'rgba(255, 107, 157, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.quadraticCurveTo(midX, midY, toX, toY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Airport markers
        [{ x: fromX, y: fromY, info: fromInfo, airport: fromAirport },
         { x: toX, y: toY, info: toInfo, airport: toAirport }].forEach(a => {
            // Dot
            ctx.beginPath();
            ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = a.airport.color;
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = 'bold 8px Nunito';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#444';
            ctx.fillText(`${a.info.flag}${a.info.code}`, a.x, a.y + 13);
        });

        // Plane icon along route
        const progress = clamp(this.plane.x / this.worldWidth, 0, 1);
        const t = progress;
        const planeX = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
        const planeY = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;

        // Plane trail
        if (progress > 0.02) {
            ctx.strokeStyle = 'rgba(255, 107, 157, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            // Draw partial curve up to current position
            const steps = Math.floor(progress * 20);
            for (let i = 1; i <= steps; i++) {
                const tt = (i / 20);
                const px = (1 - tt) * (1 - tt) * fromX + 2 * (1 - tt) * tt * midX + tt * tt * toX;
                const py = (1 - tt) * (1 - tt) * fromY + 2 * (1 - tt) * tt * midY + tt * tt * toY;
                ctx.lineTo(px, py);
            }
            ctx.lineTo(planeX, planeY);
            ctx.stroke();
        }

        // Plane icon
        ctx.font = '12px Nunito';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6B9D';
        ctx.fillText('✈', planeX, planeY - 2);

        // Glow around plane
        ctx.beginPath();
        ctx.arc(planeX, planeY, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 107, 157, ${0.15 + Math.sin(this.time * 4) * 0.1})`;
        ctx.fill();
    }

    _drawAltitude(ctx, w, h) {
        const groundY = h * 0.82;
        const altitude = Math.max(0, Math.floor((groundY - this.plane.y) * 3));

        const x = 15;
        const y = 20;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(ctx, x, y, 100, 50, 10);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = 'bold 11px Nunito';
        ctx.fillStyle = '#666';
        ctx.fillText('高度 ALT', x + 10, y + 18);
        ctx.font = 'bold 18px Nunito';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(`${altitude}m`, x + 10, y + 40);
    }

    _drawCoinCounter(ctx, w, h) {
        const x = w - 110;
        const y = 20;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(ctx, x, y, 95, 36, 10);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = '16px Nunito';
        ctx.fillText('🪙', x + 10, y + 25);
        ctx.font = 'bold 16px Nunito';
        ctx.fillStyle = '#DAA520';
        ctx.fillText(`× ${this.coinsCollected}`, x + 35, y + 26);
    }

    _drawBackButton(ctx, w, h) {
        // Simple back arrow at top right
        const x = w - 45;
        const y = 65;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '14px Nunito';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.fillText('✕', x, y + 5);
    }

    _drawPhaseText(ctx, w, h) {
        const alpha = Math.min(this.phaseTextTimer, 1);
        const scale = easeOutCubic(Math.min((2 - this.phaseTextTimer) * 2, 1));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(w / 2, h * 0.35);
        ctx.scale(scale, scale);

        ctx.font = 'bold 36px Nunito';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.phaseText, 0, 0);
        ctx.fillText(this.phaseText, 0, 0);

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    _drawTakeoffHint(ctx, w, h) {
        const pulse = breathe(this.time, 2);
        const planeScreenX = this.plane.x - this.cameraX;
        const planeY = this.plane.y;

        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.font = 'bold 16px Nunito';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF6B9D';
        ctx.fillText('👆 拖曳飛機發射！', planeScreenX, planeY - 50);
        ctx.font = '12px Nunito';
        ctx.fillStyle = '#999';
        ctx.fillText('Drag the plane to launch', planeScreenX, planeY - 32);
        ctx.globalAlpha = 1;
    }

    _updateSpeedLines(dt) {
        if (this.phase !== PHASE_FLIGHT && this.phase !== PHASE_LANDING) return;

        const speed = this.plane.speed;
        const spawnRate = Math.min(speed / 80, 5); // more lines at higher speed

        // Spawn new speed lines based on speed
        if (speed > 100 && Math.random() < spawnRate * dt) {
            this.speedLines.push({
                x: this.canvas.width + 10,
                y: Math.random() * this.canvas.height * 0.85,
                length: 30 + Math.random() * 60 + (speed / 350) * 80,
                speed: speed * (1.5 + Math.random() * 1.0),
                alpha: 0.15 + Math.random() * 0.25,
                width: 1 + Math.random() * 2,
            });
        }

        // Update existing speed lines
        this.speedLines = this.speedLines.filter(line => {
            line.x -= line.speed * dt;
            line.alpha *= 0.995;
            return line.x + line.length > -10 && line.alpha > 0.01;
        });
    }

    _drawSpeedLines(ctx, w, h) {
        this.speedLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x, line.y);
            ctx.lineTo(line.x + line.length, line.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha})`;
            ctx.lineWidth = line.width;
            ctx.stroke();
        });
    }

    _drawSpeed(ctx, w, h) {
        const speed = Math.floor(this.plane.speed * 2.5); // convert to km/h-ish

        const x = 15;
        const y = 80;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(ctx, x, y, 100, 50, 10);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = 'bold 11px Nunito';
        ctx.fillStyle = '#666';
        ctx.fillText('速度 SPD', x + 10, y + 18);
        ctx.font = 'bold 18px Nunito';

        // Color: green=slow, orange=medium, red=fast
        const ratio = clamp(speed / 900, 0, 1);
        if (ratio > 0.7) {
            ctx.fillStyle = '#E74C3C';
        } else if (ratio > 0.4) {
            ctx.fillStyle = '#F39C12';
        } else {
            ctx.fillStyle = '#2ECC71';
        }
        ctx.fillText(`${speed}km/h`, x + 10, y + 40);
    }

    _generateLandmarks(route, groundY) {
        const landmarks = [];
        const themeMap = {
            ocean: ['torii', 'pagoda', 'tokyo_tower', 'lighthouse'],
            continent: ['eiffel', 'big_ben', 'pagoda', 'windmill'],
            desert: ['pyramid', 'torii', 'pagoda', 'sphinx'],
        };
        const types = themeMap[route.theme] || themeMap.ocean;
        const count = Math.floor(route.distance / 4000);

        for (let i = 0; i < count; i++) {
            const x = 2000 + i * (route.distance - 3000) / count;
            const type = types[i % types.length];
            landmarks.push(new Landmark(x, groundY, type));
        }

        return landmarks;
    }

    _generateObstacles(route, groundY) {
        const obstacles = [];
        const diff = route.difficulty || 1;
        const dist = route.distance;

        // Mountains (static, in ground area)
        const numMountains = Math.floor(dist / 5000) * diff;
        for (let i = 0; i < numMountains; i++) {
            const x = 1500 + i * (dist - 2000) / numMountains + randRange(-200, 200);
            obstacles.push(new Obstacle(x, groundY, 'mountain', {
                width: 80 + Math.random() * 60,
                height: 100 + diff * 20 + Math.random() * 50,
            }));
        }

        // Birds (flying, mid-air)
        const numBirds = 3 + diff * 2;
        for (let i = 0; i < numBirds; i++) {
            const x = 2000 + randRange(0, dist - 1500);
            const y = randRange(80, groundY * 0.5);
            obstacles.push(new Obstacle(x, y, 'bird'));
        }

        // Balloons (floating)
        const numBalloons = 2 + diff;
        for (let i = 0; i < numBalloons; i++) {
            const x = 3000 + i * (dist - 4000) / numBalloons + randRange(-300, 300);
            const y = randRange(100, groundY * 0.6);
            obstacles.push(new Obstacle(x, y, 'balloon'));
        }

        // Storm clouds (higher difficulty only)
        if (diff >= 2) {
            const numStorms = diff - 1;
            for (let i = 0; i < numStorms; i++) {
                const x = 4000 + i * (dist - 5000) / numStorms;
                const y = randRange(120, groundY * 0.45);
                obstacles.push(new Obstacle(x, y, 'cloud_storm'));
            }
        }

        return obstacles;
    }

    _generatePowerUps(route) {
        const powerUps = [];
        const types = ['speed_boost', 'shield', 'magnet', 'star'];
        const count = 4 + Math.floor(route.distance / 5000);

        for (let i = 0; i < count; i++) {
            const x = 1500 + i * (route.distance - 2500) / count + randRange(-200, 200);
            const y = randRange(100, this.canvas.height * 0.55);
            const type = types[i % types.length];
            powerUps.push(new PowerUp(x, y, type));
        }

        return powerUps;
    }

    _generateWindZones(route) {
        const zones = [];
        const count = 2 + (route.difficulty || 1);
        for (let i = 0; i < count; i++) {
            zones.push({
                x: 2000 + i * (route.distance - 3000) / count,
                width: 600 + Math.random() * 400,
                strength: (Math.random() - 0.5) * 2 * (route.windSpeed || 1), // positive=down, negative=up
            });
        }
        return zones;
    }

    _updateWind(dt) {
        let wind = 0;
        let inWindZone = false;
        this.windZones.forEach(zone => {
            if (this.plane.x > zone.x && this.plane.x < zone.x + zone.width) {
                wind += zone.strength;
                inWindZone = true;
            }
        });
        this.currentWind = lerp(this.currentWind, wind, dt * 3);
        this.windIndicatorAlpha = lerp(this.windIndicatorAlpha, inWindZone ? 1 : 0, dt * 4);
    }

    _drawHP(ctx, w, h) {
        const x = w - 110;
        const y = 55;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(ctx, x, y, 95, 30, 8);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        for (let i = 0; i < this.maxHp; i++) {
            ctx.fillText(i < this.hp ? '❤️' : '🤍', x + 8 + i * 28, y + 22);
        }
    }

    _drawCombo(ctx, w, h) {
        const x = w / 2;
        const y = 45;
        const scale = 1 + Math.sin(this.time * 6) * 0.1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.font = 'bold 20px Nunito';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 3;
        const text = `🔥 COMBO x${this.combo}`;
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);

        // Combo timer bar
        const timerRatio = this.comboTimer / this.comboDecayTime;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.fillRect(-40, 6, 80 * timerRatio, 4);

        ctx.restore();
    }

    _drawActivePowerUps(ctx, w, h) {
        const types = Object.keys(this.activePowerUps);
        if (types.length === 0) return;

        const startX = 15;
        const y = 145;

        types.forEach((type, i) => {
            const remaining = this.activePowerUps[type];
            const config = {
                speed_boost: { icon: '⚡', color: '#FF6B35' },
                shield: { icon: '🛡️', color: '#4ECDC4' },
                magnet: { icon: '🧲', color: '#C77DFF' },
            }[type];
            if (!config) return;

            const px = startX + i * 45;

            // Background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            roundRect(ctx, px, y, 40, 40, 8);
            ctx.fill();

            // Icon
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(config.icon, px + 20, y + 24);

            // Timer bar
            const maxDur = { speed_boost: 3, shield: 5, magnet: 4 }[type];
            const ratio = remaining / maxDur;
            ctx.fillStyle = config.color;
            ctx.fillRect(px + 4, y + 34, 32 * ratio, 3);
        });
    }

    _drawWindIndicator(ctx, w, h) {
        if (this.windIndicatorAlpha < 0.05) return;

        const x = w / 2;
        const y = 70;

        ctx.save();
        ctx.globalAlpha = this.windIndicatorAlpha * 0.8;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(ctx, x - 50, y - 12, 100, 28, 8);
        ctx.fill();

        ctx.font = 'bold 12px Nunito';
        ctx.textAlign = 'center';

        if (this.currentWind > 0.3) {
            ctx.fillStyle = '#E74C3C';
            ctx.fillText('🌪️ 下降氣流 ↓', x, y + 7);
        } else if (this.currentWind < -0.3) {
            ctx.fillStyle = '#3498DB';
            ctx.fillText('🌪️ 上升氣流 ↑', x, y + 7);
        } else {
            ctx.fillStyle = '#F39C12';
            ctx.fillText('🌪️ 亂流區', x, y + 7);
        }

        ctx.restore();
    }
}
