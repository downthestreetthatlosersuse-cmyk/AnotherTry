# 3D First-Person Game Framework

A modular, data-driven 3D first-person game built with Three.js. Designed for easy expansion and customization.

## 🎮 Features

- **First-person controls** - WASD movement, mouse look, jump, sprint
- **Modular architecture** - Decoupled systems communicating via events
- **Data-driven design** - Easy configuration and item definitions
- **Entity system** - Component-based entity management
- **Inventory system** - Stackable items, consumables, weapons
- **Event bus** - Pub/sub pattern for loose coupling
- **UI integration** - Health, score, inventory display

## 📁 Project Structure

```
/workspace
├── index.html              # Main HTML file
├── js/
│   ├── main.js             # Game entry point
│   ├── core/
│   │   └── EventBus.js     # Event system
│   ├── data/
│   │   └── GameConfig.js   # Game configuration
│   ├── entities/
│   │   ├── PlayerController.js  # Player logic
│   │   └── EntityManager.js     # Entity management
│   ├── systems/
│   │   ├── InputSystem.js       # Input handling
│   │   └── InventorySystem.js   # Inventory management
│   └── utils/            # Utility functions
└── README.md
```

## 🚀 Getting Started

1. **Open in browser**: Simply open `index.html` in a modern web browser
2. **Or use a local server**: 
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js (with npx)
   npx serve .
   ```
3. Click "Start" to begin playing

## 🎯 Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Mouse | Look around |
| Space | Jump |
| Shift | Sprint |
| E | Interact/Pickup |
| ESC | Pause |

## 🔧 Architecture

### Core Systems

1. **EventBus** - Central event hub for decoupled communication
2. **InputSystem** - Handles keyboard/mouse input with configurable bindings
3. **PlayerController** - First-person movement and camera control
4. **EntityManager** - Creates, updates, and manages game entities
5. **InventorySystem** - Manages items, stacking, and usage

### Data-Driven Design

All game configuration is stored in `GameConfig.js`:
- Player stats (speed, health, sensitivity)
- Physics settings
- World parameters
- Input mappings

Items are defined in `InventorySystem.js`:
- Easy to add new items
- Define effects, types, and properties
- Support for stackable items

### Extensibility

To add new features:

1. **New entity type**: Extend the `Entity` class
2. **New system**: Create in `systems/` folder, register in `main.js`
3. **New items**: Add to `ItemDefinitions` object
4. **Custom events**: Add to `GameEvents` constant

## 📝 Example: Adding a New Item

```javascript
// In InventorySystem.js - ItemDefinitions
'power_up': {
    id: 'power_up',
    name: 'Power Up',
    description: 'Temporary speed boost',
    type: 'consumable',
    stackable: true,
    maxStack: 10,
    icon: '⚡',
    color: 0xffff00,
    effect: {
        type: 'speed_boost',
        value: 1.5,
        duration: 10
    }
}
```

## 🛠️ Technologies Used

- **Three.js** - 3D graphics library
- **ES6 Modules** - Modular JavaScript
- **PointerLockControls** - FPS camera controls

## 📄 License

MIT License - Free to use and modify

