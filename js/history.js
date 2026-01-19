/**
 * SpriteGen - History/Undo-Redo System
 */

import { deepClone } from './utils.js';

export class HistoryManager {
    constructor(maxHistory = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory;
        this.isRestoring = false; // Flag to prevent recording during restore
        
        // Callbacks
        this.onHistoryChange = null;
    }

    /**
     * Record a state snapshot
     * @param {string} action - Description of the action
     * @param {Object} state - State to save
     */
    record(action, state) {
        if (this.isRestoring) return;
        
        const snapshot = {
            action,
            state: deepClone(state),
            timestamp: Date.now()
        };
        
        this.undoStack.push(snapshot);
        
        // Clear redo stack when new action is recorded
        this.redoStack = [];
        
        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        
        this.notifyChange();
    }

    /**
     * Undo last action
     * @param {Object} currentState - Current state before undo
     * @returns {Object|null} State to restore, or null if nothing to undo
     */
    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        
        // Save current state to redo stack
        const redoSnapshot = {
            action: 'redo',
            state: deepClone(currentState),
            timestamp: Date.now()
        };
        this.redoStack.push(redoSnapshot);
        
        // Pop and return the previous state
        const snapshot = this.undoStack.pop();
        this.notifyChange();
        
        return snapshot.state;
    }

    /**
     * Redo last undone action
     * @param {Object} currentState - Current state before redo
     * @returns {Object|null} State to restore, or null if nothing to redo
     */
    redo(currentState) {
        if (this.redoStack.length === 0) return null;
        
        // Save current state to undo stack
        const undoSnapshot = {
            action: 'undo',
            state: deepClone(currentState),
            timestamp: Date.now()
        };
        this.undoStack.push(undoSnapshot);
        
        // Pop and return the redo state
        const snapshot = this.redoStack.pop();
        this.notifyChange();
        
        return snapshot.state;
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyChange();
    }

    /**
     * Notify listeners of history change
     */
    notifyChange() {
        if (this.onHistoryChange) {
            this.onHistoryChange({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length
            });
        }
    }

    /**
     * Set restoring flag (prevents recording during restore)
     * @param {boolean} restoring
     */
    setRestoring(restoring) {
        this.isRestoring = restoring;
    }
}
