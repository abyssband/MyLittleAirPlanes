// ===== Main Entry Point =====
import { InputManager } from './systems/InputManager.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultScene } from './scenes/ResultScene.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputManager(this.canvas);

        this.currentScene = null;
        this.lastTime = 0;
        this.running = false;

        this._resize();
        window.addEventListener('resize', () => this._resize());

        this._showWorldMap();
        this._startLoop();
    }

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Use logical pixels for canvas dimensions
        this.canvas.logicalWidth = width;
        this.canvas.logicalHeight = height;
    }

    _startLoop() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    _loop(timestamp) {
        if (!this.running) return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        // Use logical dimensions
        const w = this.canvas.logicalWidth || this.canvas.width;
        const h = this.canvas.logicalHeight || this.canvas.height;

        // Clear
        this.ctx.clearRect(0, 0, w, h);

        // Update & draw current scene
        if (this.currentScene) {
            this.currentScene.update(dt);
            this.currentScene.draw();
        }

        // Reset input at end of frame
        this.input.resetFrame();

        requestAnimationFrame((t) => this._loop(t));
    }

    _showWorldMap() {
        const w = this.canvas.logicalWidth || this.canvas.width;
        const h = this.canvas.logicalHeight || this.canvas.height;

        const scene = new WorldMapScene(this.ctx, { width: w, height: h }, this.input);
        scene.onStartGame = (route, character) => {
            this._startGame(route, character);
        };
        this.currentScene = scene;
    }

    _startGame(route, characterType = 'cat') {
        const w = this.canvas.logicalWidth || this.canvas.width;
        const h = this.canvas.logicalHeight || this.canvas.height;

        const scene = new GameScene(this.ctx, { width: w, height: h }, this.input, route, characterType);
        scene.onComplete = (result) => {
            this._showResult(result);
        };
        scene.onQuit = () => {
            this._showWorldMap();
        };
        this.currentScene = scene;
    }

    _showResult(result) {
        const w = this.canvas.logicalWidth || this.canvas.width;
        const h = this.canvas.logicalHeight || this.canvas.height;

        const scene = new ResultScene(this.ctx, { width: w, height: h }, this.input, result);
        scene.onBackToMap = () => {
            this._showWorldMap();
        };
        this.currentScene = scene;
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
