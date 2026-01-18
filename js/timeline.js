/**
 * SpriteGen - Timeline/Scene Management
 */

import { generateId, deepClone } from './utils.js';

export class Timeline {
    constructor() {
        this.scenes = [];
        this.currentSceneIndex = 0;
        
        // Create initial scene
        this.addScene();
    }

    /**
     * Add a new scene
     * @param {Object} sceneData - Optional scene data
     * @returns {Object} New scene
     */
    addScene(sceneData = null) {
        const scene = sceneData || {
            id: generateId(),
            name: `Scene ${this.scenes.length + 1}`,
            duration: 3000,
            background: null,
            sprites: [],
            dialogue: {
                character: '',
                text: '',
                style: 'default',
                visible: false
            },
            thumbnail: null
        };
        
        this.scenes.push(scene);
        this.currentSceneIndex = this.scenes.length - 1;
        
        return scene;
    }

    /**
     * Duplicate current scene
     * @returns {Object} New duplicated scene
     */
    duplicateScene() {
        if (this.scenes.length === 0) return null;
        
        const current = this.scenes[this.currentSceneIndex];
        const duplicate = deepClone(current);
        duplicate.id = generateId();
        duplicate.name = `${current.name} (copy)`;
        
        // Insert after current scene
        this.scenes.splice(this.currentSceneIndex + 1, 0, duplicate);
        this.currentSceneIndex++;
        
        return duplicate;
    }

    /**
     * Delete current scene
     * @returns {boolean} Success
     */
    deleteScene() {
        if (this.scenes.length <= 1) return false;
        
        this.scenes.splice(this.currentSceneIndex, 1);
        
        if (this.currentSceneIndex >= this.scenes.length) {
            this.currentSceneIndex = this.scenes.length - 1;
        }
        
        return true;
    }

    /**
     * Get current scene
     * @returns {Object} Current scene
     */
    getCurrentScene() {
        return this.scenes[this.currentSceneIndex] || null;
    }

    /**
     * Set current scene by index
     * @param {number} index - Scene index
     */
    setCurrentScene(index) {
        if (index >= 0 && index < this.scenes.length) {
            this.currentSceneIndex = index;
            return this.scenes[index];
        }
        return null;
    }

    /**
     * Set current scene by ID
     * @param {string} id - Scene ID
     */
    setCurrentSceneById(id) {
        const index = this.scenes.findIndex(s => s.id === id);
        if (index !== -1) {
            this.currentSceneIndex = index;
            return this.scenes[index];
        }
        return null;
    }

    /**
     * Update current scene data
     * @param {Object} data - Scene data to update
     */
    updateCurrentScene(data) {
        const scene = this.getCurrentScene();
        if (scene) {
            Object.assign(scene, data);
        }
        return scene;
    }

    /**
     * Update scene thumbnail
     * @param {string} sceneId - Scene ID
     * @param {string} thumbnailDataUrl - Thumbnail image data URL
     */
    updateThumbnail(sceneId, thumbnailDataUrl) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (scene) {
            scene.thumbnail = thumbnailDataUrl;
        }
    }

    /**
     * Move scene to new position
     * @param {number} fromIndex - Current index
     * @param {number} toIndex - New index
     */
    moveScene(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.scenes.length) return;
        if (toIndex < 0 || toIndex >= this.scenes.length) return;
        
        const scene = this.scenes.splice(fromIndex, 1)[0];
        this.scenes.splice(toIndex, 0, scene);
        
        // Update current index if needed
        if (this.currentSceneIndex === fromIndex) {
            this.currentSceneIndex = toIndex;
        } else if (fromIndex < this.currentSceneIndex && toIndex >= this.currentSceneIndex) {
            this.currentSceneIndex--;
        } else if (fromIndex > this.currentSceneIndex && toIndex <= this.currentSceneIndex) {
            this.currentSceneIndex++;
        }
    }

    /**
     * Get all scenes
     * @returns {Array} All scenes
     */
    getAllScenes() {
        return [...this.scenes];
    }

    /**
     * Get scene count
     * @returns {number} Number of scenes
     */
    getSceneCount() {
        return this.scenes.length;
    }

    /**
     * Get current scene index
     * @returns {number} Current index
     */
    getCurrentIndex() {
        return this.currentSceneIndex;
    }

    /**
     * Go to next scene
     * @returns {Object|null} Next scene or null if at end
     */
    nextScene() {
        if (this.currentSceneIndex < this.scenes.length - 1) {
            this.currentSceneIndex++;
            return this.scenes[this.currentSceneIndex];
        }
        return null;
    }

    /**
     * Go to previous scene
     * @returns {Object|null} Previous scene or null if at start
     */
    previousScene() {
        if (this.currentSceneIndex > 0) {
            this.currentSceneIndex--;
            return this.scenes[this.currentSceneIndex];
        }
        return null;
    }

    /**
     * Get total duration of all scenes
     * @returns {number} Total duration in milliseconds
     */
    getTotalDuration() {
        return this.scenes.reduce((total, scene) => total + scene.duration, 0);
    }

    /**
     * Export timeline data for saving
     * @returns {Object} Timeline data
     */
    export() {
        return {
            scenes: this.scenes.map(scene => ({
                ...scene,
                // Don't include full image data in export, only references
                sprites: scene.sprites.map(sprite => ({
                    id: sprite.id,
                    name: sprite.name,
                    x: sprite.x,
                    y: sprite.y,
                    scale: sprite.scale,
                    opacity: sprite.opacity,
                    removeBackground: sprite.removeBackground
                }))
            })),
            currentSceneIndex: this.currentSceneIndex
        };
    }

    /**
     * Import timeline data
     * @param {Object} data - Timeline data
     */
    import(data) {
        if (data.scenes && Array.isArray(data.scenes)) {
            this.scenes = data.scenes;
            this.currentSceneIndex = data.currentSceneIndex || 0;
        }
    }

    /**
     * Clear all scenes and reset
     */
    clear() {
        this.scenes = [];
        this.currentSceneIndex = 0;
        this.addScene();
    }
}
