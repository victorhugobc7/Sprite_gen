/**
 * SpriteGen - Dialogue System
 */

export class DialogueSystem {
    constructor() {
        this.currentDialogue = {
            character: '',
            text: '',
            style: 'default',
            visible: true,
            boxColor: '#e94560', // Default accent color
            typingSpeed: 150, // ms per character (default middle point)
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
