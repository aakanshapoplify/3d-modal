# 3D Floor Plan Editor

This project now includes a comprehensive 3D Floor Plan Editor inspired by the reference implementation from `3d-model-view-nextjs`. The editor provides powerful tools for creating and customizing 3D floor plans with furniture placement.

## Features

### 🏠 Floor Plan Management
- Upload floor plan files (OBJ, GLB formats)
- Automatic material assignment for walls and floors
- Smart detection of architectural elements
- Wall color customization with predefined palettes
- Force wall mode for complex models

### 🪑 Furniture Library
- Pre-built furniture models (Chair, Table, Sofa)
- Interactive furniture selection interface
- One-click furniture placement on floor plans
- Visual selection indicators

### 🎨 Customization
- **Wall Colors**: 10 predefined colors + custom color picker
- **Furniture Colors**: 16 predefined colors + custom color picker
- **Material Assignment**: Automatic floor/wall detection with manual override

### 🔧 Transform Controls
- **Position**: Nudge furniture with X/Z axis controls
- **Rotation**: Rotate furniture in 22.5° increments
- **Scale**: Scale furniture up/down with 10% increments
- **Visual Selection**: Yellow highlight for selected items

### 💾 Layout Persistence
- Save layouts to localStorage
- Load previously saved layouts
- Clear current layout
- Automatic layout restoration on page load

## Usage

### Accessing the Editor
1. Navigate to `/editor` in your browser
2. Or click "Floor Editor" in the navigation menu

### Basic Workflow
1. **Load Floor Plan**: Upload an OBJ file or use the default floor
2. **Select Furniture**: Open the furniture library and choose an item
3. **Place Furniture**: Click on the floor in the 3D view to place items
4. **Customize**: Use the sidebar controls to adjust colors and positions
5. **Save**: Save your layout for future use

### Advanced Features
- **Wall Color Control**: Change wall colors with predefined palettes
- **Force Wall Mode**: Override automatic detection for complex models
- **Transform Controls**: Fine-tune furniture positioning and scaling
- **Layout Management**: Save, load, and clear your designs

## Technical Implementation

### Components
- `FloorEditor.tsx`: Main editor component with all functionality
- `editor/page.tsx`: Next.js page wrapper
- Updated `Navbar.tsx`: Navigation with editor link

### Key Technologies
- **React Three Fiber**: 3D rendering and scene management
- **Three.js**: 3D graphics and material handling
- **React Three Drei**: Helper components and utilities
- **Material Assignment**: Smart detection based on geometry and naming

### File Structure
```
src/
├── components/
│   ├── FloorEditor.tsx     # Main editor component
│   └── Navbar.tsx          # Updated navigation
└── app/
    └── editor/
        └── page.tsx        # Editor page

public/
└── models/
    ├── floor.glb           # Default floor model
    ├── chair.glb           # Chair furniture
    ├── table.glb           # Table furniture
    └── sofa.glb            # Sofa furniture
```

## Reference Implementation

This editor is based on the comprehensive floor plan editor from the `3d-model-view-nextjs` project, featuring:
- Advanced material assignment algorithms
- Intelligent wall/floor detection
- Professional furniture placement system
- Robust layout persistence
- User-friendly interface design

The implementation maintains the same high-quality user experience while integrating seamlessly with the existing 3d-modal project architecture.
