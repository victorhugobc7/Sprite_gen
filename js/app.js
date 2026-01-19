/**
 * SpriteGen - Main Application Controller
 */

import { CanvasEngine } from './canvas.js';
import { SpriteManager } from './sprite.js';
import { DialogueSystem } from './dialogue.js';
import { Timeline } from './timeline.js';
import { AudioManager } from './audio.js';
import { HistoryManager } from './history.js';
import { downloadFile, downloadCanvas, debounce } from './utils.js';

class SpriteGenApp {
    constructor() {
        this.canvas = new CanvasEngine('main-canvas');
        this.spriteManager = new SpriteManager();
        this.dialogueSystem = new DialogueSystem();
        this.timeline = new Timeline();
        this.audioManager = new AudioManager();
        this.history = new HistoryManager(50);
        
        // Grid settings
        this.gridEnabled = false;
        this.snapToGrid = false;
        this.gridSize = 50;
        
        // Scene templates
        this.sceneTemplates = this.loadTemplatesFromStorage();
        
        this.previewMode = false;
        this.previewInterval = null;
        this.previewPlaying = false;
        
        // Video export state
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        // Currently selected character in the left panel
        this.selectedCharacterId = null;
        
        // Currently selected dialogue line index
        this.selectedDialogueIndex = 0;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEventListeners();
        this.setupKeyboardShortcuts();
        this.setupHistoryCallbacks();
        this.loadInitialScene();
        this.updateTimelineUI();
        this.updateLayersPanel();
    }

    /**
     * Bind all event listeners
     */
    bindEventListeners() {
        // Accordion functionality for panel sections
        this.setupAccordions();

        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => this.newProject());
        document.getElementById('btn-save').addEventListener('click', () => this.saveProject());
        document.getElementById('btn-load').addEventListener('click', () => this.loadProjectDialog());
        document.getElementById('btn-export').addEventListener('click', () => this.exportSequence());
        document.getElementById('btn-preview').addEventListener('click', () => this.togglePreview());

        // Sprite import
        this.setupDropZone('sprite-drop-zone', 'sprite-input', (files) => this.importSprites(files));
        
        // Background import
        this.setupDropZone('bg-drop-zone', 'bg-input', (files) => this.importBackgrounds(files));

        // Character management
        document.getElementById('btn-new-character').addEventListener('click', () => this.createNewCharacter());
        
        document.getElementById('btn-export-character').addEventListener('click', () => this.exportCharacter());
        
        document.getElementById('btn-import-character').addEventListener('click', () => {
            document.getElementById('character-import-input').click();
        });
        
        document.getElementById('character-import-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importCharacter(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Undo/Redo buttons
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());

        // Grid controls
        document.getElementById('btn-toggle-grid').addEventListener('click', () => this.toggleGrid());
        document.getElementById('btn-snap-grid').addEventListener('click', () => this.toggleSnapToGrid());
        document.getElementById('grid-size').addEventListener('change', (e) => {
            this.setGridSize(parseInt(e.target.value) || 50);
        });

        // Templates
        document.getElementById('btn-save-template').addEventListener('click', () => this.saveAsTemplate());

        // Project file input
        document.getElementById('project-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadProject(e.target.files[0]);
            }
        });

        // Zoom slider
        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            const zoom = parseInt(e.target.value);
            document.getElementById('zoom-value').textContent = `${zoom}%`;
            this.canvas.setZoom(zoom);
        });

        // Animation settings
        document.getElementById('anim-breathing-speed').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value) / 100; // Convert to Hz
            document.getElementById('anim-breathing-speed-value').textContent = `${speed.toFixed(1)} Hz`;
            this.canvas.setBreathingSpeed(speed);
        });

        document.getElementById('anim-transition-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('anim-transition-duration-value').textContent = `${duration} ms`;
            this.canvas.setAnimationDuration(duration);
        });

        // Position transition settings
        document.getElementById('anim-position-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('anim-position-duration-value').textContent = `${duration} ms`;
            this.canvas.setPositionTransitionDuration(duration);
        });

        document.getElementById('anim-position-easing').addEventListener('change', (e) => {
            this.canvas.setPositionTransitionEasing(e.target.value);
        });

        // Scene properties
        document.getElementById('scene-name').addEventListener('input', debounce((e) => {
            this.timeline.updateCurrentScene({ name: e.target.value });
            this.updateTimelineUI();
        }, 300));

        document.getElementById('scene-duration').addEventListener('input', debounce((e) => {
            this.timeline.updateCurrentScene({ duration: parseInt(e.target.value) || 3000 });
        }, 300));

        // Sprite properties
        this.setupSpritePropertyListeners();

        // Dialogue properties
        this.setupDialoguePropertyListeners();

        // Timeline controls
        document.getElementById('btn-add-scene').addEventListener('click', () => this.addScene());
        document.getElementById('btn-duplicate-scene').addEventListener('click', () => this.duplicateScene());
        document.getElementById('btn-delete-scene').addEventListener('click', () => this.deleteScene());

        // Preview controls (inline on timeline)
        document.getElementById('preview-play').addEventListener('click', () => this.togglePreview());
        document.getElementById('preview-prev').addEventListener('click', () => this.previewPrevScene());
        document.getElementById('preview-next').addEventListener('click', () => this.previewNextScene());

        // Canvas events
        window.addEventListener('spriteSelected', (e) => this.onSpriteSelected(e.detail));
        window.addEventListener('spriteUpdated', (e) => this.onSpriteUpdated(e.detail));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Options controls
        this.setupOptionsListeners();

        // Scene transition controls
        this.setupTransitionListeners();

        // Audio controls
        this.setupAudioListeners();
    }

    /**
     * Set up options control listeners
     */
    setupOptionsListeners() {
        document.getElementById('canvas-bg-color').addEventListener('input', (e) => {
            this.canvas.canvasBackgroundColor = e.target.value;
            this.canvas.render();
        });
    }

    /**
     * Set up transition control listeners
     */
    setupTransitionListeners() {
        document.getElementById('scene-transition-style').addEventListener('change', (e) => {
            this.canvas.setSceneTransitionStyle(e.target.value);
        });

        document.getElementById('scene-transition-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('scene-transition-duration-value').textContent = `${duration} ms`;
            this.canvas.setSceneTransitionDuration(duration);
        });

        document.getElementById('bg-transition-style').addEventListener('change', (e) => {
            this.canvas.setBgTransitionStyle(e.target.value);
        });

        document.getElementById('bg-transition-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('bg-transition-duration-value').textContent = `${duration} ms`;
            this.canvas.setBgTransitionDuration(duration);
        });
    }

    /**
     * Set up audio control listeners
     */
    setupAudioListeners() {
        // Expression SFX upload
        document.getElementById('btn-upload-sfx-expression').addEventListener('click', () => {
            document.getElementById('sfx-expression-input').click();
        });

        document.getElementById('sfx-expression-input').addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const result = await this.audioManager.loadExpressionSfx(e.target.files[0]);
                document.getElementById('sfx-expression-name').textContent = result.name;
                document.getElementById('sfx-expression-name').classList.add('has-file');
                e.target.value = '';
            }
        });

        document.getElementById('btn-clear-sfx-expression').addEventListener('click', () => {
            this.audioManager.clearExpressionSfx();
            document.getElementById('sfx-expression-name').textContent = 'No file';
            document.getElementById('sfx-expression-name').classList.remove('has-file');
        });

        document.getElementById('sfx-expression-volume').addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            document.getElementById('sfx-expression-volume-value').textContent = `${volume}%`;
            this.audioManager.setExpressionSfxVolume(volume / 100);
        });

        // BGM upload
        document.getElementById('btn-upload-bgm').addEventListener('click', () => {
            document.getElementById('bgm-input').click();
        });

        document.getElementById('bgm-input').addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const result = await this.audioManager.loadBgm(e.target.files[0]);
                document.getElementById('bgm-name').textContent = result.name;
                document.getElementById('bgm-name').classList.add('has-file');
                e.target.value = '';
            }
        });

        document.getElementById('btn-clear-bgm').addEventListener('click', () => {
            this.audioManager.clearBgm();
            document.getElementById('bgm-name').textContent = 'No file';
            document.getElementById('bgm-name').classList.remove('has-file');
            document.getElementById('btn-toggle-bgm').textContent = '▶ Play BGM';
        });

        document.getElementById('bgm-volume').addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            document.getElementById('bgm-volume-value').textContent = `${volume}%`;
            this.audioManager.setBgmVolume(volume / 100);
        });

        document.getElementById('btn-toggle-bgm').addEventListener('click', () => {
            const playing = this.audioManager.toggleBgm();
            document.getElementById('btn-toggle-bgm').textContent = playing ? '⏸ Pause BGM' : '▶ Play BGM';
        });
    }

    /**
     * Set up accordion functionality for collapsible panel sections
     */
    setupAccordions() {
        const sections = document.querySelectorAll('.panel-section h3');
        sections.forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking on an interactive element inside the header
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                
                const section = header.parentElement;
                section.classList.toggle('collapsed');
            });
        });
    }

    /**
     * Set up a drop zone for file imports
     */
    setupDropZone(dropZoneId, inputId, handler) {
        const dropZone = document.getElementById(dropZoneId);
        const input = document.getElementById(inputId);

        dropZone.addEventListener('click', () => input.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            handler(e.dataTransfer.files);
        });

        input.addEventListener('change', (e) => {
            handler(e.target.files);
            input.value = '';
        });
    }

    /**
     * Set up sprite property input listeners
     */
    setupSpritePropertyListeners() {
        document.getElementById('sprite-variant-select').addEventListener('change', (e) => {
            if (this.canvas.selectedSprite && this.canvas.selectedSprite.characterId) {
                const variantIndex = parseInt(e.target.value);
                this.switchSpriteVariant(this.canvas.selectedSprite, variantIndex);
            }
        });

        // Replace sprite image
        document.getElementById('btn-replace-sprite').addEventListener('click', () => {
            if (this.canvas.selectedSprite) {
                document.getElementById('replace-sprite-input').click();
            }
        });

        document.getElementById('replace-sprite-input').addEventListener('change', async (e) => {
            if (e.target.files.length > 0 && this.canvas.selectedSprite) {
                await this.replaceSpriteImage(this.canvas.selectedSprite.id, e.target.files[0]);
                e.target.value = ''; // Reset for next upload
            }
        });

        document.getElementById('sprite-x').addEventListener('input', debounce((e) => {
            if (this.canvas.selectedSprite) {
                this.canvas.updateSprite(this.canvas.selectedSprite.id, { 
                    x: parseInt(e.target.value) || 0 
                });
            }
        }, 100));

        document.getElementById('sprite-y').addEventListener('input', debounce((e) => {
            if (this.canvas.selectedSprite) {
                this.canvas.updateSprite(this.canvas.selectedSprite.id, { 
                    y: parseInt(e.target.value) || 0 
                });
            }
        }, 100));

        document.getElementById('sprite-scale').addEventListener('input', (e) => {
            const scale = parseInt(e.target.value);
            document.getElementById('sprite-scale-value').textContent = `${scale}%`;
            if (this.canvas.selectedSprite) {
                this.canvas.updateSprite(this.canvas.selectedSprite.id, { scale });
            }
        });

        document.getElementById('sprite-opacity').addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            document.getElementById('sprite-opacity-value').textContent = `${opacity}%`;
            if (this.canvas.selectedSprite) {
                this.canvas.updateSprite(this.canvas.selectedSprite.id, { opacity });
            }
        });
    }

    /**
     * Replace a sprite's image with a new file
     * @param {string} spriteId - ID of sprite to replace
     * @param {File} file - New image file
     */
    async replaceSpriteImage(spriteId, file) {
        const sprite = this.canvas.selectedSprite;
        if (!sprite) return;

        // Get current background removal setting
        const removeWhiteBg = sprite.removeBackground !== false;
        
        // Replace image in sprite manager
        const updatedSprite = await this.spriteManager.replaceSpriteImage(spriteId, file, removeWhiteBg);
        if (!updatedSprite) return;
        
        // Update canvas sprite reference
        const canvasSprite = this.canvas.sprites.find(s => s.id === spriteId);
        if (canvasSprite) {
            canvasSprite.image = updatedSprite.image;
            canvasSprite.originalImage = updatedSprite.originalImage;
            canvasSprite.name = updatedSprite.name;
            canvasSprite.dominantColor = updatedSprite.dominantColor;
        }
        
        // Re-render
        this.canvas.render();
        this.saveCurrentSceneState();
        
        // Update character list UI to reflect new sprite name
        this.updateCharacterListCount();
    }

    /**
     * Create a new character
     */
    createNewCharacter() {
        const name = prompt('Enter character name:');
        if (!name || !name.trim()) return;
        
        // Create character without an initial sprite
        const character = {
            id: this.spriteManager.generateCharacterId(),
            name: name.trim(),
            variants: [],
            activeVariant: 0,
            boxColor: '#e94560'
        };
        
        this.spriteManager.characters.set(character.id, character);
        this.addCharacterToList(character);
        this.selectCharacter(character.id);
    }

    /**
     * Add a character to the character list UI
     */
    addCharacterToList(character) {
        const list = document.getElementById('character-list');
        const item = document.createElement('div');
        item.className = 'character-item';
        item.dataset.id = character.id;
        
        item.innerHTML = `
            <span class="character-name">${character.name}</span>
            <span class="sprite-count">${character.variants.length} sprites</span>
            <button class="character-delete" title="Delete Character">✕</button>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('character-delete')) {
                this.selectCharacter(character.id);
            }
        });
        
        item.querySelector('.character-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCharacter(character.id);
        });
        
        // Insert before the "New Character" button
        const btn = document.getElementById('btn-new-character');
        list.insertBefore(item, btn);
        
        // Update the character dropdown in dialogue editor
        this.updateCharacterDropdown(document.getElementById('dialogue-character').value);
    }

    /**
     * Delete a character and all its sprites
     */
    deleteCharacter(characterId) {
        if (!confirm('Delete this character and all its sprites?')) return;
        
        const character = this.spriteManager.getCharacter(characterId);
        if (!character) return;
        
        // Delete all sprites for this character
        for (const spriteId of character.variants) {
            this.spriteManager.sprites.delete(spriteId);
            this.canvas.removeSprite(spriteId);
        }
        
        // Remove character
        this.spriteManager.characters.delete(characterId);
        
        // Remove from UI
        const item = document.querySelector(`.character-item[data-id="${characterId}"]`);
        if (item) item.remove();
        
        // Hide sprites section if this was selected
        if (this.selectedCharacterId === characterId) {
            this.selectedCharacterId = null;
            document.getElementById('character-sprites-section').style.display = 'none';
        }
        
        // Update the character dropdown in dialogue editor
        this.updateCharacterDropdown(document.getElementById('dialogue-character').value);
        
        this.saveCurrentSceneState();
    }

    /**
     * Export the currently selected character to a JSON file
     */
    async exportCharacter() {
        if (!this.selectedCharacterId) {
            alert('No character selected');
            return;
        }
        
        const character = this.spriteManager.getCharacter(this.selectedCharacterId);
        if (!character) return;
        
        // Build export data with sprites embedded as base64
        const exportData = {
            version: '1.0',
            type: 'spritegen-character',
            character: {
                name: character.name,
                boxColor: character.boxColor,
                activeVariant: character.activeVariant,
                sprites: []
            }
        };
        
        // Export each sprite variant
        for (const spriteId of character.variants) {
            const sprite = this.spriteManager.getSprite(spriteId);
            if (sprite) {
                // Convert processed image to base64
                const canvas = document.createElement('canvas');
                canvas.width = sprite.image.width;
                canvas.height = sprite.image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(sprite.image, 0, 0);
                const imageData = canvas.toDataURL('image/png');
                
                exportData.character.sprites.push({
                    name: sprite.name,
                    x: sprite.x,
                    y: sprite.y,
                    scale: sprite.scale,
                    opacity: sprite.opacity,
                    removeBackground: sprite.removeBackground,
                    imageData: imageData
                });
            }
        }
        
        // Download the file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${character.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import a character from a JSON file
     * @param {File} file - The character JSON file
     */
    async importCharacter(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.type !== 'spritegen-character') {
                alert('Invalid character file');
                return;
            }
            
            const charData = data.character;
            
            // Create sprites from the imported data
            const spriteIds = [];
            for (let i = 0; i < charData.sprites.length; i++) {
                const spriteData = charData.sprites[i];
                
                // Load image from base64
                const img = await this.loadImageFromDataUrl(spriteData.imageData);
                
                const sprite = {
                    id: this.spriteManager.generateCharacterId(),
                    name: spriteData.name,
                    originalImage: img,
                    image: img,
                    x: spriteData.x,
                    y: spriteData.y,
                    scale: spriteData.scale,
                    opacity: spriteData.opacity,
                    removeBackground: spriteData.removeBackground,
                    dominantColor: this.spriteManager.extractDominantColor(img),
                    characterId: null,
                    variantIndex: i
                };
                
                this.spriteManager.sprites.set(sprite.id, sprite);
                spriteIds.push(sprite.id);
            }
            
            // Create the character
            const character = {
                id: this.spriteManager.generateCharacterId(),
                name: charData.name,
                variants: spriteIds,
                activeVariant: charData.activeVariant || 0,
                boxColor: charData.boxColor || '#e94560'
            };
            
            // Link sprites to character
            for (const spriteId of spriteIds) {
                const sprite = this.spriteManager.getSprite(spriteId);
                if (sprite) {
                    sprite.characterId = character.id;
                }
            }
            
            this.spriteManager.characters.set(character.id, character);
            this.addCharacterToList(character);
            this.selectCharacter(character.id);
            
        } catch (error) {
            console.error('Failed to import character:', error);
            alert('Failed to import character: ' + error.message);
        }
    }

    /**
     * Load an image from a data URL
     * @param {string} dataUrl - Base64 image data
     * @returns {Promise<HTMLImageElement>}
     */
    loadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    /**
     * Select a character to show their sprites
     */
    selectCharacter(characterId) {
        // Update selection visual
        document.querySelectorAll('.character-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === characterId);
        });
        
        this.selectedCharacterId = characterId;
        const character = this.spriteManager.getCharacter(characterId);
        
        // Show sprites section
        const spritesSection = document.getElementById('character-sprites-section');
        const spritesName = document.getElementById('character-sprites-name');
        const spritesList = document.getElementById('character-sprites-list');
        
        spritesSection.style.display = 'block';
        spritesName.textContent = `(${character.name})`;
        
        // Clear and rebuild sprite list (keep drop zone)
        const dropZone = spritesList.querySelector('.drop-zone');
        spritesList.innerHTML = '';
        spritesList.appendChild(dropZone);
        
        // Add existing sprites for this character
        const variants = this.spriteManager.getCharacterVariants(characterId);
        variants.forEach(sprite => {
            this.addSpriteToCharacterList(sprite);
        });
    }

    /**
     * Add a sprite to the character's sprite list
     */
    addSpriteToCharacterList(sprite) {
        const list = document.getElementById('character-sprites-list');
        const item = document.createElement('div');
        item.className = 'sprite-item';
        item.dataset.id = sprite.id;
        
        const thumbnail = this.spriteManager.createThumbnail(sprite.image);
        
        item.innerHTML = `
            <img src="${thumbnail}" alt="${sprite.name}">
            <input type="text" value="${sprite.name}" placeholder="Variant name">
            <button class="sprite-add" title="Add to scene">+</button>
            <button class="sprite-delete" title="Delete">✕</button>
        `;
        
        // Update sprite name on input change
        item.querySelector('input').addEventListener('input', debounce((e) => {
            sprite.name = e.target.value;
        }, 300));
        
        // Prevent input clicks from adding to scene
        item.querySelector('input').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Add button
        item.querySelector('.sprite-add').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addSpriteToScene(sprite.id);
        });
        
        // Delete button
        item.querySelector('.sprite-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSprite(sprite.id);
        });
        
        // Click on image to add to scene
        item.querySelector('img').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addSpriteToScene(sprite.id);
        });
        
        // Insert before drop zone
        const dropZone = list.querySelector('.drop-zone');
        list.insertBefore(item, dropZone);
    }

    /**
     * Update character list sprite counts
     */
    updateCharacterListCount() {
        document.querySelectorAll('.character-item').forEach(item => {
            const characterId = item.dataset.id;
            const character = this.spriteManager.getCharacter(characterId);
            if (character) {
                item.querySelector('.sprite-count').textContent = `${character.variants.length} sprites`;
            }
        });
    }

    /**
     * Update the variant selector dropdown
     */
    updateVariantSelector(sprite) {
        const select = document.getElementById('sprite-variant-select');
        
        if (!sprite.characterId) {
            select.innerHTML = '<option>No variants</option>';
            return;
        }
        
        const variants = this.spriteManager.getCharacterVariants(sprite.characterId);
        
        if (variants.length > 0) {
            select.innerHTML = '';
            
            variants.forEach((variant, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = variant.name || `Variant ${index + 1}`;
                option.selected = variant.id === sprite.id;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option>No sprites</option>';
        }
    }

    /**
     * Add a variant to the selected sprite's character (unused, kept for compatibility)
     */
    async addVariantToSelectedSprite(file) {
        const sprite = this.canvas.selectedSprite;
        if (!sprite || !sprite.characterId) return;
        
        // Import new sprite as variant
        const newSprite = await this.spriteManager.importSprite(file, true, sprite.characterId);
        
        // Copy position/scale from current sprite
        newSprite.x = sprite.x;
        newSprite.y = sprite.y;
        newSprite.scale = sprite.scale;
        newSprite.opacity = sprite.opacity;
        
        // Update the selector
        this.updateVariantSelector(sprite);
    }

    /**
     * Switch to a different sprite variant with animation
     */
    switchSpriteVariant(currentSprite, newVariantIndex) {
        const character = this.spriteManager.getCharacter(currentSprite.characterId);
        if (!character) return;
        
        const newSpriteId = character.variants[newVariantIndex];
        const newSprite = this.spriteManager.getSprite(newSpriteId);
        if (!newSprite) return;
        
        // Copy position and properties to new sprite
        newSprite.x = currentSprite.x;
        newSprite.y = currentSprite.y;
        newSprite.scale = currentSprite.scale;
        newSprite.opacity = currentSprite.opacity;
        
        // Find and replace in canvas sprites array
        const index = this.canvas.sprites.findIndex(s => s.id === currentSprite.id);
        if (index !== -1) {
            this.canvas.sprites[index] = newSprite;
            this.canvas.selectedSprite = newSprite;
            
            // Trigger transition animation
            this.canvas.triggerSpriteAnimation(newSprite.id);
            
            // Play expression change SFX
            this.audioManager.playExpressionSfx();
        }
        
        // Update character's active variant
        this.spriteManager.setActiveVariant(currentSprite.characterId, newVariantIndex);
        
        // Update UI
        this.onSpriteSelected(newSprite);
        this.saveCurrentSceneState();
    }

    /**
     * Set up dialogue property input listeners
     */
    setupDialoguePropertyListeners() {
        // Add dialogue line button
        document.getElementById('btn-add-dialogue').addEventListener('click', () => this.addDialogueLine());
        
        // Delete dialogue line button
        document.getElementById('btn-delete-dialogue').addEventListener('click', () => this.deleteDialogueLine());
        
        // CSV import
        document.getElementById('btn-import-csv').addEventListener('click', () => {
            document.getElementById('csv-input').click();
        });
        
        document.getElementById('csv-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importCSV(e.target.files[0]);
                e.target.value = ''; // Reset for next upload
            }
        });
        
        // Fade duration
        document.getElementById('dialogue-fade-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('dialogue-fade-duration-value').textContent = `${duration} ms`;
            this.dialogueSystem.setFadeDuration(duration);
            this.saveCurrentSceneState();
        });

        // Line display duration (time to show text after typing completes)
        document.getElementById('line-display-duration').addEventListener('input', (e) => {
            const duration = parseInt(e.target.value);
            document.getElementById('line-display-duration-value').textContent = `${duration} ms`;
            this.dialogueSystem.setLineDisplayDuration(duration);
            this.saveCurrentSceneState();
        });

        document.getElementById('dialogue-character').addEventListener('change', (e) => {
            const characterName = e.target.value;
            const updates = { character: characterName };
            
            // If a character is selected, use their box color
            if (characterName) {
                const characters = this.spriteManager.getAllCharacters();
                const character = characters.find(c => c.name === characterName);
                if (character && character.boxColor) {
                    updates.boxColor = character.boxColor;
                    document.getElementById('dialogue-color').value = character.boxColor;
                }
            }
            
            this.updateCurrentDialogueLine(updates);
        });

        document.getElementById('dialogue-text').addEventListener('input', debounce((e) => {
            this.updateCurrentDialogueLine({ text: e.target.value });
        }, 100));

        document.getElementById('dialogue-typing-speed').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            document.getElementById('dialogue-typing-speed-value').textContent = `${speed} ms`;
            this.updateCurrentDialogueLine({ typingSpeed: speed });
        });

        document.getElementById('dialogue-style').addEventListener('change', (e) => {
            this.updateCurrentDialogueLine({ style: e.target.value });
        });

        document.getElementById('dialogue-color').addEventListener('input', (e) => {
            // Update color on the character, not just the dialogue instance
            const sprite = this.canvas.selectedSprite;
            if (sprite && sprite.characterId) {
                const character = this.spriteManager.getCharacter(sprite.characterId);
                if (character) {
                    character.boxColor = e.target.value;
                }
            }
            this.updateCurrentDialogueLine({ boxColor: e.target.value });
        });

        document.getElementById('btn-auto-color').addEventListener('click', () => {
            this.autoDetectDialogueColor();
        });

        document.getElementById('dialogue-visible').addEventListener('change', (e) => {
            this.updateCurrentDialogueLine({ visible: e.target.checked });
        });
    }

    /**
     * Update the currently selected dialogue line
     * @param {Object} updates - Properties to update
     */
    updateCurrentDialogueLine(updates) {
        const scene = this.timeline.getCurrentScene();
        if (!scene || !scene.dialogues || scene.dialogues.length === 0) return;
        
        // Update the current dialogue line (exclude runtime properties)
        const { displayedText, isTyping, typingComplete, ...cleanUpdates } = updates;
        scene.dialogues[this.selectedDialogueIndex] = {
            ...scene.dialogues[this.selectedDialogueIndex],
            ...cleanUpdates
        };
        
        // Also remove any runtime properties from stored dialogue
        delete scene.dialogues[this.selectedDialogueIndex].displayedText;
        delete scene.dialogues[this.selectedDialogueIndex].isTyping;
        delete scene.dialogues[this.selectedDialogueIndex].typingComplete;
        
        // Update the dialogue system with current line
        const currentLine = scene.dialogues[this.selectedDialogueIndex];
        const dialogue = this.dialogueSystem.setDialogue(currentLine);
        dialogue.displayedText = this.dialogueSystem.getCleanText(currentLine.text || '');
        this.canvas.setDialogue(dialogue);
        
        // Update the list UI
        this.updateDialogueLinesListUI();
        this.saveCurrentSceneState();
    }

    /**
     * Add a new dialogue line to the current scene
     */
    addDialogueLine() {
        const scene = this.timeline.getCurrentScene();
        if (!scene) return;
        
        if (!scene.dialogues) {
            scene.dialogues = [];
        }
        
        scene.dialogues.push({
            character: '',
            text: '',
            style: 'default',
            visible: true,
            boxColor: '#e94560',
            typingSpeed: 60
        });
        
        this.selectedDialogueIndex = scene.dialogues.length - 1;
        this.updateDialogueLinesListUI();
        this.selectDialogueLine(this.selectedDialogueIndex);
        this.saveCurrentSceneState();
    }

    /**
     * Delete the currently selected dialogue line
     */
    deleteDialogueLine() {
        const scene = this.timeline.getCurrentScene();
        if (!scene || !scene.dialogues || scene.dialogues.length <= 1) {
            alert('Cannot delete the last dialogue line.');
            return;
        }
        
        scene.dialogues.splice(this.selectedDialogueIndex, 1);
        
        if (this.selectedDialogueIndex >= scene.dialogues.length) {
            this.selectedDialogueIndex = scene.dialogues.length - 1;
        }
        
        this.updateDialogueLinesListUI();
        this.selectDialogueLine(this.selectedDialogueIndex);
        this.saveCurrentSceneState();
    }

    /**
     * Advance to next dialogue line during playback
     */
    advanceDialogueLine() {
        if (!this.previewPlaying) return;
        
        const hasNext = this.dialogueSystem.advanceToNextLine(
            // onFadeOut - dialogue faded out, new line set
            (dialogue) => {
                this.canvas.setCharacterChanging(this.dialogueSystem.isCharacterChanging());
                this.canvas.setDialogueFadeOpacity(this.dialogueSystem.getFadeOpacity());
                this.canvas.setDialogue(dialogue);
            },
            // onFadeIn - new line faded in, start typing
            (dialogue) => {
                this.canvas.setCharacterChanging(false); // Reset after fade complete
                this.canvas.setDialogueFadeOpacity(this.dialogueSystem.getFadeOpacity());
                this.dialogueSystem.startTyping(
                    (updatedDialogue) => {
                        this.canvas.setDialogueFadeOpacity(this.dialogueSystem.getFadeOpacity());
                        this.canvas.setDialogue(updatedDialogue);
                    },
                    () => {
                        // Wait for display duration, then advance to next line
                        setTimeout(() => {
                            this.advanceDialogueLine();
                        }, this.dialogueSystem.getLineDisplayDuration());
                    }
                );
            }
        );
        
        // If no more lines, the scene duration timer will handle moving to next scene
    }

    /**
     * Select a dialogue line for editing
     * @param {number} index - Index of the dialogue line
     */
    selectDialogueLine(index) {
        const scene = this.timeline.getCurrentScene();
        if (!scene || !scene.dialogues) return;
        
        this.selectedDialogueIndex = Math.max(0, Math.min(index, scene.dialogues.length - 1));
        const line = scene.dialogues[this.selectedDialogueIndex];
        
        if (line) {
            const dialogue = this.dialogueSystem.setDialogue(line);
            dialogue.displayedText = this.dialogueSystem.getCleanText(line.text || '');
            this.canvas.setDialogue(dialogue);
            this.updateDialogueEditorUI(line);
            this.updateDialogueLinesListUI();
        }
    }

    /**
     * Update dialogue lines list UI
     */
    updateDialogueLinesListUI() {
        const scene = this.timeline.getCurrentScene();
        const list = document.getElementById('dialogue-lines-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const dialogues = scene?.dialogues || [];
        
        dialogues.forEach((line, index) => {
            const item = document.createElement('div');
            item.className = 'dialogue-line-item' + (index === this.selectedDialogueIndex ? ' active' : '');
            
            const charPreview = line.character || 'No character';
            const textPreview = (line.text || 'Empty').replace(/\[\[\d+\]\]/g, '').substring(0, 30);
            
            item.innerHTML = `
                <span class="line-number">${index + 1}</span>
                <span class="line-character">${charPreview}:</span>
                <span class="line-preview">${textPreview}${line.text?.length > 30 ? '...' : ''}</span>
            `;
            
            item.addEventListener('click', () => this.selectDialogueLine(index));
            list.appendChild(item);
        });
        
        // Update line number in editor header
        const lineNumEl = document.getElementById('dialogue-line-number');
        if (lineNumEl) {
            lineNumEl.textContent = `(Line ${this.selectedDialogueIndex + 1} of ${dialogues.length})`;
        }
    }

    /**
     * Update dialogue editor UI with current line data
     * @param {Object} line - Dialogue line data
     */
    updateDialogueEditorUI(line) {
        if (!line) return;
        
        // Update character dropdown
        this.updateCharacterDropdown(line.character || '');
        
        document.getElementById('dialogue-text').value = line.text || '';
        document.getElementById('dialogue-style').value = line.style || 'default';
        document.getElementById('dialogue-color').value = line.boxColor || '#e94560';
        document.getElementById('dialogue-visible').checked = line.visible !== false;
        
        const typingSpeed = line.typingSpeed || 45;
        document.getElementById('dialogue-typing-speed').value = typingSpeed;
        document.getElementById('dialogue-typing-speed-value').textContent = `${typingSpeed} ms`;
    }

    /**
     * Update character dropdown with available characters
     * @param {string} selectedValue - Currently selected character name
     */
    updateCharacterDropdown(selectedValue = '') {
        const select = document.getElementById('dialogue-character');
        const characters = this.spriteManager.getAllCharacters();
        
        // Clear and rebuild options
        select.innerHTML = '<option value="">(None)</option>';
        
        for (const character of characters) {
            const option = document.createElement('option');
            option.value = character.name;
            option.textContent = character.name;
            if (character.name === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        
        // If selected value wasn't in the list (custom name), add it
        if (selectedValue && !characters.find(c => c.name === selectedValue)) {
            const option = document.createElement('option');
            option.value = selectedValue;
            option.textContent = selectedValue;
            option.selected = true;
            select.appendChild(option);
        }
    }

    /**
     * Import dialogue from CSV file
     * @param {File} file - CSV file
     */
    async importCSV(file) {
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2) {
            alert('CSV file must have at least a header row and one data row.');
            return;
        }
        
        // Parse header
        const header = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const characterIdx = header.findIndex(h => h === 'character' || h === 'name');
        const textIdx = header.findIndex(h => h === 'text' || h === 'dialogue' || h === 'line');
        const styleIdx = header.findIndex(h => h === 'style');
        const colorIdx = header.findIndex(h => h === 'color' || h === 'boxcolor');
        
        if (textIdx === -1) {
            alert('CSV must have a "text" or "dialogue" column.');
            return;
        }
        
        const scene = this.timeline.getCurrentScene();
        if (!scene) return;
        
        // Clear existing dialogues and add new ones
        scene.dialogues = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            scene.dialogues.push({
                character: characterIdx !== -1 ? values[characterIdx] || '' : '',
                text: values[textIdx] || '',
                style: styleIdx !== -1 ? values[styleIdx] || 'default' : 'default',
                boxColor: colorIdx !== -1 ? values[colorIdx] || '#e94560' : '#e94560',
                visible: true,
                typingSpeed: 45
            });
        }
        
        if (scene.dialogues.length === 0) {
            scene.dialogues.push({
                character: '',
                text: '',
                style: 'default',
                visible: true,
                boxColor: '#e94560',
                typingSpeed: 45
            });
        }
        
        this.selectedDialogueIndex = 0;
        this.updateDialogueLinesListUI();
        this.selectDialogueLine(0);
        this.saveCurrentSceneState();
        
        alert(`Imported ${scene.dialogues.length} dialogue lines from CSV.`);
    }

    /**
     * Parse a CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Auto-detect dialogue color from sprites
     */
    autoDetectDialogueColor() {
        // Get the first sprite with a dominant color, or use the selected one
        let sprite = this.canvas.selectedSprite;
        
        if (!sprite && this.canvas.sprites.length > 0) {
            sprite = this.canvas.sprites[0];
        }
        
        if (sprite && sprite.dominantColor) {
            const color = sprite.dominantColor.hex;
            // Also update character's box color
            if (sprite.characterId) {
                const character = this.spriteManager.getCharacter(sprite.characterId);
                if (character) {
                    character.boxColor = color;
                }
            }
            document.getElementById('dialogue-color').value = color;
            const dialogue = this.dialogueSystem.setBoxColor(color);
            this.canvas.setDialogue(dialogue);
            this.saveCurrentSceneState();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Delete' && this.canvas.selectedSprite) {
            this.removeSpriteFromScene(this.canvas.selectedSprite.id);
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newProject();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateScene();
                    break;
            }
        }

        // Arrow keys for scene navigation
        if (e.key === 'ArrowLeft' && e.altKey) {
            e.preventDefault();
            this.goToPreviousScene();
        }
        if (e.key === 'ArrowRight' && e.altKey) {
            e.preventDefault();
            this.goToNextScene();
        }
    }

    /**
     * Import sprite files (adds to selected character)
     * Supports auto-naming: if files share a common prefix, they're numbered as variants
     */
    async importSprites(files) {
        if (!this.selectedCharacterId) {
            alert('Please select or create a character first.');
            return;
        }
        
        const character = this.spriteManager.getCharacter(this.selectedCharacterId);
        const existingCount = character ? character.variants.length : 0;
        
        // Sort files by name for consistent ordering
        const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
        
        // Find common prefix if importing multiple files
        let commonPrefix = '';
        if (sortedFiles.length > 1) {
            const names = sortedFiles.map(f => f.name.replace(/\.[^/.]+$/, '')); // Remove extensions
            commonPrefix = this.findCommonPrefix(names);
        }
        
        let variantIndex = existingCount;
        for (const file of sortedFiles) {
            if (!file.type.startsWith('image/')) continue;

            const sprite = await this.spriteManager.importSprite(file, true, this.selectedCharacterId);
            
            // Auto-name variants if there's a common prefix
            if (commonPrefix && sortedFiles.length > 1) {
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                const suffix = baseName.replace(commonPrefix, '').trim() || `Variant ${variantIndex + 1}`;
                sprite.name = suffix;
            }
            
            variantIndex++;
            
            // Add to character's sprite list UI
            this.addSpriteToCharacterList(sprite);
            this.updateCharacterListCount();
        }
    }

    /**
     * Find common prefix among an array of strings
     * @param {string[]} strings - Array of strings
     * @returns {string} Common prefix
     */
    findCommonPrefix(strings) {
        if (strings.length === 0) return '';
        if (strings.length === 1) return strings[0];
        
        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (strings[i].indexOf(prefix) !== 0) {
                prefix = prefix.slice(0, -1);
                if (prefix === '') return '';
            }
        }
        
        // Remove trailing numbers/underscores/hyphens from prefix
        prefix = prefix.replace(/[-_\s\d]+$/, '');
        return prefix;
    }

    /**
     * Import background files
     */
    async importBackgrounds(files) {
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            const background = await this.spriteManager.importBackground(file);
            this.addBackgroundToAssetList(background);
        }
    }

    /**
     * Add background to asset list UI
     */
    addBackgroundToAssetList(background) {
        const list = document.getElementById('background-list');
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.dataset.id = background.id;
        
        const thumbnail = this.spriteManager.createThumbnail(background.image);
        
        item.innerHTML = `
            <img class="asset-thumbnail" src="${thumbnail}" alt="${background.name}">
            <span class="asset-name">${background.name}</span>
            <button class="asset-delete" title="Delete">✕</button>
        `;

        // Click to set as background
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('asset-delete')) return;
            this.setSceneBackground(background.id);
        });

        // Delete button
        item.querySelector('.asset-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteBackground(background.id);
        });

        list.appendChild(item);
    }

    /**
     * Update asset thumbnail after processing change
     */
    updateAssetThumbnail(sprite) {
        const item = document.querySelector(`.asset-item[data-id="${sprite.id}"]`);
        if (item) {
            const thumbnail = this.spriteManager.createThumbnail(sprite.image);
            item.querySelector('.asset-thumbnail').src = thumbnail;
        }
    }

    /**
     * Add a sprite to the current scene
     */
    addSpriteToScene(spriteId) {
        const sprite = this.spriteManager.getSprite(spriteId);
        if (!sprite) return;

        // Create a copy for the scene with default position (1424, 688)
        const sceneSprite = {
            ...sprite,
            x: 1424 + Math.random() * 100 - 50,
            y: 688 + Math.random() * 50 - 25
        };
        this.canvas.addSprite(sceneSprite);
        
        // Auto-set dialogue color from first sprite's dominant color
        if (sprite.dominantColor && this.canvas.sprites.length === 1) {
            document.getElementById('dialogue-color').value = sprite.dominantColor.hex;
            const dialogue = this.dialogueSystem.setBoxColor(sprite.dominantColor.hex);
            this.canvas.setDialogue(dialogue);
        }
        
        this.updateLayersPanel();
        this.saveCurrentSceneState();
    }

    /**
     * Remove sprite from current scene
     */
    removeSpriteFromScene(spriteId) {
        this.canvas.removeSprite(spriteId);
        this.updateLayersPanel();
        this.saveCurrentSceneState();
        document.getElementById('sprite-properties').style.display = 'none';
    }

    /**
     * Delete sprite from asset library
     */
    deleteSprite(spriteId) {
        this.spriteManager.deleteSprite(spriteId);
        this.canvas.removeSprite(spriteId);
        
        // Remove from character sprites list
        const item = document.querySelector(`#character-sprites-list .sprite-item[data-id="${spriteId}"]`);
        if (item) item.remove();
        
        this.updateCharacterListCount();
        this.saveCurrentSceneState();
    }

    /**
     * Delete background from asset library
     */
    deleteBackground(backgroundId) {
        const bg = this.spriteManager.getBackground(backgroundId);
        if (this.canvas.background === bg?.image) {
            this.canvas.setBackground(null);
        }
        
        this.spriteManager.deleteBackground(backgroundId);
        
        const item = document.querySelector(`#background-list .asset-item[data-id="${backgroundId}"]`);
        if (item) item.remove();
        
        this.saveCurrentSceneState();
    }

    /**
     * Set scene background
     */
    setSceneBackground(backgroundId) {
        const background = this.spriteManager.getBackground(backgroundId);
        if (background) {
            this.canvas.setBackground(background.image);
            this.saveCurrentSceneState();
        }
    }

    /**
     * Handle sprite selection event
     */
    onSpriteSelected(sprite) {
        const panel = document.getElementById('sprite-properties');
        
        if (sprite) {
            panel.style.display = 'block';
            document.getElementById('sprite-x').value = Math.round(sprite.x);
            document.getElementById('sprite-y').value = Math.round(sprite.y);
            document.getElementById('sprite-scale').value = sprite.scale;
            document.getElementById('sprite-scale-value').textContent = `${sprite.scale}%`;
            document.getElementById('sprite-opacity').value = sprite.opacity;
            document.getElementById('sprite-opacity-value').textContent = `${sprite.opacity}%`;
            
            // Update variant selector
            this.updateVariantSelector(sprite);
            
            // Load character's box color (or auto-detect from sprite)
            let boxColor = '#e94560';
            if (sprite.characterId) {
                const character = this.spriteManager.getCharacter(sprite.characterId);
                if (character && character.boxColor) {
                    boxColor = character.boxColor;
                } else if (sprite.dominantColor) {
                    boxColor = sprite.dominantColor.hex;
                    // Set it on the character
                    if (character) {
                        character.boxColor = boxColor;
                    }
                }
            } else if (sprite.dominantColor) {
                boxColor = sprite.dominantColor.hex;
            }
            
            document.getElementById('dialogue-color').value = boxColor;
            const dialogue = this.dialogueSystem.setBoxColor(boxColor);
            this.canvas.setDialogue(dialogue);
        } else {
            panel.style.display = 'none';
        }
    }

    /**
     * Handle sprite update event
     */
    onSpriteUpdated(sprite) {
        if (sprite) {
            document.getElementById('sprite-x').value = Math.round(sprite.x);
            document.getElementById('sprite-y').value = Math.round(sprite.y);
            this.saveCurrentSceneState();
        }
    }

    /**
     * Save current scene state
     */
    saveCurrentSceneState() {
        const scene = this.timeline.getCurrentScene();
        if (!scene) return;

        scene.background = this.canvas.background ? this.canvas.background.src : null;
        scene.sprites = this.canvas.sprites.map(s => ({
            id: s.id,
            name: s.name,
            imageSrc: s.image.src,
            originalImageSrc: s.originalImage?.src,
            x: s.x,
            y: s.y,
            scale: s.scale,
            opacity: s.opacity,
            removeBackground: s.removeBackground,
            characterId: s.characterId,
            variantIndex: s.variantIndex
        }));
        
        // Save dialogues array (multi-line support)
        // scene.dialogues is already being updated directly in updateCurrentDialogueLine
        scene.fadeDuration = this.dialogueSystem.getFadeDuration();
        scene.lineDisplayDuration = this.dialogueSystem.getLineDisplayDuration();
        
        // Update thumbnail
        this.updateSceneThumbnail(scene.id);
    }

    /**
     * Load initial/current scene to canvas
     */
    loadInitialScene() {
        const scene = this.timeline.getCurrentScene();
        this.loadSceneToCanvas(scene);
        this.updateScenePropertiesUI(scene);
        this.updatePreviewCounter();
    }

    /**
     * Load scene data to canvas
     * @param {Object} scene - Scene data
     * @param {boolean} triggerAnimations - Whether to trigger sprite animations
     * @param {boolean} startTyping - Whether to start typing animation
     * @returns {Promise} Resolves when loaded, with typing duration estimate
     */
    async loadSceneToCanvas(scene, triggerAnimations = false, startTyping = false) {
        if (!scene) return { typingDuration: 0 };

        // Store previous sprites for comparison
        const previousSprites = [...this.canvas.sprites];
        const previousBackground = this.canvas.background;

        // Capture snapshot for scene transition if transitioning between scenes
        if (triggerAnimations && this.canvas.sceneTransitionStyle !== 'none') {
            this.canvas.captureSceneSnapshot();
        }

        // Clear current state
        this.canvas.sprites = [];
        this.canvas.selectedSprite = null;
        this.canvas.background = null;
        this.canvas.dialogue = null; // Clear dialogue to prevent showing old text
        this.dialogueSystem.stopTyping();

        // Load background if set
        const bgChanged = scene.background !== (previousBackground ? previousBackground.src : null);
        if (scene.background) {
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = () => {
                    this.canvas.setBackground(img);
                    resolve();
                };
                img.onerror = resolve;
                img.src = scene.background;
            });
            
            // Trigger background transition if bg changed and transitions are enabled
            if (triggerAnimations && bgChanged && this.canvas.bgTransitionStyle !== 'none' && previousBackground) {
                this.canvas.startBackgroundTransition(previousBackground);
            }
        }

        // Load sprites
        for (const spriteData of scene.sprites) {
            const sprite = this.spriteManager.getSprite(spriteData.id);
            if (sprite) {
                // Match by characterId first (for different variants of same character), 
                // then fall back to sprite id
                let prevSprite = null;
                if (sprite.characterId) {
                    prevSprite = previousSprites.find(s => s.characterId === sprite.characterId);
                }
                if (!prevSprite) {
                    prevSprite = previousSprites.find(s => s.id === spriteData.id);
                }
                
                const sceneSprite = {
                    ...sprite,
                    x: spriteData.x,
                    y: spriteData.y,
                    scale: spriteData.scale,
                    opacity: spriteData.opacity
                };
                
                // Trigger position animation if this is a scene change and position changed
                if (triggerAnimations && prevSprite) {
                    const positionChanged = prevSprite.x !== sceneSprite.x || prevSprite.y !== sceneSprite.y;
                    
                    if (positionChanged) {
                        // Start sprite at previous position, animate to new position
                        sceneSprite.x = prevSprite.x;
                        sceneSprite.y = prevSprite.y;
                        
                        // Add sprite to array FIRST, then trigger animation
                        this.canvas.sprites.push(sceneSprite);
                        
                        this.canvas.triggerPositionAnimation(
                            sceneSprite.id,
                            prevSprite.x,
                            prevSprite.y,
                            spriteData.x,
                            spriteData.y
                        );
                        // Also trigger squish/stretch when arriving
                        this.canvas.triggerSpriteAnimation(sceneSprite.id);
                        continue; // Already added, skip to next sprite
                    }
                } else if (triggerAnimations && !prevSprite) {
                    // New sprite appearing - add first, then trigger squish/stretch
                    this.canvas.sprites.push(sceneSprite);
                    this.canvas.triggerSpriteAnimation(sceneSprite.id);
                    continue;
                }
                
                this.canvas.sprites.push(sceneSprite);
            }
        }

        // Load dialogue - support both legacy single dialogue and new multi-line
        let dialogues = scene.dialogues;
        
        // Migrate legacy single dialogue
        if (!dialogues && scene.dialogue) {
            dialogues = [scene.dialogue];
            scene.dialogues = dialogues;
            scene.dialogue = null;
        }
        
        if (!dialogues || dialogues.length === 0) {
            dialogues = [{
                character: '',
                text: '',
                style: 'default',
                visible: false,
                boxColor: '#e94560',
                typingSpeed: 45
            }];
            scene.dialogues = dialogues;
        }
        
        // Set fade duration from scene
        if (scene.fadeDuration) {
            this.dialogueSystem.setFadeDuration(scene.fadeDuration);
        }
        
        // Clean runtime properties from dialogues before passing to system
        const cleanDialogues = dialogues.map(d => {
            const { displayedText, isTyping, typingComplete, ...clean } = d;
            return clean;
        });
        
        // Reset to first dialogue line
        this.selectedDialogueIndex = 0;
        
        this.dialogueSystem.setDialogueLines(cleanDialogues);
        const dialogue = this.dialogueSystem.getDialogue();
        
        // Calculate typing duration for all dialogue lines
        let typingDuration = 0;
        
        if (startTyping && dialogue.visible && dialogue.text) {
            // Calculate typing duration for first line
            const segments = this.dialogueSystem.parseTextWithPauses(dialogue.text);
            for (const segment of segments) {
                if (segment.type === 'text') {
                    typingDuration += segment.content.length * dialogue.typingSpeed;
                } else if (segment.type === 'pause') {
                    typingDuration += segment.content;
                }
            }
            
            // Add time for additional lines (typing + fade transitions)
            for (let i = 1; i < dialogues.length; i++) {
                const line = dialogues[i];
                if (line.visible && line.text) {
                    typingDuration += this.dialogueSystem.getFadeDuration();
                    const lineSegments = this.dialogueSystem.parseTextWithPauses(line.text);
                    for (const segment of lineSegments) {
                        if (segment.type === 'text') {
                            typingDuration += segment.content.length * (line.typingSpeed || 45);
                        } else if (segment.type === 'pause') {
                            typingDuration += segment.content;
                        }
                    }
                }
            }
            
            // Start typing animation
            dialogue.displayedText = '';
            this.canvas.setDialogue(dialogue);
            
            this.dialogueSystem.startTyping(
                (updatedDialogue) => {
                    this.canvas.setDialogueFadeOpacity(this.dialogueSystem.getFadeOpacity());
                    this.canvas.setDialogue(updatedDialogue);
                },
                () => {
                    // Typing complete for current line - wait then advance to next
                    setTimeout(() => {
                        this.advanceDialogueLine();
                    }, this.dialogueSystem.getLineDisplayDuration());
                }
            );
        } else {
            // Show full text immediately
            dialogue.displayedText = this.dialogueSystem.getCleanText(dialogue.text);
            this.canvas.setDialogue(dialogue);
        }
        
        // Skip dialogue selection during playback to avoid stopping typing animation
        this.updateDialogueUI(scene, startTyping);
        
        // Update layers panel
        this.updateLayersPanel();
        
        // Start scene transition if enabled
        if (triggerAnimations && this.canvas.sceneTransitionStyle !== 'none' && previousSprites.length > 0) {
            this.canvas.startSceneTransition();
        }
        
        this.canvas.render();
        
        return { typingDuration };
    }

    /**
     * Update scene properties UI
     */
    updateScenePropertiesUI(scene) {
        if (!scene) return;
        document.getElementById('scene-name').value = scene.name;
        document.getElementById('scene-duration').value = scene.duration;
    }

    /**
     * Update dialogue UI from scene data
     */
    updateDialogueUI(scene, skipDialogueSelect = false) {
        if (!scene) return;
        
        // Update fade duration
        const fadeDuration = scene.fadeDuration || 300;
        document.getElementById('dialogue-fade-duration').value = fadeDuration;
        document.getElementById('dialogue-fade-duration-value').textContent = `${fadeDuration} ms`;
        
        // Update line display duration
        const lineDisplayDuration = scene.lineDisplayDuration || 400;
        document.getElementById('line-display-duration').value = lineDisplayDuration;
        document.getElementById('line-display-duration-value').textContent = `${lineDisplayDuration} ms`;
        this.dialogueSystem.setLineDisplayDuration(lineDisplayDuration);
        
        // Update dialogue lines list
        this.updateDialogueLinesListUI();
        
        // Select first line if available (but skip during playback to avoid stopping typing)
        if (!skipDialogueSelect) {
            const dialogues = scene.dialogues || [];
            if (dialogues.length > 0) {
                this.selectDialogueLine(this.selectedDialogueIndex);
            }
        }
    }

    /**
     * Add new scene
     */
    addScene() {
        this.saveCurrentSceneState();
        const scene = this.timeline.addScene();
        this.loadSceneToCanvas(scene);
        this.updateScenePropertiesUI(scene);
        this.updateTimelineUI();
    }

    /**
     * Duplicate current scene
     */
    duplicateScene() {
        this.saveCurrentSceneState();
        const scene = this.timeline.duplicateScene();
        if (scene) {
            this.loadSceneToCanvas(scene);
            this.updateScenePropertiesUI(scene);
            this.updateTimelineUI();
        }
    }

    /**
     * Delete current scene
     */
    deleteScene() {
        if (this.timeline.deleteScene()) {
            const scene = this.timeline.getCurrentScene();
            this.loadSceneToCanvas(scene);
            this.updateScenePropertiesUI(scene);
            this.updateTimelineUI();
        }
    }

    /**
     * Go to previous scene
     */
    goToPreviousScene() {
        this.saveCurrentSceneState();
        const scene = this.timeline.previousScene();
        if (scene) {
            this.loadSceneToCanvas(scene);
            this.updateScenePropertiesUI(scene);
            this.updateTimelineUI();
        }
    }

    /**
     * Go to next scene
     */
    goToNextScene() {
        this.saveCurrentSceneState();
        const scene = this.timeline.nextScene();
        if (scene) {
            this.loadSceneToCanvas(scene);
            this.updateScenePropertiesUI(scene);
            this.updateTimelineUI();
        }
    }

    /**
     * Select scene by index
     */
    selectScene(index) {
        this.saveCurrentSceneState();
        const scene = this.timeline.setCurrentScene(index);
        if (scene) {
            this.loadSceneToCanvas(scene);
            this.updateScenePropertiesUI(scene);
            this.updateTimelineUI();
        }
    }

    /**
     * Update scene thumbnail
     */
    updateSceneThumbnail(sceneId) {
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 160;
        thumbnailCanvas.height = 90;
        const ctx = thumbnailCanvas.getContext('2d');
        
        // Draw scaled version of main canvas
        ctx.drawImage(this.canvas.canvas, 0, 0, 160, 90);
        
        this.timeline.updateThumbnail(sceneId, thumbnailCanvas.toDataURL());
        
        // Update UI
        const sceneEl = document.querySelector(`.timeline-scene[data-id="${sceneId}"] canvas`);
        if (sceneEl) {
            const sceneCtx = sceneEl.getContext('2d');
            sceneCtx.drawImage(thumbnailCanvas, 0, 0);
        }
    }

    /**
     * Update timeline UI
     */
    updateTimelineUI() {
        const track = document.getElementById('timeline-track');
        track.innerHTML = '';

        const scenes = this.timeline.getAllScenes();
        const currentIndex = this.timeline.getCurrentIndex();

        scenes.forEach((scene, index) => {
            const sceneEl = document.createElement('div');
            sceneEl.className = `timeline-scene ${index === currentIndex ? 'active' : ''}`;
            sceneEl.dataset.id = scene.id;
            sceneEl.dataset.index = index;

            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            
            if (scene.thumbnail) {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 160, 90);
                };
                img.src = scene.thumbnail;
            }

            const label = document.createElement('div');
            label.className = 'timeline-scene-label';
            label.textContent = scene.name;

            sceneEl.appendChild(canvas);
            sceneEl.appendChild(label);

            sceneEl.addEventListener('click', () => this.selectScene(index));

            track.appendChild(sceneEl);
        });
    }

    /**
     * New project
     */
    newProject() {
        if (confirm('Start a new project? Unsaved changes will be lost.')) {
            this.timeline.clear();
            this.canvas.sprites = [];
            this.canvas.background = null;
            this.canvas.selectedSprite = null;
            this.dialogueSystem.clear();
            this.canvas.setDialogue(this.dialogueSystem.getDialogue());
            this.spriteManager.sprites.clear();
            this.spriteManager.characters.clear();
            this.spriteManager.backgrounds.clear();
            this.selectedCharacterId = null;
            
            // Clear UI lists
            document.querySelectorAll('#character-list .character-item').forEach(el => el.remove());
            document.querySelectorAll('#background-list .asset-item').forEach(el => el.remove());
            document.getElementById('character-sprites-section').style.display = 'none';
            
            this.loadInitialScene();
            this.updateTimelineUI();
        }
    }

    /**
     * Save project to JSON file
     */
    saveProject() {
        this.saveCurrentSceneState();
        
        const projectData = {
            version: '1.2.0',
            timeline: this.timeline.export(),
            characters: this.spriteManager.getAllCharacters().map(c => ({
                id: c.id,
                name: c.name,
                variants: c.variants,
                activeVariant: c.activeVariant,
                boxColor: c.boxColor || '#e94560'
            })),
            assets: {
                sprites: this.spriteManager.getAllSprites().map(s => ({
                    id: s.id,
                    name: s.name,
                    imageSrc: s.originalImage.src,
                    removeBackground: s.removeBackground,
                    characterId: s.characterId,
                    variantIndex: s.variantIndex
                })),
                backgrounds: this.spriteManager.getAllBackgrounds().map(b => ({
                    id: b.id,
                    name: b.name,
                    imageSrc: b.image.src
                }))
            },
            audio: this.audioManager.getState(),
            transitions: {
                sceneStyle: this.canvas.sceneTransitionStyle,
                sceneDuration: this.canvas.sceneTransitionDuration,
                bgStyle: this.canvas.bgTransitionStyle,
                bgDuration: this.canvas.bgTransitionDuration
            },
            options: {
                canvasBackgroundColor: this.canvas.canvasBackgroundColor
            }
        };

        downloadFile(JSON.stringify(projectData, null, 2), 'spritegen-project.json');
    }

    /**
     * Open load project dialog
     */
    loadProjectDialog() {
        document.getElementById('project-input').click();
    }

    /**
     * Load project from file
     */
    async loadProject(file) {
        try {
            const text = await file.text();
            const projectData = JSON.parse(text);
            
            // Clear current project
            this.timeline.clear();
            this.spriteManager.sprites.clear();
            this.spriteManager.characters.clear();
            this.spriteManager.backgrounds.clear();
            this.selectedCharacterId = null;
            
            document.querySelectorAll('#character-list .character-item').forEach(el => el.remove());
            document.querySelectorAll('#background-list .asset-item').forEach(el => el.remove());
            document.getElementById('character-sprites-section').style.display = 'none';

            // Load characters first (if present in v1.1+)
            if (projectData.characters) {
                for (const charData of projectData.characters) {
                    const character = {
                        id: charData.id,
                        name: charData.name,
                        variants: charData.variants || [],
                        activeVariant: charData.activeVariant || 0,
                        boxColor: charData.boxColor || '#e94560'
                    };
                    this.spriteManager.characters.set(character.id, character);
                    this.addCharacterToList(character);
                }
            }

            // Load sprites
            for (const spriteData of projectData.assets.sprites) {
                const img = new Image();
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.src = spriteData.imageSrc;
                });
                
                const sprite = {
                    id: spriteData.id,
                    name: spriteData.name,
                    originalImage: img,
                    image: spriteData.removeBackground ? 
                        await this.spriteManager.removeWhiteBackground(img) : img,
                    removeBackground: spriteData.removeBackground,
                    characterId: spriteData.characterId || null,
                    variantIndex: spriteData.variantIndex || 0,
                    dominantColor: this.spriteManager.extractDominantColor(img)
                };
                this.spriteManager.sprites.set(sprite.id, sprite);
            }

            // Load backgrounds
            for (const bgData of projectData.assets.backgrounds) {
                const img = new Image();
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.src = bgData.imageSrc;
                });
                
                const background = {
                    id: bgData.id,
                    name: bgData.name,
                    image: img
                };
                this.spriteManager.backgrounds.set(background.id, background);
                this.addBackgroundToAssetList(background);
            }

            // Load timeline
            this.timeline.import(projectData.timeline);
            this.loadInitialScene();
            this.updateTimelineUI();

            // Load audio settings (v1.2+)
            if (projectData.audio) {
                this.audioManager.loadState(projectData.audio);
                
                // Update UI for audio
                if (projectData.audio.expressionSfx) {
                    document.getElementById('sfx-expression-name').textContent = projectData.audio.expressionSfx.name;
                    document.getElementById('sfx-expression-name').classList.add('has-file');
                }
                if (projectData.audio.bgm) {
                    document.getElementById('bgm-name').textContent = projectData.audio.bgm.name;
                    document.getElementById('bgm-name').classList.add('has-file');
                }
                document.getElementById('sfx-expression-volume').value = projectData.audio.expressionSfxVolume * 100;
                document.getElementById('sfx-expression-volume-value').textContent = `${Math.round(projectData.audio.expressionSfxVolume * 100)}%`;
                document.getElementById('bgm-volume').value = projectData.audio.bgmVolume * 100;
                document.getElementById('bgm-volume-value').textContent = `${Math.round(projectData.audio.bgmVolume * 100)}%`;
            }

            // Load transition settings (v1.2+)
            if (projectData.transitions) {
                this.canvas.setSceneTransitionStyle(projectData.transitions.sceneStyle);
                this.canvas.setSceneTransitionDuration(projectData.transitions.sceneDuration);
                this.canvas.setBgTransitionStyle(projectData.transitions.bgStyle);
                this.canvas.setBgTransitionDuration(projectData.transitions.bgDuration);
                
                // Update UI for transitions
                document.getElementById('scene-transition-style').value = projectData.transitions.sceneStyle;
                document.getElementById('scene-transition-duration').value = projectData.transitions.sceneDuration;
                document.getElementById('scene-transition-duration-value').textContent = `${projectData.transitions.sceneDuration} ms`;
                document.getElementById('bg-transition-style').value = projectData.transitions.bgStyle;
                document.getElementById('bg-transition-duration').value = projectData.transitions.bgDuration;
                document.getElementById('bg-transition-duration-value').textContent = `${projectData.transitions.bgDuration} ms`;
            }

            // Load options (v1.2+)
            if (projectData.options) {
                if (projectData.options.canvasBackgroundColor) {
                    this.canvas.canvasBackgroundColor = projectData.options.canvasBackgroundColor;
                    document.getElementById('canvas-bg-color').value = projectData.options.canvasBackgroundColor;
                }
            }

        } catch (error) {
            console.error('Failed to load project:', error);
            alert('Failed to load project file.');
        }
    }

    /**
     * Export sequence as video
     */
    async exportSequence() {
        this.saveCurrentSceneState();
        
        const scenes = this.timeline.getAllScenes();
        const currentIndex = this.timeline.getCurrentIndex();
        
        // Set up video recording
        const stream = this.canvas.canvas.captureStream(60); // 60 FPS
        const options = { 
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 8000000 // 8 Mbps for good quality
        };
        
        // Try VP9, fall back to VP8 if not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        
        this.mediaRecorder = new MediaRecorder(stream, options);
        this.recordedChunks = [];
        
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spritegen-sequence.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Restore original scene
            this.timeline.setCurrentScene(currentIndex);
            this.loadSceneToCanvas(scenes[currentIndex]);
            this.updateTimelineUI();
        };
        
        // Start recording
        this.mediaRecorder.start();
        this.isRecording = true;
        
        // Play through all scenes with animations
        await this.recordSceneSequence(scenes, 0);
    }
    
    /**
     * Record scene sequence for video export
     */
    async recordSceneSequence(scenes, sceneIndex) {
        if (sceneIndex >= scenes.length) {
            // Stop recording after small delay to capture last frame
            await new Promise(resolve => setTimeout(resolve, 200));
            this.mediaRecorder.stop();
            this.isRecording = false;
            return;
        }
        
        const scene = scenes[sceneIndex];
        this.timeline.setCurrentScene(sceneIndex);
        
        // Load scene with animations and typing
        const { typingDuration } = await this.loadSceneToCanvas(scene, true, true);
        
        // Wait for typing to complete plus scene duration
        const totalDuration = Math.max(scene.duration, typingDuration + 500);
        await new Promise(resolve => setTimeout(resolve, totalDuration));
        
        // Continue to next scene
        await this.recordSceneSequence(scenes, sceneIndex + 1);
    }

    /**
     * Start/toggle preview playback (plays on main canvas)
     */
    togglePreview() {
        this.saveCurrentSceneState();
        
        if (this.previewPlaying) {
            this.stopPreviewPlayback();
        } else {
            this.startPreviewPlayback();
        }
    }

    /**
     * Update preview counter display
     */
    updatePreviewCounter() {
        const current = this.timeline.getCurrentIndex() + 1;
        const total = this.timeline.getSceneCount();
        document.getElementById('preview-counter').textContent = `${current} / ${total}`;
    }

    /**
     * Toggle preview playback
     */
    togglePreviewPlayback() {
        if (this.previewPlaying) {
            this.stopPreviewPlayback();
        } else {
            this.startPreviewPlayback();
        }
    }

    /**
     * Start preview playback
     */
    startPreviewPlayback() {
        this.previewPlaying = true;
        document.getElementById('preview-play').textContent = '⏸';
        
        this.playNextPreviewScene();
    }

    /**
     * Play next scene in preview
     */
    playNextPreviewScene() {
        if (!this.previewPlaying) return;
        
        const scene = this.timeline.getCurrentScene();
        this.loadSceneToCanvas(scene, true, true).then(({ typingDuration }) => {
            this.updatePreviewCounter();
            this.updateTimelineUI();
            
            // Wait for typing to finish plus scene duration
            const totalDuration = Math.max(scene.duration, typingDuration + 500);
            
            if (this.timeline.getCurrentIndex() < this.timeline.getSceneCount() - 1) {
                this.previewInterval = setTimeout(() => {
                    this.timeline.nextScene();
                    this.playNextPreviewScene();
                }, totalDuration);
            } else {
                // End of sequence
                this.previewInterval = setTimeout(() => {
                    this.stopPreviewPlayback();
                }, totalDuration);
            }
        });
    }

    /**
     * Stop preview playback
     */
    stopPreviewPlayback() {
        this.previewPlaying = false;
        document.getElementById('preview-play').textContent = '▶';
        
        if (this.previewInterval) {
            clearTimeout(this.previewInterval);
            this.previewInterval = null;
        }
    }

    /**
     * Preview previous scene
     */
    previewPrevScene() {
        this.stopPreviewPlayback();
        const scene = this.timeline.previousScene();
        if (scene) {
            this.loadSceneToCanvas(scene, true).then(() => {
                this.updatePreviewCounter();
                this.updateTimelineUI();
            });
        }
    }

    /**
     * Preview next scene
     */
    previewNextScene() {
        this.stopPreviewPlayback();
        const scene = this.timeline.nextScene();
        if (scene) {
            this.loadSceneToCanvas(scene, true).then(() => {
                this.updatePreviewCounter();
                this.updateTimelineUI();
            });
        }
    }

    // ==================== KEYBOARD SHORTCUTS ====================

    /**
     * Setup global keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Ctrl+S - Save project
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveProject();
                return;
            }

            // Ctrl+Z - Undo
            if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y - Redo
            if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                this.redo();
                return;
            }

            // Delete - Delete selected sprite
            if (e.key === 'Delete') {
                if (this.canvas.selectedSprite) {
                    this.deleteSelectedSprite();
                }
                return;
            }

            // Arrow keys - Nudge sprite
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (this.canvas.selectedSprite) {
                    e.preventDefault();
                    const nudge = e.shiftKey ? 10 : 1;
                    const sprite = this.canvas.selectedSprite;
                    
                    switch (e.key) {
                        case 'ArrowUp': sprite.y -= nudge; break;
                        case 'ArrowDown': sprite.y += nudge; break;
                        case 'ArrowLeft': sprite.x -= nudge; break;
                        case 'ArrowRight': sprite.x += nudge; break;
                    }
                    
                    this.updateSpritePropertiesUI(sprite);
                    this.saveCurrentSceneState();
                }
                return;
            }

            // Space - Toggle preview play
            if (e.key === ' ' && this.previewMode) {
                e.preventDefault();
                this.togglePreviewPlay();
                return;
            }

            // G - Toggle grid
            if (e.key === 'g') {
                this.toggleGrid();
                return;
            }

            // Expression hotkeys 1-9 during preview
            if (this.previewMode && e.key >= '1' && e.key <= '9') {
                this.switchExpressionByHotkey(parseInt(e.key) - 1);
                return;
            }
        });
    }

    /**
     * Switch character expression by hotkey index
     * @param {number} index - Variant index (0-8)
     */
    switchExpressionByHotkey(index) {
        // Get all characters with sprites on canvas
        const charactersOnCanvas = new Set();
        for (const sprite of this.canvas.sprites) {
            if (sprite.characterId) {
                charactersOnCanvas.add(sprite.characterId);
            }
        }

        // For each character, try to switch to the variant at index
        for (const characterId of charactersOnCanvas) {
            const character = this.spriteManager.getCharacter(characterId);
            if (character && character.variants.length > index) {
                const newSpriteId = character.variants[index];
                const newSprite = this.spriteManager.getSprite(newSpriteId);
                
                if (newSprite) {
                    // Find current sprite for this character on canvas
                    const currentSprite = this.canvas.sprites.find(s => s.characterId === characterId);
                    if (currentSprite && currentSprite.id !== newSpriteId) {
                        // Swap to new variant
                        this.canvas.switchSprite(currentSprite.id, newSprite);
                        character.activeVariant = index;
                    }
                }
            }
        }
    }

    // ==================== UNDO/REDO SYSTEM ====================

    /**
     * Setup history callbacks
     */
    setupHistoryCallbacks() {
        this.history.onHistoryChange = (status) => {
            // Update undo/redo button states if they exist
            const undoBtn = document.getElementById('btn-undo');
            const redoBtn = document.getElementById('btn-redo');
            if (undoBtn) undoBtn.disabled = !status.canUndo;
            if (redoBtn) redoBtn.disabled = !status.canRedo;
        };
    }

    /**
     * Record current state to history
     * @param {string} action - Description of the action
     */
    recordHistory(action) {
        const state = {
            sceneIndex: this.timeline.currentSceneIndex,
            scene: this.getSceneStateSnapshot()
        };
        this.history.record(action, state);
    }

    /**
     * Get a snapshot of current scene state
     * @returns {Object} Scene state snapshot
     */
    getSceneStateSnapshot() {
        const scene = this.timeline.getCurrentScene();
        if (!scene) return null;
        
        return {
            id: scene.id,
            name: scene.name,
            duration: scene.duration,
            background: this.canvas.background ? this.canvas.background.src : null,
            sprites: this.canvas.sprites.map(s => ({
                id: s.id,
                x: s.x,
                y: s.y,
                scale: s.scale,
                opacity: s.opacity,
                characterId: s.characterId,
                variantIndex: s.variantIndex
            })),
            dialogues: scene.dialogues ? JSON.parse(JSON.stringify(scene.dialogues)) : []
        };
    }

    /**
     * Undo last action
     */
    undo() {
        const currentState = {
            sceneIndex: this.timeline.currentSceneIndex,
            scene: this.getSceneStateSnapshot()
        };
        
        const previousState = this.history.undo(currentState);
        if (previousState) {
            this.restoreState(previousState);
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        const currentState = {
            sceneIndex: this.timeline.currentSceneIndex,
            scene: this.getSceneStateSnapshot()
        };
        
        const nextState = this.history.redo(currentState);
        if (nextState) {
            this.restoreState(nextState);
        }
    }

    /**
     * Restore a state from history
     * @param {Object} state - State to restore
     */
    restoreState(state) {
        this.history.setRestoring(true);
        
        try {
            // Restore scene properties
            const scene = this.timeline.getCurrentScene();
            if (scene && state.scene) {
                scene.name = state.scene.name;
                scene.duration = state.scene.duration;
                scene.dialogues = state.scene.dialogues;
                
                // Restore sprite positions
                for (const savedSprite of state.scene.sprites) {
                    const canvasSprite = this.canvas.sprites.find(s => s.id === savedSprite.id);
                    if (canvasSprite) {
                        canvasSprite.x = savedSprite.x;
                        canvasSprite.y = savedSprite.y;
                        canvasSprite.scale = savedSprite.scale;
                        canvasSprite.opacity = savedSprite.opacity;
                    }
                }
                
                // Update UI
                this.updateScenePropertiesUI(scene);
                if (this.canvas.selectedSprite) {
                    this.updateSpritePropertiesUI(this.canvas.selectedSprite);
                }
                this.updateDialogueLinesList();
            }
        } finally {
            this.history.setRestoring(false);
        }
    }

    // ==================== GRID SYSTEM ====================

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.canvas.setGridEnabled(this.gridEnabled, this.gridSize);
        
        const btn = document.getElementById('btn-toggle-grid');
        if (btn) btn.classList.toggle('active', this.gridEnabled);
    }

    /**
     * Toggle snap to grid
     */
    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;
        this.canvas.setSnapToGrid(this.snapToGrid, this.gridSize);
        
        const btn = document.getElementById('btn-snap-grid');
        if (btn) btn.classList.toggle('active', this.snapToGrid);
    }

    /**
     * Set grid size
     * @param {number} size - Grid cell size in pixels
     */
    setGridSize(size) {
        this.gridSize = size;
        this.canvas.setGridEnabled(this.gridEnabled, this.gridSize);
        this.canvas.setSnapToGrid(this.snapToGrid, this.gridSize);
    }

    // ==================== LAYERS PANEL ====================

    /**
     * Update the layers panel UI
     */
    updateLayersPanel() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Render sprites in reverse order (top layer first)
        const sprites = [...this.canvas.sprites].reverse();
        
        sprites.forEach((sprite, visualIndex) => {
            const actualIndex = this.canvas.sprites.length - 1 - visualIndex;
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.dataset.id = sprite.id;
            item.draggable = true;
            
            if (this.canvas.selectedSprite && this.canvas.selectedSprite.id === sprite.id) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <span class="layer-drag-handle">⋮⋮</span>
                <span class="layer-name">${sprite.name || 'Sprite'}</span>
                <span class="layer-index">${actualIndex + 1}</span>
            `;
            
            item.addEventListener('click', () => {
                this.canvas.selectedSprite = sprite;
                this.updateSpritePropertiesUI(sprite);
                this.updateLayersPanel();
            });
            
            // Drag and drop for reordering
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', sprite.id);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                this.reorderSprite(draggedId, sprite.id);
            });
            
            list.appendChild(item);
        });
    }

    /**
     * Reorder sprite layers
     * @param {string} draggedId - ID of dragged sprite
     * @param {string} targetId - ID of target sprite (drop position)
     */
    reorderSprite(draggedId, targetId) {
        if (draggedId === targetId) return;
        
        const sprites = this.canvas.sprites;
        const draggedIndex = sprites.findIndex(s => s.id === draggedId);
        const targetIndex = sprites.findIndex(s => s.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged sprite and insert at target position
        const [dragged] = sprites.splice(draggedIndex, 1);
        sprites.splice(targetIndex, 0, dragged);
        
        this.updateLayersPanel();
        this.saveCurrentSceneState();
    }

    // ==================== SCENE TEMPLATES ====================

    /**
     * Load templates from localStorage
     * @returns {Array} Saved templates
     */
    loadTemplatesFromStorage() {
        try {
            const data = localStorage.getItem('spritegen-templates');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Save templates to localStorage
     */
    saveTemplatesToStorage() {
        try {
            localStorage.setItem('spritegen-templates', JSON.stringify(this.sceneTemplates));
        } catch (e) {
            console.warn('Failed to save templates:', e);
        }
    }

    /**
     * Save current scene as template
     */
    saveAsTemplate() {
        const scene = this.timeline.getCurrentScene();
        if (!scene) return;
        
        const name = prompt('Template name:', scene.name + ' Template');
        if (!name) return;
        
        const template = {
            id: Date.now().toString(),
            name: name,
            created: Date.now(),
            data: {
                duration: scene.duration,
                sprites: this.canvas.sprites.map(s => ({
                    x: s.x,
                    y: s.y,
                    scale: s.scale,
                    opacity: s.opacity
                })),
                dialogues: scene.dialogues ? JSON.parse(JSON.stringify(scene.dialogues)) : []
            }
        };
        
        this.sceneTemplates.push(template);
        this.saveTemplatesToStorage();
        this.updateTemplatesList();
        
        alert(`Template "${name}" saved!`);
    }

    /**
     * Apply a template to current scene
     * @param {string} templateId - Template ID to apply
     */
    applyTemplate(templateId) {
        const template = this.sceneTemplates.find(t => t.id === templateId);
        if (!template) return;
        
        const scene = this.timeline.getCurrentScene();
        if (!scene) return;
        
        // Apply template data
        scene.duration = template.data.duration;
        
        // Apply sprite positions (if sprites exist)
        const templateSprites = template.data.sprites;
        this.canvas.sprites.forEach((sprite, index) => {
            if (templateSprites[index]) {
                sprite.x = templateSprites[index].x;
                sprite.y = templateSprites[index].y;
                sprite.scale = templateSprites[index].scale;
                sprite.opacity = templateSprites[index].opacity;
            }
        });
        
        // Apply dialogues
        if (template.data.dialogues) {
            scene.dialogues = JSON.parse(JSON.stringify(template.data.dialogues));
            this.dialogueSystem.setDialogueLines(scene.dialogues);
        }
        
        this.updateScenePropertiesUI(scene);
        this.updateDialogueLinesList();
        this.saveCurrentSceneState();
    }

    /**
     * Delete a template
     * @param {string} templateId - Template ID to delete
     */
    deleteTemplate(templateId) {
        this.sceneTemplates = this.sceneTemplates.filter(t => t.id !== templateId);
        this.saveTemplatesToStorage();
        this.updateTemplatesList();
    }

    /**
     * Update templates list UI
     */
    updateTemplatesList() {
        const list = document.getElementById('templates-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.sceneTemplates.length === 0) {
            list.innerHTML = '<div class="no-templates">No templates saved</div>';
            return;
        }
        
        this.sceneTemplates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `
                <span class="template-name">${template.name}</span>
                <div class="template-actions">
                    <button class="btn-apply-template" title="Apply">✓</button>
                    <button class="btn-delete-template" title="Delete">✕</button>
                </div>
            `;
            
            item.querySelector('.btn-apply-template').addEventListener('click', () => {
                this.applyTemplate(template.id);
            });
            
            item.querySelector('.btn-delete-template').addEventListener('click', () => {
                if (confirm(`Delete template "${template.name}"?`)) {
                    this.deleteTemplate(template.id);
                }
            });
            
            list.appendChild(item);
        });
    }

    /**
     * Delete selected sprite from canvas
     */
    deleteSelectedSprite() {
        if (!this.canvas.selectedSprite) return;
        
        const sprite = this.canvas.selectedSprite;
        this.canvas.removeSprite(sprite.id);
        this.canvas.selectedSprite = null;
        
        document.getElementById('sprite-properties').style.display = 'none';
        this.updateLayersPanel();
        this.saveCurrentSceneState();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SpriteGenApp();
});
