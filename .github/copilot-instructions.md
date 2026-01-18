# SpriteGen - Visual Novel Cutscene Creator

## Project Overview
SpriteGen is a web-based tool for creating visual novel-style 1920x1080 scripted sequences with:
- Canvas-based editor for scene composition
- Sprite import with automatic white background removal
- Text/dialogue system with customizable fonts and positioning
- Timeline/script-based sequence control
- Preview and export functionality

## Tech Stack
- HTML5 Canvas for rendering
- Vanilla JavaScript (ES6+ modules)
- Modern CSS3 with Flexbox/Grid
- No external dependencies for core functionality

## Project Structure
```
SpriteGen/
├── index.html          # Main application entry
├── css/
│   └── styles.css      # Application styles
├── js/
│   ├── app.js          # Main application controller
│   ├── canvas.js       # Canvas rendering engine
│   ├── sprite.js       # Sprite management & bg removal
│   ├── dialogue.js     # Text/dialogue system
│   ├── timeline.js     # Scene/sequence management
│   └── utils.js        # Utility functions
└── assets/
    └── fonts/          # Custom fonts for dialogue
```

## Development Guidelines
- Use ES6 modules for code organization
- Keep canvas operations optimized for 1920x1080 resolution
- Implement non-destructive sprite editing
- Save project state in JSON format
- Support keyboard shortcuts for common operations

## Key Features to Implement
1. **Sprite Import**: Drag-drop or file picker with white background removal
2. **Dialogue System**: Styled text boxes with character names and portraits
3. **Scene Timeline**: Ordered sequence of frames/scenes
4. **Preview Mode**: Playback sequences with timing controls
5. **Export**: Save as image sequence or bundled project
