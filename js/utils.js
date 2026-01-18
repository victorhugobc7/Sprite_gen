/**
 * SpriteGen - Utility Functions
 */

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Load an image from a file
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
export function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Load an image from a data URL
 * @param {string} dataUrl - Image data URL
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
export function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Download data as a file
 * @param {string} data - Data to download
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(data, filename, mimeType = 'application/json') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download a canvas as an image
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - File name
 * @param {string} format - Image format (png, jpeg, webp)
 */
export function downloadCanvas(canvas, filename, format = 'png') {
    const mimeType = `image/${format}`;
    const dataUrl = canvas.toDataURL(mimeType);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Get filename without extension
 * @param {string} filename - File name
 * @returns {string} Filename without extension
 */
export function getFileNameWithoutExtension(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Format time in milliseconds to readable format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Easing functions for smooth animations
 * @param {number} t - Progress value (0 to 1)
 * @returns {number} Eased value (0 to 1)
 */
export const easingFunctions = {
    linear: (t) => t,
    
    easeIn: (t) => t * t,
    
    easeOut: (t) => t * (2 - t),
    
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    easeInCubic: (t) => t * t * t,
    
    easeOutCubic: (t) => (--t) * t * t + 1,
    
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
    easeInQuart: (t) => t * t * t * t,
    
    easeOutQuart: (t) => 1 - (--t) * t * t * t,
    
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    
    easeOutBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    
    easeOutElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

/**
 * Apply easing to a progress value
 * @param {number} t - Progress value (0 to 1)
 * @param {string} easingName - Name of the easing function
 * @returns {number} Eased value
 */
export function applyEasing(t, easingName = 'easeInOut') {
    const easing = easingFunctions[easingName] || easingFunctions.easeInOut;
    return easing(Math.max(0, Math.min(1, t)));
}
