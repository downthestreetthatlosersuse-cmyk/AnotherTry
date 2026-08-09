/**
 * Inventory System - Manages player inventory and items
 * Data-driven item definitions for easy expansion
 */
import { EventBus, GameEvents } from '../core/EventBus.js';
import { GameConfig } from '../data/GameConfig.js';

/**
 * Item definitions - Easily extendable data-driven approach
 */
export const ItemDefinitions = {
    // Pickups
    'health_potion': {
        id: 'health_potion',
        name: 'Health Potion',
        description: 'Restores 25 health',
        type: 'consumable',
        stackable: true,
        maxStack: 99,
        icon: '🧪',
        color: 0xff0000,
        effect: {
            type: 'heal',
            value: 25
        }
    },
    'coin': {
        id: 'coin',
        name: 'Gold Coin',
        description: 'Currency',
        type: 'currency',
        stackable: true,
        maxStack: 999,
        icon: '🪙',
        color: 0xffd700,
        value: 1
    },
    'key': {
        id: 'key',
        name: 'Bronze Key',
        description: 'Opens bronze doors',
        type: 'key',
        stackable: false,
        icon: '🔑',
        color: 0xcd7f32,
        doorType: 'bronze'
    },
    'sword': {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A basic sword',
        type: 'weapon',
        stackable: false,
        icon: '⚔️',
        color: 0x808080,
        damage: 10,
        attackSpeed: 1.0
    },
    'shield': {
        id: 'shield',
        name: 'Wooden Shield',
        description: 'Provides basic protection',
        type: 'armor',
        stackable: false,
        icon: '🛡️',
        color: 0x8b4513,
        defense: 5
    }
};

/**
 * Inventory Slot
 */
export class InventorySlot {
    constructor(maxStack = 1) {
        this.item = null;
        this.quantity = 0;
        this.maxStack = maxStack;
    }

    /**
     * Add item to slot
     * @param {Object} itemDefinition
     * @param {number} quantity
     * @returns {number} Amount actually added (remainder if any)
     */
    addItem(itemDefinition, quantity = 1) {
        if (!itemDefinition) return quantity;

        // Check if slot is empty
        if (!this.item) {
            const canAdd = Math.min(quantity, this.maxStack);
            this.item = itemDefinition;
            this.quantity = canAdd;
            return quantity - canAdd;
        }

        // Check if items match and slot has space
        if (this.item.id === itemDefinition.id && this.item.stackable) {
            const space = this.maxStack - this.quantity;
            const canAdd = Math.min(quantity, space);
            this.quantity += canAdd;
            return quantity - canAdd;
        }

        // Can't add to this slot
        return quantity;
    }

    /**
     * Remove items from slot
     * @param {number} quantity
     * @returns {Object|null} Removed item or null
     */
    removeItem(quantity = 1) {
        if (!this.item || this.quantity === 0) return null;

        const removeAmount = Math.min(quantity, this.quantity);
        const item = { ...this.item, quantity: removeAmount };
        
        this.quantity -= removeAmount;
        
        if (this.quantity <= 0) {
            this.item = null;
            this.quantity = 0;
        }

        return item;
    }

    /**
     * Check if slot is empty
     * @returns {boolean}
     */
    isEmpty() {
        return !this.item || this.quantity === 0;
    }

    /**
     * Clear slot
     */
    clear() {
        this.item = null;
        this.quantity = 0;
    }
}

/**
 * Inventory System
 */
export class InventorySystem {
    constructor(eventBus) {
        this.eventBus = eventBus || new EventBus();
        this.slots = [];
        this.maxSlots = GameConfig.game.maxInventorySlots;
        
        this._initializeSlots();
    }

    /**
     * Initialize inventory slots
     */
    _initializeSlots() {
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push(new InventorySlot());
        }
    }

    /**
     * Add item to inventory
     * @param {string|Object} item - Item ID or definition
     * @param {number} quantity
     * @returns {boolean} Success
     */
    addItem(item, quantity = 1) {
        const itemDef = typeof item === 'string' ? 
            ItemDefinitions[item] : item;
        
        if (!itemDef) {
            console.warn(`Unknown item: ${item}`);
            return false;
        }

        let remaining = quantity;

        // First try to stack with existing items
        if (itemDef.stackable) {
            for (const slot of this.slots) {
                if (slot.item?.id === itemDef.id) {
                    remaining = slot.addItem(itemDef, remaining);
                    if (remaining <= 0) {
                        this._emitUpdate();
                        return true;
                    }
                }
            }
        }

        // Then try empty slots
        for (const slot of this.slots) {
            if (slot.isEmpty()) {
                remaining = slot.addItem(itemDef, remaining);
                if (remaining <= 0) {
                    this._emitUpdate();
                    return true;
                }
            }
        }

        // Inventory full
        this._emitUpdate();
        return remaining <= 0;
    }

    /**
     * Remove item from inventory
     * @param {string} itemId
     * @param {number} quantity
     * @returns {Object|null} Removed item
     */
    removeItem(itemId, quantity = 1) {
        let removedCount = 0;
        let removedItem = null;

        for (const slot of this.slots) {
            if (slot.item?.id === itemId) {
                const need = quantity - removedCount;
                const item = slot.removeItem(need);
                
                if (item) {
                    removedCount += item.quantity;
                    removedItem = item;
                    
                    if (removedCount >= quantity) {
                        break;
                    }
                }
            }
        }

        if (removedCount > 0) {
            this._emitUpdate();
            return removedItem;
        }

        return null;
    }

    /**
     * Get item count
     * @param {string} itemId
     * @returns {number}
     */
    getItemCount(itemId) {
        let count = 0;
        for (const slot of this.slots) {
            if (slot.item?.id === itemId) {
                count += slot.quantity;
            }
        }
        return count;
    }

    /**
     * Check if player has item
     * @param {string} itemId
     * @param {number} quantity
     * @returns {boolean}
     */
    hasItem(itemId, quantity = 1) {
        return this.getItemCount(itemId) >= quantity;
    }

    /**
     * Use item from inventory
     * @param {number} slotIndex
     * @param {Object} target - Target for item use
     * @returns {boolean} Success
     */
    useItem(slotIndex, target = null) {
        if (slotIndex < 0 || slotIndex >= this.maxSlots) return false;
        
        const slot = this.slots[slotIndex];
        if (slot.isEmpty()) return false;

        const item = slot.item;
        let success = false;

        // Handle by item type
        switch (item.type) {
            case 'consumable':
                if (item.effect) {
                    this._applyEffect(item.effect, target);
                    slot.removeItem(1);
                    success = true;
                }
                break;
            
            case 'weapon':
            case 'armor':
            case 'key':
                // Equipment handled elsewhere
                success = true;
                break;
            
            default:
                success = true;
        }

        if (success) {
            this.eventBus.emit(GameEvents.ITEM_USED, {
                item: slot.item,
                slot: slotIndex,
                target
            });
            
            if (slot.isEmpty()) {
                this._emitUpdate();
            }
        }

        return success;
    }

    /**
     * Apply item effect
     * @param {Object} effect
     * @param {Object} target
     */
    _applyEffect(effect, target) {
        switch (effect.type) {
            case 'heal':
                if (target?.heal) {
                    target.heal(effect.value);
                }
                break;
            case 'damage':
                if (target?.takeDamage) {
                    target.takeDamage(effect.value);
                }
                break;
            // Add more effect types as needed
        }
    }

    /**
     * Get slot at index
     * @param {number} index
     * @returns {InventorySlot|null}
     */
    getSlot(index) {
        if (index < 0 || index >= this.maxSlots) return null;
        return this.slots[index];
    }

    /**
     * Get all items
     * @returns {Array<Object>}
     */
    getAllItems() {
        const items = [];
        for (const slot of this.slots) {
            if (!slot.isEmpty()) {
                items.push({
                    ...slot.item,
                    quantity: slot.quantity
                });
            }
        }
        return items;
    }

    /**
     * Find first slot with item
     * @param {string} itemId
     * @returns {number} Slot index or -1
     */
    findItemSlot(itemId) {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].item?.id === itemId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Emit inventory update event
     */
    _emitUpdate() {
        this.eventBus.emit(GameEvents.INVENTORY_UPDATED, {
            inventory: this.getAllItems()
        });
    }

    /**
     * Clear inventory
     */
    clear() {
        this.slots.forEach(slot => slot.clear());
        this._emitUpdate();
    }

    /**
     * Get inventory state for saving
     * @returns {Object}
     */
    save() {
        return this.slots.map(slot => ({
            item: slot.item ? slot.item.id : null,
            quantity: slot.quantity
        }));
    }

    /**
     * Load inventory state
     * @param {Array} data
     */
    load(data) {
        this.slots.forEach(slot => slot.clear());
        
        if (!data) return;

        data.forEach((slotData, index) => {
            if (index < this.maxSlots && slotData.item) {
                const itemDef = ItemDefinitions[slotData.item];
                if (itemDef) {
                    this.slots[index].addItem(itemDef, slotData.quantity);
                }
            }
        });
        
        this._emitUpdate();
    }
}

export default { InventorySystem, ItemDefinitions, InventorySlot };
