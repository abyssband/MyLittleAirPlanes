// ===== Plane Entity =====
// 2D sprite-based plane with expressions and animations
import { lerp, clamp, degToRad, breathe } from '../utils/helpers.js';
import { SpriteModel2D } from './SpriteModel2D.js';

export class Plane {
    constructor(x, y, characterType = 'cat') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.targetPitch = 0;
        this.speed = 0;
        this.maxSpeed = 500;
        this.cruiseSpeed = 350;
        this.gravity = 180;
        this.lift = 175;
        this.width = 120;
        this.height = 120;
        this.propellerAngle = 0;
        this.time = 0;
        this.alive = true;
        this.launched = false;
        this.landed = false;
        this.landing = false;
        this.braking = false;
        this.brakingTime = 0;
        this.touchdownVx = 0;
        this.trailParticles = [];
        this.dustParticles = [];
        this.exhaustParticles = [];

        // Expression state
        this.expression = 'idle'; // idle, happy, worried, excited, sleeping
        this.blinkTimer = 0;
        this.blinking = false;
        this.animOverride = null; // hit, crash, land_success, land_fail

        // Screen shake
        this.shakeAmount = 0;
        this.shakeDecay = 5;

        // Slingshot state
        this.slingshotMode = true;
        this.slingshotAnchorX = x;
        this.slingshotAnchorY = y;
        this.slingshotPullX = 0;
        this.slingshotPullY = 0;
        this.slingshotActive = false;

        // Character model — always 2D sprite
        this.characterType = characterType;
        this.catModel = new SpriteModel2D(256, characterType);
    }

    launch(pullX, pullY) {
        const power = Math.sqrt(pullX * pullX + pullY * pullY);
        const maxPull = 150;
        const launchPower = Math.min(power, maxPull) / maxPull;

        this.vx = -pullX * 3.5;
        this.vy = -pullY * 2.0 - 100;
        this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.launched = true;
        this.slingshotMode = false;
        this.angle = Math.atan2(this.vy, this.vx);
        this.expression = 'excited';
        this.shakeAmount = 8;
    }

    update(dt, verticalInput, canvasH) {
        this.time += dt;
        this.propellerAngle += dt * (this.braking ? Math.max(2, 20 * (this.vx / Math.max(this.touchdownVx, 1))) : 20);

        // Blink timer
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.blinking = !this.blinking;
            this.blinkTimer = this.blinking ? 0.12 : 2 + Math.random() * 3;
        }

        // Screen shake decay
        this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);

        if (!this.launched || this.landed) return;

        // Braking on runway
        if (this.braking) {
            this._updateBraking(dt, canvasH);
            return;
        }

        const groundY = canvasH * 0.82;

        // Auto-forward thrust
        const targetSpeed = this.landing ? this.cruiseSpeed * 0.55 : this.cruiseSpeed;
        this.vx = lerp(this.vx, targetSpeed, dt * (this.landing ? 1.5 : 0.8));

        // Pitch control
        this.targetPitch = verticalInput;
        const pitchMultiplier = this.landing ? 500 : 400;
        const pitchForce = this.targetPitch * pitchMultiplier;
        this.vy += pitchForce * dt;

        // Gravity + Lift
        if (this.landing) {
            this.vy += this.gravity * 1.8 * dt;
            if (this.speed > 50) this.vy -= this.lift * 0.7 * dt;
            if (verticalInput <= 0 && this.y < groundY - 30) this.vy += 50 * dt;
        } else {
            this.vy += this.gravity * dt;
            if (this.speed > 50) this.vy -= this.lift * dt;
        }

        this.vy *= 0.985;
        this.vy = clamp(this.vy, -250, 250);

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        const margin = 30;
        this.y = clamp(this.y, margin, groundY - 5);

        this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const targetAngle = Math.atan2(this.vy, this.vx);
        this.angle = lerp(this.angle, targetAngle, dt * 5);

        // Update expression based on state
        if (this.landing) {
            this.expression = Math.abs(this.angle) > 0.3 ? 'worried' : 'happy';
        } else if (this.speed > 400) {
            this.expression = 'excited';
        } else if (Math.abs(this.vy) > 100) {
            this.expression = this.vy > 0 ? 'worried' : 'excited';
        } else {
            this.expression = 'happy';
        }

        // Trail particles
        if (Math.random() < 0.3) {
            this.trailParticles.push({
                x: this.x - Math.cos(this.angle) * 25,
                y: this.y - Math.sin(this.angle) * 25,
                life: 1,
                size: 3 + Math.random() * 4,
            });
        }
        this.trailParticles = this.trailParticles.filter(p => {
            p.life -= dt * 2;
            p.size *= 0.98;
            p.x -= 20 * dt;
            return p.life > 0;
        });

        // Engine exhaust
        if (this.speed > 50 && Math.random() < 0.4) {
            const exhaustAngle = this.angle + Math.PI;
            this.exhaustParticles.push({
                x: this.x + Math.cos(exhaustAngle) * 28,
                y: this.y + Math.sin(exhaustAngle) * 28,
                vx: Math.cos(exhaustAngle) * (50 + Math.random() * 30),
                vy: Math.sin(exhaustAngle) * (50 + Math.random() * 30) + (Math.random() - 0.5) * 20,
                life: 0.4 + Math.random() * 0.3,
                size: 2 + Math.random() * 3,
            });
        }
        this.exhaustParticles = this.exhaustParticles.filter(p => {
            p.life -= dt * 2.5;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.size *= 0.96;
            return p.life > 0;
        });

        // Dust particles
        this.dustParticles = this.dustParticles.filter(p => {
            p.life -= dt * 1.5;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= 30 * dt;
            p.size *= 0.97;
            return p.life > 0;
        });
    }

    _updateBraking(dt, canvasH) {
        const groundY = canvasH * 0.82;
        this.brakingTime += dt;
        this.expression = 'happy';

        const friction = 200;
        this.vx = Math.max(0, this.vx - friction * dt);
        this.vy = 0;
        this.y = groundY - 8;
        this.angle = lerp(this.angle, 0, dt * 5);

        this.x += this.vx * dt;
        this.speed = this.vx;

        // Dust
        if (this.vx > 10 && Math.random() < 0.5) {
            this.dustParticles.push({
                x: this.x - 20, y: groundY - 5,
                vx: -30 - Math.random() * 20, vy: -20 - Math.random() * 30,
                life: 0.8 + Math.random() * 0.4, size: 4 + Math.random() * 6,
            });
        }
        // Sparks
        if (this.vx > 60 && Math.random() < 0.3) {
            this.dustParticles.push({
                x: this.x - 15 + Math.random() * 10, y: groundY - 3,
                vx: -50 - Math.random() * 30, vy: -10 - Math.random() * 15,
                life: 0.3 + Math.random() * 0.2, size: 2 + Math.random() * 2, spark: true,
            });
        }

        this.dustParticles = this.dustParticles.filter(p => {
            p.life -= dt * 1.5;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= 30 * dt;
            p.size *= 0.97;
            return p.life > 0;
        });

        if (this.vx <= 1) {
            this.vx = 0;
            this.landed = true;
            this.expression = 'happy';
        }
    }

    startBraking() {
        this.braking = true;
        this.brakingTime = 0;
        this.touchdownVx = this.vx;
        this.vy = 0;
        this.shakeAmount = 5;
    }

    draw(ctx, cameraX) {
        const shakeX = (Math.random() - 0.5) * this.shakeAmount;
        const shakeY = (Math.random() - 0.5) * this.shakeAmount;
        const screenX = this.x - cameraX + shakeX;
        const screenY = this.y + shakeY;

        // Exhaust particles (behind plane)
        this.exhaustParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
            const heat = p.life * 2;
            if (heat > 0.5) {
                ctx.fillStyle = `rgba(255, 180, 50, ${p.life * 0.6})`;
            } else {
                ctx.fillStyle = `rgba(200, 200, 200, ${p.life * 0.4})`;
            }
            ctx.fill();
        });

        // Trail particles
        this.trailParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.5})`;
            ctx.fill();
        });

        // Dust particles
        this.dustParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
            if (p.spark) {
                ctx.fillStyle = `rgba(255, 200, 50, ${p.life})`;
            } else {
                ctx.fillStyle = `rgba(180, 160, 140, ${p.life * 0.6})`;
            }
            ctx.fill();
        });

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        const w = this.width;
        const h = this.height;

        // === 3D Cat Rendering ===
        if (this.catModel && this.catModel.ready) {
            // Update 3D model with current state
            this.catModel.update(0.016, {
                speed: this.speed,
                maxSpeed: this.maxSpeed,
                expression: this.expression,
                launched: this.launched,
                vy: this.vy,
                animOverride: this.animOverride,
            });

            // Draw the 3D rendered image
            const img = this.catModel.getImage();
            const drawW = w * 1.4;
            const drawH = h * 1.4;
            const bobY = Math.sin(this.time * 2) * 3;
            ctx.drawImage(img, -drawW * 0.45, -drawH * 0.5 + bobY, drawW, drawH);
        } else {
            // Fallback circle while loading
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#F5A623';
            ctx.fill();
        }

        ctx.restore();
    }

    getScreenX(cameraX) {
        return this.x - cameraX;
    }
}
