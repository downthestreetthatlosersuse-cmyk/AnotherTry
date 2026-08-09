/**
 * Event System - Pub/Sub pattern for decoupled communication
 * Enables modular architecture with loose coupling between systems
 */
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen to
     * @param {Function} callback - Function to call when event is fired
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback to remove
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event to fire
     * @param {*} data - Data to pass to callbacks
     */
    emit(eventName, data = null) {
        if (!this.events.has(eventName)) return;

        const callbacks = this.events.get(eventName);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for "${eventName}":`, error);
            }
        });
    }

    /**
     * Subscribe to an event once
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback to execute once
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (data) => {
            unsubscribe();
            callback(data);
        });
    }

    /**
     * Clear all events or specific event
     * @param {string} [eventName] - Optional event name to clear
     */
    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get number of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        if (!this.events.has(eventName)) return 0;
        return this.events.get(eventName).length;
    }
}

// Predefined event types for consistency
export const GameEvents = {
    // Player events
    PLAYER_HEALTH_CHANGED: 'player:healthChanged',
    PLAYER_DIED: 'player:died',
    PLAYER_MOVED: 'player:moved',
    PLAYER_JUMPED: 'player:jumped',
    
    // Game events
    GAME_STARTED: 'game:started',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    GAME_OVER: 'game:over',
    LEVEL_LOADED: 'level:loaded',
    LEVEL_COMPLETED: 'level:completed',
    
    // Entity events
    ENTITY_SPAWNED: 'entity:spawned',
    ENTITY_REMOVED: 'entity:removed',
    ENTITY_INTERACTED: 'entity:interacted',
    
    // Inventory events
    INVENTORY_UPDATED: 'inventory:updated',
    ITEM_PICKED_UP: 'item:pickedUp',
    ITEM_USED: 'item:used',
    
    // Combat events
    ENEMY_DAMAGED: 'enemy:damaged',
    ENEMY_DIED: 'enemy:died',
    PLAYER_HIT: 'player:hit',
    
    // UI events
    UI_UPDATED: 'ui:updated',
    SHOW_MESSAGE: 'ui:showMessage'
};

export default EventBus;
