/**
 * SpriteGen - Canvas Rendering Engine
 */

import { pointInRect } from './utils.js';

export class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 1920;
        this.height = 1080;
        this.zoom = 0.9;
        
        // Current scene state
        this.background = null;
        this.sprites = [];
        this.dialogue = null;
        this.selectedSprite = null;
        
        // Interaction state
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null; // 'tl', 'tr', 'bl', 'br' for corners
        this.dragOffset = { x: 0, y: 0 };
        this.resizeStart = { x: 0, y: 0, scale: 100 };
        
        // Handle size for hit detection
        this.handleSize = 20;
        
        // Animation state
        this.spriteAnimations = new Map();
        this.animationDuration = 0.07; // 70ms squish/stretch
        
        // Breathing animation state
        this.breathingPhase = 0;
        this.breathingSpeed = 0.8; // Cycles per second
        this.lastFrameTime = performance.now();
        
        this.setupEventListeners();
        this.updateCanvasSize();
        this.startAnimationLoop();
    }

    /**
     * Set animation duration for squish/stretch
     * @param {number} durationMs - Duration in milliseconds
     */
    setAnimationDuration(durationMs) {
        this.animationDuration = durationMs / 1000;
    }

    /**
     * Set breathing animation speed
     * @param {number} hz - Frequency in Hz (cycles per second)
     */
    setBreathingSpeed(hz) {
        this.breathingSpeed = hz;
    }

    /**
     * Start the animation render loop
     */
    startAnimationLoop() {
        const animate = (currentTime) => {
            const deltaTime = (currentTime - this.lastFrameTime) / 1000;
            this.lastFrameTime = currentTime;
            
            // Update breathing phase
            this.breathingPhase += deltaTime * this.breathingSpeed * Math.PI * 2;
            if (this.breathingPhase > Math.PI * 2) {
                this.breathingPhase -= Math.PI * 2;
            }
            
            this.updateAnimations();
            this.render();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    /**
     * Get breathing scale for a sprite
     */
    getBreathingScale() {
        // Very subtle breathing: 0.2% horizontal, 0.4% vertical
        const breathAmount = Math.sin(this.breathingPhase);
        return {
            x: 1 + breathAmount * 0.002,  // Tiny horizontal pulse
            y: 1 + breathAmount * 0.004   // Slightly more vertical (breathing)
        };
    }

    /**
     * Update sprite animations
     */
    updateAnimations() {
        const now = performance.now();
        
        for (const [spriteId, anim] of this.spriteAnimations) {
            const elapsed = (now - anim.startTime) / 1000;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            if (progress >= 1) {
                // Animation complete
                anim.scaleX = 1;
                anim.scaleY = 1;
                this.spriteAnimations.delete(spriteId);
            } else {
                // Squish then stretch animation
                // First half: squish horizontally, compress vertically
                // Second half: stretch vertically, return horizontal
                if (progress < 0.5) {
                    const t = progress * 2; // 0 to 1 for first half
                    anim.scaleX = 1 - 0.08 * Math.sin(t * Math.PI);
                    anim.scaleY = 1 + 0.04 * Math.sin(t * Math.PI);
                } else {
                    const t = (progress - 0.5) * 2; // 0 to 1 for second half
                    anim.scaleX = 1 + 0.03 * Math.sin(t * Math.PI);
                    anim.scaleY = 1 - 0.06 * Math.sin(t * Math.PI);
                }
            }
        }
    }

    /**
     * Trigger squish/stretch animation for a sprite
     */
    triggerSpriteAnimation(spriteId) {
        this.spriteAnimations.set(spriteId, {
            startTime: performance.now(),
            scaleX: 1,
            scaleY: 1
        });
    }

    /**
     * Set up canvas event listeners for interaction
     */
    setupEventListeners() {
        const wrapper = this.canvas.parentElement;
        
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    }

    /**
     * Convert mouse event to canvas coordinates
     */
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(e) {
        const pos = this.getCanvasCoordinates(e);
        
        // First check if clicking on resize handles of selected sprite
        if (this.selectedSprite) {
            const handle = this.getResizeHandleAt(pos);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.resizeStart = {
                    x: pos.x,
                    y: pos.y,
                    scale: this.selectedSprite.scale,
                    spriteX: this.selectedSprite.x,
                    spriteY: this.selectedSprite.y
                };
                return;
            }
        }
        
        // Check if clicking on a sprite (in reverse order for top-most first)
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const sprite = this.sprites[i];
            const bounds = this.getSpriteBounds(sprite);
            
            if (pointInRect(pos.x, pos.y, bounds.x, bounds.y, bounds.width, bounds.height)) {
                this.selectSprite(sprite);
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - sprite.x,
                    y: pos.y - sprite.y
                };
                return;
            }
        }
        
        // Clicked on empty space - deselect
        this.selectSprite(null);
    }

    /**
     * Get resize handle at position
     * @returns {string|null} Handle ID ('tl', 'tr', 'bl', 'br') or null
     */
    getResizeHandleAt(pos) {
        if (!this.selectedSprite) return null;
        
        const bounds = this.getSpriteBounds(this.selectedSprite);
        const hs = this.handleSize;
        
        const handles = {
            tl: { x: bounds.x, y: bounds.y },
            tr: { x: bounds.x + bounds.width, y: bounds.y },
            bl: { x: bounds.x, y: bounds.y + bounds.height },
            br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        };
        
        for (const [id, handle] of Object.entries(handles)) {
            if (pos.x >= handle.x - hs/2 && pos.x <= handle.x + hs/2 &&
                pos.y >= handle.y - hs/2 && pos.y <= handle.y + hs/2) {
                return id;
            }
        }
        
        return null;
    }

    /**
     * Handle mouse move event
     */
    onMouseMove(e) {
        const pos = this.getCanvasCoordinates(e);
        
        // Update cursor based on what's under it
        this.updateCursor(pos);
        
        if (this.isResizing && this.selectedSprite) {
            // Calculate scale change based on drag distance
            const dx = pos.x - this.resizeStart.x;
            const dy = pos.y - this.resizeStart.y;
            
            // Use diagonal distance for scale
            let delta = 0;
            switch (this.resizeHandle) {
                case 'br': delta = (dx + dy) / 2; break;
                case 'bl': delta = (-dx + dy) / 2; break;
                case 'tr': delta = (dx - dy) / 2; break;
                case 'tl': delta = (-dx - dy) / 2; break;
            }
            
            // Scale factor: 1 pixel = 0.5% scale change
            const newScale = Math.max(10, Math.min(300, this.resizeStart.scale + delta * 0.5));
            this.selectedSprite.scale = Math.round(newScale);
            
            this.render();
            
            window.dispatchEvent(new CustomEvent('spriteUpdated', { 
                detail: this.selectedSprite 
            }));
            return;
        }
        
        if (this.isDragging && this.selectedSprite) {
            this.selectedSprite.x = pos.x - this.dragOffset.x;
            this.selectedSprite.y = pos.y - this.dragOffset.y;
            
            this.render();
            
            window.dispatchEvent(new CustomEvent('spriteUpdated', { 
                detail: this.selectedSprite 
            }));
        }
    }

    /**
     * Update cursor based on position
     */
    updateCursor(pos) {
        if (!this.selectedSprite) {
            this.canvas.style.cursor = 'default';
            return;
        }
        
        const handle = this.getResizeHandleAt(pos);
        if (handle) {
            switch (handle) {
                case 'tl':
                case 'br':
                    this.canvas.style.cursor = 'nwse-resize';
                    break;
                case 'tr':
                case 'bl':
                    this.canvas.style.cursor = 'nesw-resize';
                    break;
            }
            return;
        }
        
        // Check if over sprite
        const bounds = this.getSpriteBounds(this.selectedSprite);
        if (pointInRect(pos.x, pos.y, bounds.x, bounds.y, bounds.width, bounds.height)) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }

    /**
     * Get sprite bounding box
     */
    getSpriteBounds(sprite) {
        const scale = sprite.scale / 100;
        const width = sprite.image.width * scale;
        const height = sprite.image.height * scale;
        
        return {
            x: sprite.x - width / 2,
            y: sprite.y - height / 2,
            width: width,
            height: height
        };
    }

    /**
     * Select a sprite
     */
    selectSprite(sprite) {
        this.selectedSprite = sprite;
        this.render();
        
        // Dispatch selection event
        window.dispatchEvent(new CustomEvent('spriteSelected', { 
            detail: sprite 
        }));
    }

    /**
     * Set zoom level
     */
    setZoom(zoomPercent) {
        this.zoom = zoomPercent / 100;
        this.updateCanvasSize();
    }

    /**
     * Update canvas display size based on zoom
     */
    updateCanvasSize() {
        this.canvas.style.width = `${this.width * this.zoom}px`;
        this.canvas.style.height = `${this.height * this.zoom}px`;
    }

    /**
     * Set background image
     */
    setBackground(image) {
        this.background = image;
        this.render();
    }

    /**
     * Add a sprite to the canvas
     */
    addSprite(spriteData) {
        this.sprites.push(spriteData);
        this.triggerSpriteAnimation(spriteData.id);
        this.render();
        return spriteData;
    }

    /**
     * Remove a sprite from the canvas
     */
    removeSprite(spriteId) {
        const index = this.sprites.findIndex(s => s.id === spriteId);
        if (index !== -1) {
            if (this.selectedSprite && this.selectedSprite.id === spriteId) {
                this.selectedSprite = null;
            }
            this.sprites.splice(index, 1);
            this.render();
        }
    }

    /**
     * Update sprite properties
     */
    updateSprite(spriteId, properties) {
        const sprite = this.sprites.find(s => s.id === spriteId);
        if (sprite) {
            Object.assign(sprite, properties);
            this.render();
        }
    }

    /**
     * Set dialogue data
     */
    setDialogue(dialogueData) {
        this.dialogue = dialogueData;
        this.render();
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Render the current scene
     */
    render() {
        this.clear();
        
        // Draw background
        if (this.background) {
            this.ctx.drawImage(this.background, 0, 0, this.width, this.height);
        }
        
        // Draw sprites
        for (const sprite of this.sprites) {
            this.drawSprite(sprite);
        }
        
        // Draw selection outline
        if (this.selectedSprite) {
            this.drawSelectionOutline(this.selectedSprite);
        }
        
        // Draw dialogue box
        if (this.dialogue && this.dialogue.visible) {
            this.drawDialogue(this.dialogue);
        }
    }

    /**
     * Draw a sprite
     */
    drawSprite(sprite) {
        const scale = sprite.scale / 100;
        const width = sprite.image.width * scale;
        const height = sprite.image.height * scale;
        
        // Get animation transforms if active
        const anim = this.spriteAnimations.get(sprite.id);
        const animScaleX = anim ? anim.scaleX : 1;
        const animScaleY = anim ? anim.scaleY : 1;
        
        // Get breathing animation (only if no active transition animation)
        const breathing = anim ? { x: 1, y: 1 } : this.getBreathingScale();
        
        const finalWidth = width * animScaleX * breathing.x;
        const finalHeight = height * animScaleY * breathing.y;
        
        // Adjust Y position to keep sprite grounded during animation
        const yOffset = (height - finalHeight) / 2;
        
        this.ctx.save();
        this.ctx.globalAlpha = sprite.opacity / 100;
        
        // Draw centered on position with animation transform
        this.ctx.drawImage(
            sprite.image,
            sprite.x - finalWidth / 2,
            sprite.y - finalHeight / 2 + yOffset,
            finalWidth,
            finalHeight
        );
        
        this.ctx.restore();
    }

    /**
     * Draw selection outline around a sprite
     */
    drawSelectionOutline(sprite) {
        const bounds = this.getSpriteBounds(sprite);
        
        this.ctx.save();
        this.ctx.strokeStyle = '#e94560';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw corner handles (larger for easier grabbing)
        const handleSize = this.handleSize;
        this.ctx.setLineDash([]);
        
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];
        
        for (const corner of corners) {
            // White fill with colored border for visibility
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(
                corner.x - handleSize / 2,
                corner.y - handleSize / 2,
                handleSize,
                handleSize
            );
            this.ctx.strokeStyle = '#e94560';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                corner.x - handleSize / 2,
                corner.y - handleSize / 2,
                handleSize,
                handleSize
            );
        }
        
        this.ctx.restore();
    }

    /**
     * Draw dialogue box
     */
    drawDialogue(dialogue) {
        const boxHeight = 200;
        const boxY = this.height - boxHeight - 40;
        const boxX = 40;
        const boxWidth = this.width - 80;
        const padding = 30;
        
        // Get box color (default to accent if not set)
        const boxColor = dialogue.boxColor || '#e94560';
        
        this.ctx.save();
        
        // Draw box background with slight transparency
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
        this.ctx.fill();
        
        // Draw colored border
        this.ctx.strokeStyle = boxColor;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // Draw accent line at top of box
        this.ctx.fillStyle = boxColor;
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxWidth, 6, [10, 10, 0, 0]);
        this.ctx.fill();
        
        // Draw character name with box color
        if (dialogue.character) {
            this.ctx.fillStyle = boxColor;
            this.ctx.font = 'bold 38px Calamity, "Segoe UI", sans-serif';
            this.ctx.fillText(dialogue.character, boxX + padding, boxY + padding + 32);
        }
        
        // Draw dialogue text (use displayedText for typewriter effect, fallback to clean text)
        const textToShow = dialogue.displayedText !== undefined && dialogue.displayedText !== null
            ? dialogue.displayedText
            : (dialogue.text || '').replace(/\[\[\d+\]\]/g, '');
        
        if (textToShow) {
            this.ctx.fillStyle = '#ffffff';
            let fontSize = 36;
            let fontStyle = '';
            
            // Apply text style
            switch (dialogue.style) {
                case 'thought':
                    fontStyle = 'italic ';
                    this.ctx.fillStyle = '#a0a0a0';
                    break;
                case 'shout':
                    fontSize = 44;
                    fontStyle = 'bold ';
                    break;
                case 'whisper':
                    fontSize = 30;
                    this.ctx.fillStyle = '#808080';
                    break;
            }
            
            this.ctx.font = `${fontStyle}${fontSize}px Calamity, "Segoe UI", sans-serif`;
            
            // Word wrap text
            const maxWidth = boxWidth - padding * 2;
            const lineHeight = fontSize * 1.4;
            const textY = boxY + padding + 75;
            
            this.wrapText(textToShow, boxX + padding, textY, maxWidth, lineHeight);
        }
        
        this.ctx.restore();
    }

    /**
     * Word wrap text drawing with newline support
     */
    wrapText(text, x, y, maxWidth, lineHeight) {
        // Split by newlines first
        const paragraphs = text.split('\n');
        let currentY = y;
        
        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
                // Empty line - just add line height
                currentY += lineHeight;
                continue;
            }
            
            const words = paragraph.split(' ');
            let line = '';
            
            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = this.ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && line !== '') {
                    this.ctx.fillText(line.trim(), x, currentY);
                    line = word + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            
            this.ctx.fillText(line.trim(), x, currentY);
            currentY += lineHeight;
        }
    }

    /**
     * Get current scene state for saving
     */
    getSceneState() {
        return {
            background: this.background ? this.background.src : null,
            sprites: this.sprites.map(s => ({
                id: s.id,
                name: s.name,
                imageSrc: s.image.src,
                x: s.x,
                y: s.y,
                scale: s.scale,
                opacity: s.opacity,
                removeBackground: s.removeBackground
            })),
            dialogue: this.dialogue ? { ...this.dialogue } : null
        };
    }

    /**
     * Load scene state
     */
    async loadSceneState(state) {
        // This will be implemented with proper async image loading
        this.sprites = [];
        this.dialogue = state.dialogue;
        this.background = null;
        this.render();
    }

    /**
     * Export canvas as image data URL
     */
    toDataURL(format = 'image/png') {
        // Temporarily hide selection for export
        const selected = this.selectedSprite;
        this.selectedSprite = null;
        this.render();
        
        const dataUrl = this.canvas.toDataURL(format);
        
        // Restore selection
        this.selectedSprite = selected;
        this.render();
        
        return dataUrl;
    }
}
