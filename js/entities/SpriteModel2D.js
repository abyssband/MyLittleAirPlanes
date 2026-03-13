// ===== 2D Sprite Model with Multi-Frame Animation =====
// Drop-in replacement for CatModel3D using animated sprite sequences
// Interface: update(dt, state), getImage(), ready

export class SpriteModel2D {
    constructor(size = 256, spriteConfig = 'panda') {
        this.size = size;
        this.ready = false;
        this.time = 0;

        // Animation state
        this.animState = 'fly';       // fly | ascend | descend | happy | hit | crash | land_success | land_fail
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameSpeed = 0.15;       // seconds per frame (base)

        // Offscreen canvas for compositing
        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        this.ctx = this.canvas.getContext('2d');

        // Sprite configurations — multi-frame per state
        const prefix = spriteConfig; // 'cat', 'panda', or 'labrador'
        this.animations = {
            fly:          { frames: [`${prefix}_fly_1`, `${prefix}_fly_2`, `${prefix}_fly_1`, `${prefix}_fly_3`], speed: 0.12 },
            ascend:       { frames: [`${prefix}_ascend_1`, `${prefix}_ascend_2`], speed: 0.15 },
            descend:      { frames: [`${prefix}_descend_1`, `${prefix}_descend_2`], speed: 0.18 },
            happy:        { frames: [`${prefix}_happy`], speed: 0.3 },
            hit:          { frames: [`${prefix}_hit`], speed: 0.5 },
            crash:        { frames: [`${prefix}_crash`], speed: 0.5 },
            land_success: { frames: [`${prefix}_land_success`], speed: 0.5 },
            land_fail:    { frames: [`${prefix}_land_fail`], speed: 0.5 },
        };

        // Collect all unique sprite filenames
        const allFrames = new Set();
        Object.values(this.animations).forEach(anim => {
            anim.frames.forEach(f => allFrames.add(f));
        });

        this.images = {};
        this._loadSprites(Array.from(allFrames), prefix);
    }

    _loadSprites(frameNames, prefix) {
        let loaded = 0;
        const total = frameNames.length;

        frameNames.forEach(name => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                loaded++;
                if (loaded >= total) {
                    this.ready = true;
                }
            };
            img.onerror = () => {
                console.warn(`[SpriteModel2D] Failed to load: assets/sprites/${name}.png`);
                loaded++;
                if (loaded >= total && Object.keys(this.images).length > 0) {
                    this.ready = true;
                }
            };
            img.src = `assets/sprites/${name}.png`;
        });
    }

    update(dt, state = {}) {
        if (!this.ready) return;
        this.time += dt;

        const { speed = 0, maxSpeed = 500, vy = 0, launched = false, animOverride = null } = state;

        // animOverride takes priority (hit, crash, land_success, land_fail)
        let targetState;
        if (animOverride && this.animations[animOverride]) {
            targetState = animOverride;
        } else if (!launched) {
            targetState = 'fly';
        } else if (vy < -60) {
            targetState = 'ascend';
        } else if (vy > 60) {
            targetState = 'descend';
        } else if (state.expression === 'happy' && speed < 100) {
            targetState = 'happy';
        } else {
            targetState = 'fly';
        }

        // State transition — reset frame on change
        if (targetState !== this.animState) {
            this.animState = targetState;
            this.frameIndex = 0;
            this.frameTimer = 0;
        }

        // Frame cycling
        const anim = this.animations[this.animState];
        if (!anim) return;

        // Speed-adaptive frame rate — faster flight = faster wing flaps
        const speedRatio = launched ? Math.min(speed / maxSpeed, 1) : 0.3;
        const adaptiveSpeed = anim.speed * (1.2 - speedRatio * 0.6); // faster speed = shorter frame time

        this.frameTimer += dt;
        if (this.frameTimer >= adaptiveSpeed) {
            this.frameTimer -= adaptiveSpeed;
            this.frameIndex = (this.frameIndex + 1) % anim.frames.length;
        }

        // Render to offscreen canvas
        this._render(state);
    }

    _render(state = {}) {
        const ctx = this.ctx;
        const size = this.size;
        const anim = this.animations[this.animState];
        if (!anim) return;

        const frameName = anim.frames[this.frameIndex];
        const img = this.images[frameName];
        if (!img) return;

        ctx.clearRect(0, 0, size, size);
        ctx.save();

        const { speed = 0, maxSpeed = 500, launched = false } = state;
        const speedRatio = launched ? speed / maxSpeed : 0;

        // Gentle bob animation
        const bobY = Math.sin(this.time * 2.5) * 3;

        // Subtle tilt based on flight
        const tilt = launched ? Math.sin(this.time * 1.5) * 0.03 * speedRatio : 0;

        // Breathing scale
        const breathe = 1.0 + Math.sin(this.time * 2) * 0.012;

        // Center and transform
        ctx.translate(size / 2, size / 2 + bobY);
        ctx.rotate(tilt);
        ctx.scale(breathe, breathe);

        // Draw sprite — fill most of canvas
        const drawSize = size * 0.85;
        ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

        // Speed sparkles when flying fast
        if (launched && speedRatio > 0.5) {
            this._drawSpeedSparkles(ctx, size, speedRatio);
        }

        ctx.restore();
    }

    _drawSpeedSparkles(ctx, size, speedRatio) {
        const count = Math.floor(speedRatio * 5);
        const alpha = (speedRatio - 0.5) * 2 * 0.4;

        for (let i = 0; i < count; i++) {
            const phase = this.time * 3 + i * 1.7;
            const sparkleAlpha = Math.max(0, Math.sin(phase)) * alpha;
            if (sparkleAlpha < 0.05) continue;

            const sx = -size * 0.35 + Math.sin(phase * 0.7 + i) * size * 0.05;
            const sy = (i - count / 2) * 15 + Math.cos(phase) * 8;

            ctx.globalAlpha = sparkleAlpha;
            ctx.fillStyle = '#FFE082';

            const r = 3 + Math.sin(phase) * 1.5;
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
                const a = (j / 4) * Math.PI * 2 + this.time;
                ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
                const a2 = a + Math.PI / 4;
                ctx.lineTo(sx + Math.cos(a2) * r * 0.3, sy + Math.sin(a2) * r * 0.3);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    getImage() {
        return this.canvas;
    }

    dispose() {
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.images = {};
    }
}
