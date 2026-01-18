/**
 * SpriteGen - Sprite Management with Background Removal
 */

import { generateId, loadImageFromFile, loadImageFromDataUrl } from './utils.js';

export class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.backgrounds = new Map();
        this.characters = new Map(); // Character groups with multiple variants
    }

    /**
     * Generate a unique character ID
     * @returns {string} Unique ID
     */
    generateCharacterId() {
        return generateId();
    }

    /**
     * Import a sprite from a file with optional white background removal
     * @param {File} file - Image file
     * @param {boolean} removeWhiteBg - Whether to remove white background
     * @param {string} characterId - Optional character ID to add variant to
     * @returns {Promise<Object>} Sprite data object
     */
    async importSprite(file, removeWhiteBg = true, characterId = null) {
        const originalImage = await loadImageFromFile(file);
        
        let processedImage = originalImage;
        if (removeWhiteBg) {
            processedImage = await this.removeWhiteBackground(originalImage);
        }
        
        const sprite = {
            id: generateId(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalImage: originalImage,
            image: processedImage,
            x: 1424,
            y: 688,
            scale: 125,
            opacity: 100,
            removeBackground: removeWhiteBg,
            dominantColor: this.extractDominantColor(processedImage),
            characterId: null,
            variantIndex: 0
        };
        
        this.sprites.set(sprite.id, sprite);
        
        // If adding to existing character, link them
        if (characterId && this.characters.has(characterId)) {
            this.addVariantToCharacter(characterId, sprite.id);
        }
        
        return sprite;
    }

    /**
     * Create a new character group from a sprite
     * @param {string} spriteId - Initial sprite ID
     * @param {string} characterName - Character name
     * @returns {Object} Character data
     */
    createCharacter(spriteId, characterName) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite) return null;
        
        const character = {
            id: generateId(),
            name: characterName,
            variants: [spriteId],
            activeVariant: 0,
            boxColor: '#e94560' // Default accent color for dialogue box
        };
        
        sprite.characterId = character.id;
        sprite.variantIndex = 0;
        
        this.characters.set(character.id, character);
        return character;
    }

    /**
     * Add a sprite variant to an existing character
     * @param {string} characterId - Character ID
     * @param {string} spriteId - Sprite ID to add
     */
    addVariantToCharacter(characterId, spriteId) {
        const character = this.characters.get(characterId);
        const sprite = this.sprites.get(spriteId);
        
        if (!character || !sprite) return;
        
        sprite.characterId = characterId;
        sprite.variantIndex = character.variants.length;
        character.variants.push(spriteId);
    }

    /**
     * Get character by ID
     * @param {string} characterId - Character ID
     * @returns {Object} Character data
     */
    getCharacter(characterId) {
        return this.characters.get(characterId);
    }

    /**
     * Get all characters
     * @returns {Array} Array of character objects
     */
    getAllCharacters() {
        return Array.from(this.characters.values());
    }

    /**
     * Get all variants for a character
     * @param {string} characterId - Character ID
     * @returns {Array} Array of sprite objects
     */
    getCharacterVariants(characterId) {
        const character = this.characters.get(characterId);
        if (!character) return [];
        
        return character.variants.map(id => this.sprites.get(id)).filter(Boolean);
    }

    /**
     * Get active variant sprite for a character
     * @param {string} characterId - Character ID
     * @returns {Object} Active sprite
     */
    getActiveVariant(characterId) {
        const character = this.characters.get(characterId);
        if (!character) return null;
        
        const spriteId = character.variants[character.activeVariant];
        return this.sprites.get(spriteId);
    }

    /**
     * Set active variant for a character
     * @param {string} characterId - Character ID
     * @param {number} variantIndex - Variant index
     */
    setActiveVariant(characterId, variantIndex) {
        const character = this.characters.get(characterId);
        if (character && variantIndex >= 0 && variantIndex < character.variants.length) {
            character.activeVariant = variantIndex;
        }
    }

    /**
     * Import a background image
     * @param {File} file - Image file
     * @returns {Promise<Object>} Background data object
     */
    async importBackground(file) {
        const image = await loadImageFromFile(file);
        
        const background = {
            id: generateId(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            image: image
        };
        
        this.backgrounds.set(background.id, background);
        return background;
    }

    /**
     * Remove white background from an image (edge-only flood fill)
     * @param {HTMLImageElement} image - Source image
     * @param {number} tolerance - Color tolerance (0-255)
     * @param {number} featherRadius - Edge feathering radius
     * @returns {Promise<HTMLImageElement>} Image with transparent background
     */
    async removeWhiteBackground(image, tolerance = 30, featherRadius = 3) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Draw original image
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Create mask for pixels to make transparent (flood fill from edges)
        const mask = new Uint8Array(width * height);
        const visited = new Uint8Array(width * height);
        
        // Flood fill from all edge pixels
        const queue = [];
        
        // Add all edge pixels to queue
        for (let x = 0; x < width; x++) {
            queue.push([x, 0]);
            queue.push([x, height - 1]);
        }
        for (let y = 0; y < height; y++) {
            queue.push([0, y]);
            queue.push([width - 1, y]);
        }
        
        // Flood fill to find connected white regions from edges
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            
            const pixelIdx = idx * 4;
            const r = data[pixelIdx];
            const g = data[pixelIdx + 1];
            const b = data[pixelIdx + 2];
            const a = data[pixelIdx + 3];
            
            // Check if pixel is near white or already transparent
            if (this.isNearWhite(r, g, b, tolerance) || a < 10) {
                mask[idx] = 1; // Mark for transparency
                
                // Add neighbors to queue
                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }
        
        // Apply feathering to edges
        const featheredMask = this.createFeatheredMask(mask, width, height, featherRadius);
        
        // Apply mask to image data
        for (let i = 0; i < mask.length; i++) {
            const alpha = featheredMask[i];
            if (alpha > 0) {
                const pixelIdx = i * 4;
                // Blend alpha based on feather value (0-255)
                const currentAlpha = data[pixelIdx + 3];
                data[pixelIdx + 3] = Math.max(0, currentAlpha - alpha);
            }
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to image element
        return loadImageFromDataUrl(canvas.toDataURL('image/png'));
    }
    
    /**
     * Create a feathered mask for soft edges
     * @param {Uint8Array} mask - Binary mask
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Feather radius
     * @returns {Uint8Array} Feathered mask with alpha values
     */
    createFeatheredMask(mask, width, height, radius) {
        const feathered = new Uint8Array(width * height);
        const extendedRadius = radius + 2; // Extend for smoother edges
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (mask[idx] === 1) {
                    // Fully transparent
                    feathered[idx] = 255;
                } else {
                    // Check distance to nearest masked pixel for feathering
                    let minDist = extendedRadius + 1;
                    
                    for (let dy = -extendedRadius; dy <= extendedRadius; dy++) {
                        for (let dx = -extendedRadius; dx <= extendedRadius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nidx = ny * width + nx;
                                if (mask[nidx] === 1) {
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    minDist = Math.min(minDist, dist);
                                }
                            }
                        }
                    }
                    
                    if (minDist <= extendedRadius) {
                        // Smooth cubic falloff for better edge blending
                        const t = minDist / extendedRadius;
                        const smoothT = t * t * (3 - 2 * t); // Smoothstep
                        const featherAmount = 1 - smoothT;
                        feathered[idx] = Math.floor(featherAmount * 180); // Stronger feathering
                    }
                }
            }
        }
        
        return feathered;
    }

    /**
     * Check if a color is near white
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} tolerance - Tolerance value
     * @returns {boolean} True if near white
     */
    isNearWhite(r, g, b, tolerance) {
        return r >= 255 - tolerance && 
               g >= 255 - tolerance && 
               b >= 255 - tolerance;
    }

    /**
     * Smooth edges of transparent areas to reduce harsh transitions
     * @param {ImageData} imageData - Image data to process
     */
    smoothEdges(imageData) {
        // This method is now handled by createFeatheredMask
        // Kept for backwards compatibility
    }

    /**
     * Extract the dominant saturated color from an image
     * Prioritizes the most frequently occurring saturated color
     * @param {HTMLImageElement} image - Image to analyze
     * @returns {Object} RGB color object with hex string
     */
    extractDominantColor(image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use smaller size for performance
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        
        ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        
        // Color buckets for quantization - weighted by saturation
        const colorCounts = new Map();
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            // Calculate saturation (0-1)
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lightness = (max + min) / 2 / 255;
            const saturation = max === min ? 0 : 
                lightness > 0.5 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
            
            // Skip low saturation colors (grays, whites, blacks)
            // Require at least 25% saturation to be considered
            if (saturation < 0.25) continue;
            
            // Also skip very dark or very bright colors
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 245) continue;
            
            // Quantize to reduce color variations (bucket by 24 for finer granularity)
            const qr = Math.floor(r / 24) * 24;
            const qg = Math.floor(g / 24) * 24;
            const qb = Math.floor(b / 24) * 24;
            
            const key = `${qr},${qg},${qb}`;
            // Weight count by saturation to prefer more saturated colors
            const weight = 1 + saturation;
            colorCounts.set(key, (colorCounts.get(key) || 0) + weight);
        }
        
        // Find most common saturated color
        let maxCount = 0;
        let dominantKey = null;
        
        for (const [key, count] of colorCounts) {
            if (count > maxCount) {
                maxCount = count;
                dominantKey = key;
            }
        }
        
        // Fallback to a default if no saturated colors found
        if (!dominantKey) {
            return { r: 233, g: 69, b: 96, hex: '#e94560' };
        }
        
        const [r, g, b] = dominantKey.split(',').map(Number);
        
        // Boost saturation slightly for better visibility in UI
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const mid = (max + min) / 2;
        
        // Push colors slightly away from gray
        const boostFactor = 1.15;
        let finalR = Math.min(255, Math.max(0, Math.round(mid + (r - mid) * boostFactor)));
        let finalG = Math.min(255, Math.max(0, Math.round(mid + (g - mid) * boostFactor)));
        let finalB = Math.min(255, Math.max(0, Math.round(mid + (b - mid) * boostFactor)));
        
        const hex = '#' + [finalR, finalG, finalB].map(x => x.toString(16).padStart(2, '0')).join('');
        
        return { r: finalR, g: finalG, b: finalB, hex };
    }

    /**
     * Update background removal setting for a sprite
     * @param {string} spriteId - Sprite ID
     * @param {boolean} removeWhiteBg - Whether to remove background
     */
    async updateBackgroundRemoval(spriteId, removeWhiteBg) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite) return;
        
        sprite.removeBackground = removeWhiteBg;
        
        if (removeWhiteBg) {
            sprite.image = await this.removeWhiteBackground(sprite.originalImage);
        } else {
            sprite.image = sprite.originalImage;
        }
        
        return sprite;
    }

    /**
     * Get a sprite by ID
     * @param {string} id - Sprite ID
     * @returns {Object|undefined} Sprite data
     */
    getSprite(id) {
        return this.sprites.get(id);
    }

    /**
     * Get a background by ID
     * @param {string} id - Background ID
     * @returns {Object|undefined} Background data
     */
    getBackground(id) {
        return this.backgrounds.get(id);
    }

    /**
     * Delete a sprite
     * @param {string} id - Sprite ID
     */
    deleteSprite(id) {
        this.sprites.delete(id);
    }

    /**
     * Delete a background
     * @param {string} id - Background ID
     */
    deleteBackground(id) {
        this.backgrounds.delete(id);
    }

    /**
     * Get all sprites
     * @returns {Array} Array of sprite objects
     */
    getAllSprites() {
        return Array.from(this.sprites.values());
    }

    /**
     * Get all backgrounds
     * @returns {Array} Array of background objects
     */
    getAllBackgrounds() {
        return Array.from(this.backgrounds.values());
    }

    /**
     * Create a thumbnail for an asset
     * @param {HTMLImageElement} image - Image element
     * @param {number} size - Thumbnail size
     * @returns {string} Thumbnail data URL
     */
    createThumbnail(image, size = 80) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = size;
        canvas.height = size;
        
        // Calculate aspect ratio fit
        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        
        // Draw checkerboard background for transparency
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(0, 0, size, size);
        
        const checkerSize = 10;
        ctx.fillStyle = '#3a3a5a';
        for (let cy = 0; cy < size; cy += checkerSize * 2) {
            for (let cx = 0; cx < size; cx += checkerSize * 2) {
                ctx.fillRect(cx, cy, checkerSize, checkerSize);
                ctx.fillRect(cx + checkerSize, cy + checkerSize, checkerSize, checkerSize);
            }
        }
        
        // Draw image
        ctx.drawImage(image, x, y, width, height);
        
        return canvas.toDataURL('image/png');
    }
}
