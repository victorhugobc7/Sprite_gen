# SpriteGen - Visual Novel Cutscene Creator

A web-based tool for creating visual novel-style 1920x1080 scripted sequences with sprite management, dialogue systems, and timeline control.

## Features

- **1920x1080 Canvas Editor** - Create scenes at full HD resolution with zoom controls
- **Sprite Import with White Background Removal** - Automatically remove white backgrounds from character sprites
- **Drag & Drop Asset Management** - Easy import of sprites and backgrounds
- **Dialogue System** - Visual novel style text boxes with character names and multiple text styles
- **Scene Timeline** - Create and manage multiple scenes in a sequence
- **Preview Mode** - Playback your scenes with timing controls
- **Project Save/Load** - Save your work as JSON and continue later
- **Export** - Export scenes as PNG images

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A local web server (for ES6 module support)

### Running the Application

1. **Using VS Code Live Server:**
   - Install the "Live Server" extension
   - Right-click `index.html` and select "Open with Live Server"

2. **Using Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Then open http://localhost:8000 in your browser
   ```

3. **Using Node.js:**
   ```bash
   npx serve .
   ```

## Usage Guide

### Importing Assets

1. **Sprites**: Drag and drop images into the "Sprites" panel or click to browse
   - White backgrounds are automatically removed
   - Toggle background removal in sprite properties
   
2. **Backgrounds**: Drag and drop into the "Backgrounds" panel
   - Click any background to apply it to the current scene

### Working with Sprites

- **Add to Scene**: Click a sprite in the asset panel to add it to the canvas
- **Select**: Click a sprite on the canvas to select it
- **Move**: Drag sprites to reposition them
- **Properties**: Adjust position, scale, and opacity in the right panel
- **Delete**: Press `Delete` key to remove selected sprite from scene

### Dialogue System

1. Enter a **Character Name** for the speaker
2. Write the **Dialogue Text**
3. Choose a **Text Style**:
   - Default - Normal dialogue
   - Thought - Italicized internal thoughts
   - Shout - Bold, larger text
   - Whisper - Smaller, grayed text
4. Toggle **Show Dialogue Box** to show/hide the text box

### Managing Scenes

- **Add Scene**: Click "+ Scene" to create a new scene
- **Duplicate**: Copy the current scene with all its contents
- **Delete**: Remove the current scene
- **Navigate**: Click scene thumbnails in the timeline or use `Alt + Arrow` keys

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save project |
| `Ctrl + N` | New project |
| `Ctrl + D` | Duplicate scene |
| `Alt + ←` | Previous scene |
| `Alt + →` | Next scene |
| `Delete` | Remove selected sprite |

### Saving and Loading

- **Save**: Click "Save" to download your project as a JSON file
- **Load**: Click "Load" to open a previously saved project
- **Export**: Click "Export" to download all scenes as PNG images

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
    └── fonts/          # Custom fonts (optional)
```

## Technical Details

- **Built with**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, CSS3
- **No dependencies**: Runs entirely in the browser
- **Resolution**: 1920x1080 (Full HD)
- **Export format**: PNG images, JSON project files

## Browser Support

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

## License

MIT License - Feel free to use and modify for your projects.
