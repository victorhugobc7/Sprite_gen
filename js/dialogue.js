/**
 * SpriteGen - Dialogue System
 */

export class DialogueSystem {
    constructor() {
        // Multi-dialogue support
        this.dialogueLines = [];
        this.currentLineIndex = 0;
        this.fadeDuration = 300; // ms for fade transitions
        this.fadeOpacity = 1; // Current fade opacity (0-1)
        this.isFading = false;
        this.fadeTimeout = null;
        
        this.currentDialogue = {
            character: '',
            text: '',
            style: 'default',
            visible: true,
            boxColor: '#e94560', // Default accent color
            typingSpeed: 50, // ms per character (default middle point)
            displayedText: '', // Currently visible text (for typewriter effect)
            isTyping: false,
            typingComplete: false
        };
        
        // Typing animation state
        this.typingIndex = 0;
        this.typingTimeout = null;
        this.parsedSegments = []; // Parsed text segments with pauses
        this.currentSegmentIndex = 0;
        this.onTypingUpdate = null; // Callback for typing updates
        this.onLineComplete = null; // Callback when a line is complete
        this.onAllLinesComplete = null; // Callback when all lines are done
        
        this.styles = {
            default: {
                fontSize: 28,
                fontFamily: 'Calamity, "Segoe UI", sans-serif',
                color: '#ffffff',
                fontStyle: ''
            },
            thought: {
                fontSize: 28,
                fontFamily: 'Calamity, "Segoe UI", sans-serif',
                color: '#a0a0a0',
                fontStyle: 'italic'
            },
            shout: {
                fontSize: 34,
                fontFamily: 'Calamity, "Segoe UI", sans-serif',
                color: '#ffffff',
                fontStyle: 'bold'
            },
            whisper: {
                fontSize: 24,
                fontFamily: 'Calamity, "Segoe UI", sans-serif',
                color: '#808080',
                fontStyle: ''
            }
        };
    }

    /**
     * Set fade duration for transitions between dialogue lines
     * @param {number} durationMs - Duration in milliseconds
     */
    setFadeDuration(durationMs) {
        this.fadeDuration = durationMs;
    }

    /**
     * Get fade duration
     * @returns {number} Fade duration in ms
     */
    getFadeDuration() {
        return this.fadeDuration;
    }

    /**
     * Get current fade opacity
     * @returns {number} Opacity value 0-1
     */
    getFadeOpacity() {
        return this.fadeOpacity;
    }

    /**
     * Set multiple dialogue lines for a scene
     * @param {Array} lines - Array of dialogue objects
     */
    setDialogueLines(lines) {
        this.dialogueLines = lines || [];
        this.currentLineIndex = 0;
        this.fadeOpacity = 1;
        this.isFading = false;
        
        if (this.dialogueLines.length > 0) {
            this.setDialogue(this.dialogueLines[0]);
        }
    }

    /**
     * Get all dialogue lines
     * @returns {Array} Array of dialogue lines
     */
    getDialogueLines() {
        return [...this.dialogueLines];
    }

    /**
     * Get current line index
     * @returns {number} Current line index
     */
    getCurrentLineIndex() {
        return this.currentLineIndex;
    }

    /**
     * Advance to next dialogue line with fade transition
     * @param {Function} onFadeOut - Callback during fade out
     * @param {Function} onFadeIn - Callback during fade in
     * @returns {boolean} True if there was a next line
     */
    advanceToNextLine(onFadeOut, onFadeIn) {
        if (this.currentLineIndex >= this.dialogueLines.length - 1) {
            if (this.onAllLinesComplete) {
                this.onAllLinesComplete();
            }
            return false;
        }
        
        this.isFading = true;
        
        // Fade out
        this.animateFade(1, 0, this.fadeDuration / 2, () => {
            // Switch to next line
            this.currentLineIndex++;
            const nextLine = this.dialogueLines[this.currentLineIndex];
            this.setDialogue(nextLine);
            
            if (onFadeOut) onFadeOut(this.currentDialogue);
            
            // Fade in
            this.animateFade(0, 1, this.fadeDuration / 2, () => {
                this.isFading = false;
                if (onFadeIn) onFadeIn(this.currentDialogue);
            });
        });
        
        return true;
    }

    /**
     * Animate fade opacity
     * @param {number} from - Starting opacity
     * @param {number} to - Target opacity
     * @param {number} duration - Duration in ms
     * @param {Function} onComplete - Callback when complete
     */
    animateFade(from, to, duration, onComplete) {
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.fadeOpacity = from + (to - from) * progress;
            
            if (this.onTypingUpdate) {
                this.onTypingUpdate(this.currentDialogue);
            }
            
            if (progress < 1) {
                this.fadeTimeout = requestAnimationFrame(animate);
            } else {
                this.fadeOpacity = to;
                if (onComplete) onComplete();
            }
        };
        
        animate();
    }

    /**
     * Set dialogue content
     * @param {Object} dialogue - Dialogue data
     */
    setDialogue(dialogue) {
        this.currentDialogue = {
            ...this.currentDialogue,
            ...dialogue
        };
        return this.currentDialogue;
    }

    /**
     * Update character name
     * @param {string} name - Character name
     */
    setCharacter(name) {
        this.currentDialogue.character = name;
        return this.currentDialogue;
    }

    /**
     * Update dialogue text
     * @param {string} text - Dialogue text
     */
    setText(text) {
        this.currentDialogue.text = text;
        this.currentDialogue.displayedText = '';
        this.currentDialogue.typingComplete = false;
        return this.currentDialogue;
    }

    /**
     * Set typing speed
     * @param {number} speed - Milliseconds per character
     */
    setTypingSpeed(speed) {
        this.currentDialogue.typingSpeed = speed;
        return this.currentDialogue;
    }

    /**
     * Parse text into segments (text and pauses)
     * @param {string} text - Raw text with [[ms]] pause markers
     * @returns {Array} Array of segments {type: 'text'|'pause', content: string|number}
     */
    parseTextWithPauses(text) {
        const segments = [];
        const regex = /\[\[(\d+)\]\]/g;
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            // Add text before the pause
            if (match.index > lastIndex) {
                segments.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                });
            }
            
            // Add the pause
            segments.push({
                type: 'pause',
                content: parseInt(match[1])
            });
            
            lastIndex = regex.lastIndex;
        }
        
        // Add remaining text after last pause
        if (lastIndex < text.length) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex)
            });
        }
        
        return segments;
    }

    /**
     * Start typing animation
     * @param {Function} onUpdate - Callback called with each typing update
     * @param {Function} onComplete - Callback when typing is complete
     */
    startTyping(onUpdate, onComplete) {
        this.stopTyping();
        
        this.currentDialogue.displayedText = '';
        this.currentDialogue.isTyping = true;
        this.currentDialogue.typingComplete = false;
        this.typingIndex = 0;
        this.currentSegmentIndex = 0;
        this.onTypingUpdate = onUpdate;
        this.onTypingComplete = onComplete;
        
        // Parse the text into segments
        this.parsedSegments = this.parseTextWithPauses(this.currentDialogue.text);
        
        if (this.parsedSegments.length === 0) {
            this.finishTyping();
            return;
        }
        
        this.typeNextCharacter();
    }

    /**
     * Type the next character
     */
    typeNextCharacter() {
        if (this.currentSegmentIndex >= this.parsedSegments.length) {
            this.finishTyping();
            return;
        }
        
        const segment = this.parsedSegments[this.currentSegmentIndex];
        
        if (segment.type === 'pause') {
            // Handle pause
            this.typingTimeout = setTimeout(() => {
                this.currentSegmentIndex++;
                this.typingIndex = 0;
                this.typeNextCharacter();
            }, segment.content);
        } else {
            // Handle text character
            if (this.typingIndex < segment.content.length) {
                this.currentDialogue.displayedText += segment.content[this.typingIndex];
                this.typingIndex++;
                
                if (this.onTypingUpdate) {
                    this.onTypingUpdate(this.currentDialogue);
                }
                
                this.typingTimeout = setTimeout(() => {
                    this.typeNextCharacter();
                }, this.currentDialogue.typingSpeed);
            } else {
                // Move to next segment
                this.currentSegmentIndex++;
                this.typingIndex = 0;
                this.typeNextCharacter();
            }
        }
    }

    /**
     * Finish typing animation
     */
    finishTyping() {
        this.currentDialogue.isTyping = false;
        this.currentDialogue.typingComplete = true;
        // Set displayed text to full text without pause markers
        this.currentDialogue.displayedText = this.currentDialogue.text.replace(/\[\[\d+\]\]/g, '');
        
        if (this.onTypingUpdate) {
            this.onTypingUpdate(this.currentDialogue);
        }
        if (this.onTypingComplete) {
            this.onTypingComplete(this.currentDialogue);
        }
    }

    /**
     * Skip to end of typing animation
     */
    skipTyping() {
        this.stopTyping();
        this.finishTyping();
    }

    /**
     * Stop typing animation
     */
    stopTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        this.currentDialogue.isTyping = false;
    }

    /**
     * Get the clean text without pause markers
     * @param {string} text - Text with [[ms]] markers
     * @returns {string} Clean text
     */
    getCleanText(text) {
        return text.replace(/\[\[\d+\]\]/g, '');
    }

    /**
     * Set dialogue style
     * @param {string} style - Style name
     */
    setStyle(style) {
        if (this.styles[style]) {
            this.currentDialogue.style = style;
        }
        return this.currentDialogue;
    }

    /**
     * Toggle dialogue visibility
     * @param {boolean} visible - Visibility state
     */
    setVisible(visible) {
        this.currentDialogue.visible = visible;
        return this.currentDialogue;
    }

    /**
     * Set dialogue box color
     * @param {string} color - Hex color string
     */
    setBoxColor(color) {
        this.currentDialogue.boxColor = color;
        return this.currentDialogue;
    }

    /**
     * Get current dialogue state
     * @returns {Object} Current dialogue
     */
    getDialogue() {
        return { ...this.currentDialogue };
    }

    /**
     * Clear dialogue
     */
    clear() {
        this.currentDialogue = {
            character: '',
            text: '',
            style: 'default',
            visible: true,
            boxColor: '#e94560'
        };
        return this.currentDialogue;
    }

    /**
     * Get available styles
     * @returns {Object} Style definitions
     */
    getStyles() {
        return { ...this.styles };
    }

    /**
     * Add custom style
     * @param {string} name - Style name
     * @param {Object} style - Style definition
     */
    addStyle(name, style) {
        this.styles[name] = {
            fontSize: style.fontSize || 28,
            fontFamily: style.fontFamily || '"Segoe UI", sans-serif',
            color: style.color || '#ffffff',
            fontStyle: style.fontStyle || ''
        };
    }
}
