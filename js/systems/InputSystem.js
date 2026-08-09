/**
 * Input System - Handles all player input
 * Modular design allows easy addition of new input actions
 */
import { GameConfig } from '../data/GameConfig.js';
import { EventBus, GameEvents } from '../core/EventBus.js';

export class InputSystem {
    constructor(eventBus) {
        this.eventBus = eventBus || new EventBus();
        this.keys = new Map();
        this.mouse = { x: 0, y: 0, locked: false };
        this.inputMap = this._buildInputMap();
        this.actionState = new Map();
        
        this._bindEvents();
    }

    /**
     * Build reverse lookup map for input actions
     */
    _buildInputMap() {
        const map = new Map();
        for (const [action, keys] of Object.entries(GameConfig.inputMap)) {
            keys.forEach(keyCode => {
                map.set(keyCode, action);
            });
        }
        return map;
    }

    /**
     * Bind keyboard and mouse events
     */
    _bindEvents() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) {
                this.keys.set(e.code, { pressed: true, timestamp: Date.now() });
                
                // Emit action start event
                const action = this.inputMap.get(e.code);
                if (action) {
                    this.actionState.set(action, true);
                    this.eventBus.emit(`input:${action}:start`, { code: e.code });
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.has(e.code)) {
                const action = this.inputMap.get(e.code);
                if (action) {
                    this.actionState.set(action, false);
                    this.eventBus.emit(`input:${action}:end`, { code: e.code });
                }
                this.keys.delete(e.code);
            }
        });

        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (this.mouse.locked) {
                this.mouse.x = e.movementX;
                this.mouse.y = e.movementY;
                this.eventBus.emit('input:mouse:move', { 
                    deltaX: e.movementX, 
                    deltaY: e.movementY 
                });
            }
        });

        // Mouse buttons
        window.addEventListener('mousedown', (e) => {
            const buttonMap = { 0: 'left', 1: 'middle', 2: 'right' };
            const button = buttonMap[e.button];
            if (button) {
                this.eventBus.emit(`input:mouse:${button}:down`, { event: e });
            }
        });

        window.addEventListener('mouseup', (e) => {
            const buttonMap = { 0: 'left', 1: 'middle', 2: 'right' };
            const button = buttonMap[e.button];
            if (button) {
                this.eventBus.emit(`input:mouse:${button}:up`, { event: e });
            }
        });

        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            this.mouse.locked = document.pointerLockElement !== null;
            this.eventBus.emit('input:pointerlock:changed', { 
                locked: this.mouse.locked 
            });
        });
    }

    /**
     * Check if a key is currently pressed
     * @param {string} keyCode - Key code (e.g., 'KeyW')
     * @returns {boolean}
     */
    isKeyDown(keyCode) {
        return this.keys.has(keyCode);
    }

    /**
     * Check if an action is active
     * @param {string} action - Action name (e.g., 'moveForward')
     * @returns {boolean}
     */
    isActionActive(action) {
        return this.actionState.get(action) || false;
    }

    /**
     * Get movement input vector
     * @returns {Object} { x, z } movement direction
     */
    getMovementInput() {
        let x = 0;
        let z = 0;

        if (this.isActionActive('moveForward')) z -= 1;
        if (this.isActionActive('moveBackward')) z += 1;
        if (this.isActionActive('moveLeft')) x -= 1;
        if (this.isActionActive('moveRight')) x += 1;

        // Normalize diagonal movement
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }

        return { x, z };
    }

    /**
     * Request pointer lock for FPS controls
     */
    lockPointer() {
        document.body.requestPointerLock();
    }

    /**
     * Release pointer lock
     */
    unlockPointer() {
        document.exitPointerLock();
    }

    /**
     * Get current mouse delta
     * @returns {Object} { x, y }
     */
    getMouseDelta() {
        const delta = { x: this.mouse.x, y: this.mouse.y };
        // Reset after reading
        this.mouse.x = 0;
        this.mouse.y = 0;
        return delta;
    }

    /**
     * Check if pointer is locked
     * @returns {boolean}
     */
    isPointerLocked() {
        return this.mouse.locked;
    }

    /**
     * Add custom key binding at runtime
     * @param {string} action - Action name
     * @param {string} keyCode - Key code to bind
     */
    addKeyBinding(action, keyCode) {
        this.inputMap.set(keyCode, action);
    }

    /**
     * Remove key binding
     * @param {string} keyCode - Key code to remove
     */
    removeKeyBinding(keyCode) {
        this.inputMap.delete(keyCode);
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        this.keys.clear();
        this.actionState.clear();
        this.eventBus.clear();
    }
}

export default InputSystem;
