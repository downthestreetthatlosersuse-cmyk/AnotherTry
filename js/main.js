/**
 * Main Game Entry Point
 * Initializes and orchestrates all game systems
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { EventBus, GameEvents } from './core/EventBus.js';
import { GameConfig } from './data/GameConfig.js';
import { InputSystem } from './systems/InputSystem.js';
import { PlayerController } from './entities/PlayerController.js';
import { EntityManager } from './entities/EntityManager.js';
import { InventorySystem } from './systems/InventorySystem.js';

class Game {
    constructor() {
        // Core systems
        this.eventBus = new EventBus();
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = true;
        
        // Three.js setup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Game systems
        this.inputSystem = null;
        this.player = null;
        this.entityManager = null;
        this.inventory = null;
        
        // Game state
        this.score = 0;
        this.level = 1;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onGameStart = this.onGameStart.bind(this);
        
        // Initialize
        this.init();
    }

    /**
     * Initialize game
     */
    init() {
        this._setupThreeJS();
        this._setupSystems();
        this._setupWorld();
        this._setupEventListeners();
        this._setupUI();
        
        console.log('Game initialized successfully!');
    }

    /**
     * Setup Three.js renderer and scene
     */
    _setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(GameConfig.world.skyColor);
        this.scene.fog = new THREE.Fog(
            GameConfig.world.fogColor,
            GameConfig.world.fogNear,
            GameConfig.world.fogFar
        );

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Lighting
        this._setupLighting();

        // Handle resize
        window.addEventListener('resize', () => this._onWindowResize(), false);
    }

    /**
     * Setup lighting
     */
    _setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }

    /**
     * Initialize game systems
     */
    _setupSystems() {
        // Input system
        this.inputSystem = new InputSystem(this.eventBus);

        // Player controller
        this.player = new PlayerController(this.camera, this.eventBus);

        // Entity manager
        this.entityManager = new EntityManager(this.scene, this.eventBus);

        // Inventory system
        this.inventory = new InventorySystem(this.eventBus);
    }

    /**
     * Setup initial world
     */
    _setupWorld() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a5f0b,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper for visual reference
        const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x444444);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Add some test objects
        this._addTestObjects();
    }

    /**
     * Add test objects to the world
     */
    _addTestObjects() {
        // Create some boxes
        const boxColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        
        for (let i = 0; i < 10; i++) {
            const size = Math.random() * 2 + 1;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: boxColors[Math.floor(Math.random() * boxColors.length)],
                roughness: 0.5,
                metalness: 0.3
            });
            
            const box = new THREE.Mesh(geometry, material);
            box.position.set(
                (Math.random() - 0.5) * 50,
                size / 2,
                (Math.random() - 0.5) * 50
            );
            box.castShadow = true;
            box.receiveShadow = true;
            box.userData.interactable = true;
            box.userData.type = 'pickup';
            
            this.scene.add(box);
        }

        // Add some cylinders
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 16);
            const material = new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.7,
                metalness: 0.1
            });
            
            const cylinder = new THREE.Mesh(geometry, material);
            cylinder.position.set(
                (Math.random() - 0.5) * 30,
                1.5,
                (Math.random() - 0.5) * 30
            );
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            
            this.scene.add(cylinder);
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', this.onGameStart);

        // Pointer lock events
        this.eventBus.on('input:pointerlock:changed', (data) => {
            if (data.locked) {
                this.isPaused = false;
            } else {
                this.isPaused = true;
            }
        });

        // Jump input
        this.eventBus.on('input:jump:start', () => {
            if (!this.isPaused && this.player) {
                this.player.jump();
            }
        });

        // Sprint input
        this.eventBus.on('input:sprint:start', () => {
            if (this.player) {
                this.player.setSprinting(true);
            }
        });

        this.eventBus.on('input:sprint:end', () => {
            if (this.player) {
                this.player.setSprinting(false);
            }
        });

        // Interact input
        this.eventBus.on('input:interact:start', () => {
            this._handleInteraction();
        });

        // Player health changed
        this.eventBus.on(GameEvents.PLAYER_HEALTH_CHANGED, (data) => {
            this._updateHealthUI(data.health, data.maxHealth);
        });

        // Inventory updated
        this.eventBus.on(GameEvents.INVENTORY_UPDATED, (data) => {
            this._updateInventoryUI(data.inventory);
        });
    }

    /**
     * Setup UI elements
     */
    _setupUI() {
        // Initial UI state
        this._updateHealthUI(100, 100);
        this._updateScoreUI(0);
        this._updateLevelUI(1);
    }

    /**
     * Handle game start
     */
    onGameStart() {
        const startScreen = document.getElementById('start-screen');
        startScreen.style.display = 'none';
        
        this.inputSystem.lockPointer();
        this.isRunning = true;
        this.isPaused = false;
        
        this.eventBus.emit(GameEvents.GAME_STARTED, {
            level: this.level
        });
        
        this.clock.start();
        this.animate();
    }

    /**
     * Handle interaction with objects
     */
    _handleInteraction() {
        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        
        raycaster.setFromCamera(center, this.camera);
        
        const intersects = raycaster.intersectObjects(this.scene.children);
        
        for (const intersect of intersects) {
            if (intersect.distance <= GameConfig.game.interactionRange) {
                const obj = intersect.object;
                
                if (obj.userData.interactable) {
                    // Pick up object
                    if (obj.userData.type === 'pickup') {
                        this.inventory.addItem('coin', 1);
                        this.score += 10;
                        this._updateScoreUI(this.score);
                        
                        // Remove from scene
                        this.scene.remove(obj);
                        
                        this.eventBus.emit(GameEvents.ITEM_PICKED_UP, {
                            item: 'coin',
                            position: obj.position.clone()
                        });
                    }
                    
                    this.eventBus.emit(GameEvents.ENTITY_INTERACTED, {
                        object: obj,
                        distance: intersect.distance
                    });
                    
                    break;
                }
            }
        }
    }

    /**
     * Update health UI
     */
    _updateHealthUI(health, maxHealth) {
        const healthDisplay = document.getElementById('health-display');
        if (healthDisplay) {
            healthDisplay.textContent = Math.round(health);
        }
    }

    /**
     * Update score UI
     */
    _updateScoreUI(score) {
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = score;
        }
    }

    /**
     * Update level UI
     */
    _updateLevelUI(level) {
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = level;
        }
    }

    /**
     * Update inventory UI
     */
    _updateInventoryUI(items) {
        const inventoryEl = document.getElementById('inventory');
        const slotsEl = document.getElementById('inventory-slots');
        
        if (!slotsEl) return;
        
        slotsEl.innerHTML = '';
        
        if (items && items.length > 0) {
            inventoryEl.style.display = 'block';
            
            for (let i = 0; i < this.inventory.maxSlots; i++) {
                const slot = this.inventory.getSlot(i);
                const slotEl = document.createElement('div');
                slotEl.className = 'inventory-slot';
                
                if (!slot.isEmpty()) {
                    slotEl.title = `${slot.item.name} x${slot.quantity}`;
                    slotEl.style.background = `rgba(${slot.item.color >> 16 & 0xff}, ${slot.item.color >> 8 & 0xff}, ${slot.item.color & 0xff}, 0.3)`;
                    slotEl.textContent = slot.item.icon;
                    slotEl.style.fontSize = '24px';
                    slotEl.style.display = 'flex';
                    slotEl.style.alignItems = 'center';
                    slotEl.style.justifyContent = 'center';
                }
                
                slotsEl.appendChild(slotEl);
            }
        } else {
            inventoryEl.style.display = 'none';
        }
    }

    /**
     * Handle window resize
     */
    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Main game loop
     */
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        
        if (!this.isPaused) {
            // Update systems
            this._update(deltaTime);
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update game logic
     */
    _update(deltaTime) {
        // Get input
        const input = {
            movementInput: this.inputSystem.getMovementInput(),
            mouseDelta: this.inputSystem.getMouseDelta()
        };

        // Update player
        if (this.player) {
            this.player.update(deltaTime, input);
        }

        // Update entities
        if (this.entityManager) {
            this.entityManager.update(deltaTime);
        }
    }

    /**
     * Pause game
     */
    pause() {
        this.isPaused = true;
        this.inputSystem.unlockPointer();
        this.eventBus.emit(GameEvents.GAME_PAUSED, {});
    }

    /**
     * Resume game
     */
    resume() {
        this.isPaused = false;
        this.inputSystem.lockPointer();
        this.eventBus.emit(GameEvents.GAME_RESUMED, {});
    }

    /**
     * Toggle pause
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
}

// Start the game when DOM is ready
let game = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new Game();
    });
} else {
    game = new Game();
}

export default Game;
