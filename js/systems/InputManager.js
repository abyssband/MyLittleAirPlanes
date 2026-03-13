// ===== Input Manager =====
// Handles keyboard + touch/mouse input
// All coordinates are reported in CSS/logical pixels (matching ctx.setTransform scaling)

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, justPressed: false, justReleased: false };
        this.touch = { x: 0, y: 0, active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
        this.dragState = { dragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
        this._clicks = [];

        this._bindEvents();
    }

    // Convert client coordinates to logical (CSS) pixel coordinates
    _toLogical(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }

    _bindEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = this._toLogical(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.down = true;
            this.mouse.justPressed = true;
            this.dragState.dragging = true;
            this.dragState.startX = pos.x;
            this.dragState.startY = pos.y;
            this.dragState.currentX = pos.x;
            this.dragState.currentY = pos.y;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this._toLogical(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            if (this.dragState.dragging) {
                this.dragState.currentX = pos.x;
                this.dragState.currentY = pos.y;
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.down = false;
            this.mouse.justReleased = true;
            this.dragState.dragging = false;
            const pos = this._toLogical(e.clientX, e.clientY);
            this._clicks.push({ x: pos.x, y: pos.y });
        });

        // Touch
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const pos = this._toLogical(t.clientX, t.clientY);
            this.touch.x = pos.x;
            this.touch.y = pos.y;
            this.touch.startX = pos.x;
            this.touch.startY = pos.y;
            this.touch.active = true;
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            this.mouse.down = true;
            this.mouse.justPressed = true;
            this.dragState.dragging = true;
            this.dragState.startX = pos.x;
            this.dragState.startY = pos.y;
            this.dragState.currentX = pos.x;
            this.dragState.currentY = pos.y;
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const pos = this._toLogical(t.clientX, t.clientY);
            this.touch.x = pos.x;
            this.touch.y = pos.y;
            this.touch.dx = pos.x - this.touch.startX;
            this.touch.dy = pos.y - this.touch.startY;
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            if (this.dragState.dragging) {
                this.dragState.currentX = pos.x;
                this.dragState.currentY = pos.y;
            }
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.active = false;
            this.mouse.down = false;
            this.mouse.justReleased = true;
            this.dragState.dragging = false;
            this._clicks.push({ x: this.touch.x, y: this.touch.y });
        }, { passive: false });
    }

    // Call at end of each frame
    resetFrame() {
        this.mouse.justPressed = false;
        this.mouse.justReleased = false;
        this._clicks = [];
    }

    getClicks() {
        return this._clicks;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    getVerticalInput() {
        let v = 0;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) v -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) v += 1;
        // Also check touch drag vertical
        if (this.touch.active) {
            const dragY = this.touch.dy;
            if (Math.abs(dragY) > 10) {
                v += Math.sign(dragY) * Math.min(Math.abs(dragY) / 100, 1);
            }
        }
        return clamp(v, -1, 1);
    }
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
