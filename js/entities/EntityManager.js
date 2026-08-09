/**
 * Entity System - Base class and manager for game entities
 * Component-based architecture for flexible entity creation
 */
import * as THREE from 'three';
import { EventBus, GameEvents } from '../core/EventBus.js';

/**
 * Base Entity class - All game entities extend this
 */
export class Entity {
    constructor(config) {
        this.id = Entity.generateId();
        this.type = config.type || 'entity';
        this.name = config.name || 'Unnamed Entity';
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.rotation = config.rotation || new THREE.Euler(0, 0, 0);
        this.scale = config.scale || new THREE.Vector3(1, 1, 1);
        this.tags = config.tags || [];
        this.components = new Map();
        
        // Three.js objects
        this.mesh = null;
        this.collider = null;
        
        // State
        this.active = true;
        this.health = config.health || 100;
        this.maxHealth = config.maxHealth || 100;
        this.isDead = false;
        
        // Metadata from config (data-driven)
        this.metadata = config.metadata || {};
        
        if (config.mesh) {
            this.createMesh(config.mesh);
        }
    }

    /**
     * Generate unique entity ID
     */
    static generateId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create visual mesh for entity
     * @param {Object} meshConfig - Configuration for mesh creation
     */
    createMesh(meshConfig) {
        const geometry = this._createGeometry(meshConfig.geometry);
        const material = this._createMaterial(meshConfig.material);
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        this.mesh.scale.copy(this.scale);
        this.mesh.userData.entityId = this.id;
        
        // Add to scene if provided
        if (meshConfig.scene) {
            meshConfig.scene.add(this.mesh);
        }
    }

    /**
     * Create geometry based on type
     * @param {Object} geoConfig - Geometry configuration
     * @returns {THREE.Geometry}
     */
    _createGeometry(geoConfig) {
        const type = geoConfig?.type || 'box';
        const params = geoConfig?.params || {};

        switch (type) {
            case 'box':
                return new THREE.BoxGeometry(
                    params.width || 1,
                    params.height || 1,
                    params.depth || 1
                );
            case 'sphere':
                return new THREE.SphereGeometry(
                    params.radius || 0.5,
                    params.segments || 16,
                    params.phiSegments || 16
                );
            case 'cylinder':
                return new THREE.CylinderGeometry(
                    params.radiusTop || 0.5,
                    params.radiusBottom || 0.5,
                    params.height || 1,
                    params.radialSegments || 16
                );
            case 'plane':
                return new THREE.PlaneGeometry(
                    params.width || 1,
                    params.height || 1
                );
            default:
                return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    /**
     * Create material based on type
     * @param {Object} matConfig - Material configuration
     * @returns {THREE.Material}
     */
    _createMaterial(matConfig) {
        const type = matConfig?.type || 'standard';
        const params = matConfig?.params || {};

        switch (type) {
            case 'basic':
                return new THREE.MeshBasicMaterial(params);
            case 'lambert':
                return new THREE.MeshLambertMaterial(params);
            case 'phong':
                return new THREE.MeshPhongMaterial(params);
            case 'standard':
            default:
                return new THREE.MeshStandardMaterial(params);
        }
    }

    /**
     * Add component to entity
     * @param {string} name - Component name
     * @param {Object} component - Component instance
     */
    addComponent(name, component) {
        this.components.set(name, component);
        if (component.onAdd) {
            component.onAdd(this);
        }
    }

    /**
     * Get component by name
     * @param {string} name - Component name
     * @returns {Object|null}
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Remove component
     * @param {string} name - Component name
     */
    removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.onRemove) {
            component.onRemove(this);
        }
        this.components.delete(name);
    }

    /**
     * Check if entity has tag
     * @param {string} tag - Tag to check
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Add tag to entity
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0 && !this.isDead) {
            this.die();
        }
    }

    /**
     * Handle entity death
     */
    die() {
        this.isDead = true;
        this.active = false;
        
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    /**
     * Update entity
     * @param {number} deltaTime - Time delta
     */
    update(deltaTime) {
        // Update components
        for (const component of this.components.values()) {
            if (component.update && !this.isDead) {
                component.update(this, deltaTime);
            }
        }

        // Sync mesh position
        if (this.mesh && this.active) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.scale.copy(this.scale);
        }
    }

    /**
     * Destroy entity and clean up
     */
    destroy() {
        this.active = false;
        
        // Clean up components
        for (const component of this.components.values()) {
            if (component.onDestroy) {
                component.onDestroy(this);
            }
        }
        this.components.clear();

        // Clean up mesh
        if (this.mesh) {
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            this.mesh = null;
        }
    }
}

/**
 * Entity Manager - Handles entity lifecycle and queries
 */
export class EntityManager {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus || new EventBus();
        this.entities = new Map();
        this.entitiesByType = new Map();
        this.entitiesByTag = new Map();
    }

    /**
     * Create and add entity
     * @param {Object} config - Entity configuration
     * @returns {Entity}
     */
    createEntity(config) {
        const entity = new Entity({ ...config, scene: this.scene });
        this.addEntity(entity);
        return entity;
    }

    /**
     * Add existing entity to manager
     * @param {Entity} entity
     */
    addEntity(entity) {
        this.entities.set(entity.id, entity);

        // Index by type
        if (!this.entitiesByType.has(entity.type)) {
            this.entitiesByType.set(entity.type, []);
        }
        this.entitiesByType.get(entity.type).push(entity);

        // Index by tags
        entity.tags.forEach(tag => {
            if (!this.entitiesByTag.has(tag)) {
                this.entitiesByTag.set(tag, []);
            }
            this.entitiesByTag.get(tag).push(entity);
        });

        // Emit spawn event
        this.eventBus.emit(GameEvents.ENTITY_SPAWNED, { entity });
    }

    /**
     * Remove entity by ID
     * @param {string} entityId
     */
    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        // Remove from type index
        const typeList = this.entitiesByType.get(entity.type);
        if (typeList) {
            const index = typeList.indexOf(entity);
            if (index !== -1) typeList.splice(index, 1);
        }

        // Remove from tag indices
        entity.tags.forEach(tag => {
            const tagList = this.entitiesByTag.get(tag);
            if (tagList) {
                const index = tagList.indexOf(entity);
                if (index !== -1) tagList.splice(index, 1);
            }
        });

        // Destroy and remove
        entity.destroy();
        this.entities.delete(entityId);

        // Emit removal event
        this.eventBus.emit(GameEvents.ENTITY_REMOVED, { entity });
    }

    /**
     * Get entity by ID
     * @param {string} entityId
     * @returns {Entity|null}
     */
    getEntity(entityId) {
        return this.entities.get(entityId) || null;
    }

    /**
     * Get entities by type
     * @param {string} type
     * @returns {Array<Entity>}
     */
    getEntitiesByType(type) {
        return this.entitiesByType.get(type) || [];
    }

    /**
     * Get entities by tag
     * @param {string} tag
     * @returns {Array<Entity>}
     */
    getEntitiesByTag(tag) {
        return this.entitiesByTag.get(tag) || [];
    }

    /**
     * Query entities with multiple tags
     * @param {Array<string>} tags
     * @returns {Array<Entity>}
     */
    queryEntities(tags) {
        if (!tags || tags.length === 0) return [];
        
        const sets = tags.map(tag => new Set(this.entitiesByTag.get(tag) || []));
        const result = [];

        for (const entity of this.entities.values()) {
            if (sets.every(set => set.has(entity))) {
                result.push(entity);
            }
        }

        return result;
    }

    /**
     * Update all entities
     * @param {number} deltaTime
     */
    update(deltaTime) {
        for (const entity of this.entities.values()) {
            if (entity.active && !entity.isDead) {
                entity.update(deltaTime);
            }
        }

        // Clean up dead entities
        for (const [id, entity] of this.entities.entries()) {
            if (entity.isDead) {
                this.removeEntity(id);
            }
        }
    }

    /**
     * Get all entities
     * @returns {Array<Entity>}
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }

    /**
     * Get entity count
     * @returns {number}
     */
    getEntityCount() {
        return this.entities.size;
    }

    /**
     * Clear all entities
     */
    clear() {
        for (const entityId of this.entities.keys()) {
            this.removeEntity(entityId);
        }
    }
}

export default { Entity, EntityManager };
