/**
 * Player Controller - First-person player movement and camera control
 * Modular component that can be extended or replaced
 */
import * as THREE from 'three';
import { GameConfig } from '../data/GameConfig.js';
import { EventBus, GameEvents } from '../core/EventBus.js';

export class PlayerController {
    constructor(camera, eventBus) {
        this.camera = camera;
        this.eventBus = eventBus || new EventBus();
        
        // Player state
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.rotation = { x: 0, y: 0 };
        
        // Configuration
        this.config = {
            ...GameConfig.player
        };
        
        // State flags
        this.isGrounded = true;
        this.isSprinting = false;
        this.health = this.config.health;
        
        // Setup camera
        this._setupCamera();
    }

    /**
     * Initialize camera settings
     */
    _setupCamera() {
        this.camera.position.copy(this.position);
        this.camera.rotation.order = 'YXZ'; // Important for FPS look
    }

    /**
     * Update player based on input and physics
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {Object} input - Input data from InputSystem
     */
    update(deltaTime, input) {
        if (!input) return;

        // Handle mouse look
        this._handleMouseLook(input.mouseDelta);

        // Handle movement
        this._handleMovement(input.movementInput, deltaTime);

        // Apply gravity
        this._applyGravity(deltaTime);

        // Update camera position
        this.camera.position.copy(this.position);
        this.camera.rotation.x = this.rotation.x;
        this.camera.rotation.y = this.rotation.y;

        // Emit move event if moving
        if (this.velocity.lengthSq() > 0.01) {
            this.eventBus.emit(GameEvents.PLAYER_MOVED, {
                position: this.position.clone(),
                velocity: this.velocity.clone()
            });
        }
    }

    /**
     * Handle mouse look rotation
     * @param {Object} mouseDelta - { x, y } mouse movement
     */
    _handleMouseLook(mouseDelta) {
        if (!mouseDelta) return;

        const sensitivity = this.config.mouseSensitivity;

        // Horizontal rotation (yaw)
        this.rotation.y -= mouseDelta.x * sensitivity;

        // Vertical rotation (pitch) with limits
        this.rotation.x -= mouseDelta.y * sensitivity;
        this.rotation.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, this.rotation.x)
        );
    }

    /**
     * Handle player movement
     * @param {Object} movementInput - { x, z } input direction
     * @param {number} deltaTime - Time delta
     */
    _handleMovement(movementInput, deltaTime) {
        if (!movementInput) return;

        const speed = this.isSprinting ? 
            this.config.moveSpeed * 1.5 : 
            this.config.moveSpeed;

        // Calculate movement direction relative to camera
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);

        // Apply yaw rotation only (no pitch for movement)
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        // Combine directions
        this.direction.set(0, 0, 0);
        this.direction.addScaledVector(forward, -movementInput.z);
        this.direction.addScaledVector(right, movementInput.x);
        this.direction.normalize();

        // Apply movement to velocity
        if (this.direction.lengthSq() > 0) {
            this.velocity.x = this.direction.x * speed;
            this.velocity.z = this.direction.z * speed;
        } else {
            // Apply friction when no input
            this.velocity.x *= this.config.friction || 0.9;
            this.velocity.z *= this.config.friction || 0.9;
        }

        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    /**
     * Apply gravity to player
     * @param {number} deltaTime - Time delta
     */
    _applyGravity(deltaTime) {
        if (!this.isGrounded) {
            this.velocity.y += this.config.gravity * deltaTime;
            this.position.y += this.velocity.y * deltaTime;

            // Check if hit ground
            if (this.position.y <= 2) {
                this.position.y = 2;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        }
    }

    /**
     * Make player jump
     */
    jump() {
        if (this.isGrounded) {
            this.velocity.y = this.config.jumpForce;
            this.isGrounded = false;
            this.eventBus.emit(GameEvents.PLAYER_JUMPED, {
                position: this.position.clone()
            });
        }
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        this.eventBus.emit(GameEvents.PLAYER_HEALTH_CHANGED, {
            health: this.health,
            maxHealth: this.config.maxHealth
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    /**
     * Heal player
     * @param {number} amount - Healing amount
     */
    heal(amount) {
        this.health = Math.min(this.config.maxHealth, this.health + amount);
        
        this.eventBus.emit(GameEvents.PLAYER_HEALTH_CHANGED, {
            health: this.health,
            maxHealth: this.config.maxHealth
        });
    }

    /**
     * Handle player death
     */
    die() {
        this.eventBus.emit(GameEvents.PLAYER_DIED, {
            position: this.position.clone()
        });
    }

    /**
     * Reset player to spawn position
     * @param {Object} spawnPoint - { x, y, z } spawn coordinates
     */
    respawn(spawnPoint = { x: 0, y: 2, z: 0 }) {
        this.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
        this.velocity.set(0, 0, 0);
        this.rotation.x = 0;
        this.rotation.y = 0;
        this.health = this.config.maxHealth;
        this.isGrounded = true;
        
        this.camera.position.copy(this.position);
    }

    /**
     * Set sprinting state
     * @param {boolean} isSprinting
     */
    setSprinting(isSprinting) {
        this.isSprinting = isSprinting;
    }

    /**
     * Get current player position
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Get current player health
     * @returns {number}
     */
    getHealth() {
        return this.health;
    }

    /**
     * Get camera direction vector
     * @returns {THREE.Vector3}
     */
    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        return direction;
    }
}

export default PlayerController;
