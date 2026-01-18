/**
 * SpriteGen - Audio Management System
 */

export class AudioManager {
    constructor() {
        // Sound effects
        this.expressionSfx = null;
        this.expressionSfxVolume = 0.5;
        this.expressionSfxData = null; // Base64 data for saving
        
        // Background music
        this.bgm = null;
        this.bgmVolume = 0.3;
        this.bgmData = null; // Base64 data for saving
        this.bgmPlaying = false;
        
        // Audio context for precise control
        this.audioContext = null;
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Load expression change sound effect
     * @param {File} file - Audio file
     * @returns {Promise<void>}
     */
    async loadExpressionSfx(file) {
        const dataUrl = await this.fileToDataUrl(file);
        this.expressionSfxData = dataUrl;
        
        this.expressionSfx = new Audio(dataUrl);
        this.expressionSfx.volume = this.expressionSfxVolume;
        
        return { name: file.name, dataUrl };
    }

    /**
     * Load expression SFX from data URL (for project loading)
     * @param {string} dataUrl - Audio data URL
     * @param {string} name - File name
     */
    loadExpressionSfxFromData(dataUrl, name) {
        if (!dataUrl) return;
        
        this.expressionSfxData = dataUrl;
        this.expressionSfx = new Audio(dataUrl);
        this.expressionSfx.volume = this.expressionSfxVolume;
    }

    /**
     * Play expression change sound effect
     */
    playExpressionSfx() {
        if (this.expressionSfx) {
            // Clone and play to allow overlapping
            const sfx = this.expressionSfx.cloneNode();
            sfx.volume = this.expressionSfxVolume;
            sfx.play().catch(() => {});
        }
    }

    /**
     * Set expression SFX volume
     * @param {number} volume - Volume 0-1
     */
    setExpressionSfxVolume(volume) {
        this.expressionSfxVolume = Math.max(0, Math.min(1, volume));
        if (this.expressionSfx) {
            this.expressionSfx.volume = this.expressionSfxVolume;
        }
    }

    /**
     * Clear expression SFX
     */
    clearExpressionSfx() {
        this.expressionSfx = null;
        this.expressionSfxData = null;
    }

    /**
     * Load background music
     * @param {File} file - Audio file
     * @returns {Promise<Object>}
     */
    async loadBgm(file) {
        const dataUrl = await this.fileToDataUrl(file);
        this.bgmData = dataUrl;
        
        // Stop current BGM if playing
        if (this.bgm) {
            this.stopBgm();
        }
        
        this.bgm = new Audio(dataUrl);
        this.bgm.volume = this.bgmVolume;
        this.bgm.loop = true;
        
        return { name: file.name, dataUrl };
    }

    /**
     * Load BGM from data URL (for project loading)
     * @param {string} dataUrl - Audio data URL
     * @param {string} name - File name
     */
    loadBgmFromData(dataUrl, name) {
        if (!dataUrl) return;
        
        this.bgmData = dataUrl;
        
        if (this.bgm) {
            this.stopBgm();
        }
        
        this.bgm = new Audio(dataUrl);
        this.bgm.volume = this.bgmVolume;
        this.bgm.loop = true;
    }

    /**
     * Play background music
     */
    playBgm() {
        if (this.bgm) {
            this.bgm.play().catch(() => {});
            this.bgmPlaying = true;
        }
    }

    /**
     * Pause background music
     */
    pauseBgm() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgmPlaying = false;
        }
    }

    /**
     * Stop background music
     */
    stopBgm() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgmPlaying = false;
        }
    }

    /**
     * Toggle background music
     * @returns {boolean} New playing state
     */
    toggleBgm() {
        if (this.bgmPlaying) {
            this.pauseBgm();
        } else {
            this.playBgm();
        }
        return this.bgmPlaying;
    }

    /**
     * Set BGM volume
     * @param {number} volume - Volume 0-1
     */
    setBgmVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgm) {
            this.bgm.volume = this.bgmVolume;
        }
    }

    /**
     * Clear BGM
     */
    clearBgm() {
        this.stopBgm();
        this.bgm = null;
        this.bgmData = null;
    }

    /**
     * Convert file to data URL
     * @param {File} file - File to convert
     * @returns {Promise<string>} Data URL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get audio state for saving
     * @returns {Object} Audio state
     */
    getState() {
        return {
            expressionSfxData: this.expressionSfxData,
            expressionSfxVolume: this.expressionSfxVolume,
            bgmData: this.bgmData,
            bgmVolume: this.bgmVolume
        };
    }

    /**
     * Load audio state from saved data
     * @param {Object} state - Saved audio state
     */
    loadState(state) {
        if (!state) return;
        
        if (state.expressionSfxData) {
            this.loadExpressionSfxFromData(state.expressionSfxData);
            this.expressionSfxVolume = state.expressionSfxVolume || 0.5;
        }
        
        if (state.bgmData) {
            this.loadBgmFromData(state.bgmData);
            this.bgmVolume = state.bgmVolume || 0.3;
        }
    }
}
