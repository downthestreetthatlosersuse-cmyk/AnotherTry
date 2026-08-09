/**
 * Game Configuration - Central configuration management
 * Data-driven approach for easy modification
 */
export const GameConfig = {
    // Player settings
    player: {
        moveSpeed: 10,
        jumpForce: 15,
        gravity: 30,
        mouseSensitivity: 0.002,
        health: 100,
        maxHealth: 100
    },
    
    // Physics settings
    physics: {
        gravity: -9.8,
        friction: 0.9,
        collisionLayers: {
            DEFAULT: 1,
            PLAYER: 2,
            ENEMY: 4,
            PICKUP: 8,
            INTERACTABLE: 16
        }
    },
    
    // World settings
    world: {
        chunkSize: 100,
        renderDistance: 5,
        skyColor: 0x87CEEB,
        fogColor: 0x87CEEB,
        fogNear: 50,
        fogFar: 500
    },
    
    // Game settings
    game: {
        startingLevel: 1,
        maxInventorySlots: 5,
        interactionRange: 3
    },
    
    // Input mappings (easily customizable)
    inputMap: {
        moveForward: ['KeyW'],
        moveBackward: ['KeyS'],
        moveLeft: ['KeyA'],
        moveRight: ['KeyD'],
        jump: ['Space'],
        interact: ['KeyE'],
        inventory: ['KeyI', 'Tab'],
        sprint: ['ShiftLeft']
    }
};

export default GameConfig;
