# Interactive 3D Viewer - Visual Architecture Guide

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERACTIVE 3D VIEWER                         │
│                    (Main Container Component)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────────┐                    ┌──────────────────────┐
│   STATE LAYER    │                    │     UI LAYER         │
├──────────────────┤                    ├──────────────────────┤
│ • selectedMesh   │                    │ • Info Panel         │
│ • meshColors     │                    │ • Reset Button       │
│ • pickerPosition │                    │ • ColorPickerUI      │
│ • meshRegistry   │                    │ • Feature Panel      │
└──────────────────┘                    └──────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CANVAS LAYER                              │
│                    (React Three Fiber)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Camera Setup   │  │ Scene Lighting  │  │  Building Model │ │
│  ├────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • Perspective  │  │ • Ambient       │  │ • GLTF Loader   │ │
│  │ • Auto-frame   │  │ • Hemisphere    │  │ • Material Mgmt │ │
│  │ • FOV: 50      │  │ • Directional×3 │  │ • Mesh Registry │ │
│  └────────────────┘  │ • Environment   │  │ • Click Handler │ │
│                      │ • Contact Shadow│  │ • Color Apply   │ │
│  ┌────────────────┐  └─────────────────┘  └─────────────────┘ │
│  │ Orbit Controls │                                             │
│  ├────────────────┤  ┌──────────────────────────────────────┐ │
│  │ • Rotate       │  │      Selection Highlight             │ │
│  │ • Zoom         │  ├──────────────────────────────────────┤ │
│  │ • Pan          │  │ • EdgesGeometry                      │ │
│  │ • Damping      │  │ • Yellow outline                     │ │
│  └────────────────┘  │ • Follows selected mesh              │ │
│                      └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 User Interaction Flow

```
┌─────────────┐
│   USER      │
│  ACTION     │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  1. CLICK ON 3D SURFACE                              │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  2. RAYCASTER DETECTS MESH                           │
│     • Identifies clicked object                      │
│     • Gets intersection point                        │
│     • Extracts mesh reference                        │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  3. CLASSIFY MESH TYPE                               │
│     • Check name patterns                            │
│     • Analyze geometry                               │
│     • Determine: inner-wall | outer-wall | floor     │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  4. UPDATE STATE                                     │
│     • Set selectedMesh (uuid, name, type, color)     │
│     • Calculate color picker position                │
│     • Trigger re-render                              │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  5. VISUAL FEEDBACK                                  │
│     • Show yellow outline (SelectionHighlight)       │
│     • Display ColorPickerUI                          │
│     • Show mesh info in picker                       │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  6. USER SELECTS COLOR                               │
│     • Click preset or use custom picker              │
│     • Color change triggers handler                  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  7. APPLY COLOR TO MESH                              │
│     • Update meshColors Map                          │
│     • Apply color to material                        │
│     • Color appears instantly in 3D                  │
└──────────────────────────────────────────────────────┘
```

## 🎨 Color Management System

```
┌─────────────────────────────────────────────────────────┐
│              MESH COLOR STATE MACHINE                   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  ORIGINAL STATE  │              │ MODIFIED STATE   │
├──────────────────┤              ├──────────────────┤
│ • From model     │─────────────▶│ • User changed   │
│ • Stored in      │   [Color     │ • Stored in      │
│   meshRegistry   │    Change]   │   meshColors     │
│                  │              │                  │
│ • Per mesh UUID  │◀─────────────│ • Per mesh UUID  │
│ • Fallback color │   [Reset]    │ • Applied live   │
└──────────────────┘              └──────────────────┘

Data Structure:

meshRegistry: Map<uuid, MeshInfo>
  ├─ uuid: "abc123"
  ├─ name: "inner-wall-1"
  ├─ type: "inner-wall"
  ├─ originalColor: "#CCCCCC"
  └─ currentColor: "#CCCCCC"

meshColors: Map<uuid, color>
  ├─ "abc123": "#FF6B6B"
  ├─ "def456": "#4ECDC4"
  └─ "ghi789": "#45B7D1"
```

## 🎯 Mesh Classification Logic

```
┌─────────────────────────────────────────────────────────┐
│            MESH CLASSIFICATION ALGORITHM                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │   1. NAME-BASED DETECTION     │
          │   (Highest Priority)          │
          └───────┬───────────────────────┘
                  │
        ┌─────────┼─────────┬──────────┐
        │         │         │          │
        ▼         ▼         ▼          ▼
    ┌────────┬────────┬────────┬──────────┐
    │"inner" │"outer" │"floor" │"ground"  │
    │+"wall" │+"wall" │        │"base"    │
    └────┬───┴────┬───┴────┬───┴────┬─────┘
         │        │        │        │
         ▼        ▼        ▼        ▼
    inner-wall outer-wall  floor   floor
         │        │        │        │
         └────────┴────────┴────────┘
                  │
                  ▼
          ┌───────────────────────────────┐
          │   2. GEOMETRY-BASED DETECTION │
          │   (Shape Analysis)            │
          └───────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    ┌─────────────┐    ┌─────────────┐
    │ HORIZONTAL  │    │  VERTICAL   │
    │ + LARGE     │    │  + THIN     │
    │   AREA      │    │  + TALL     │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           ▼                  ▼
         floor             wall
           │                  │
           └────────┬─────────┘
                    │
                    ▼
          ┌───────────────────────────────┐
          │  3. POSITION-BASED DETECTION  │
          │  (Spatial Location)           │
          └───────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    ┌─────────────┐    ┌─────────────┐
    │ FAR FROM    │    │ NEAR TO     │
    │  ORIGIN     │    │  ORIGIN     │
    │  (>5 units) │    │  (<5 units) │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           ▼                  ▼
      outer-wall         inner-wall
```

## 🔆 Lighting Setup Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   LIGHTING SYSTEM                       │
└─────────────────────────────────────────────────────────┘

            SKY LIGHT (Hemisphere)
                  ↓ ↓ ↓
            ═══════════════
           ╱               ╲
          ╱                 ╲
         ╱  ☀️ KEY LIGHT    ╲
        │   (Top-Right)      │
        │   Intensity: 1.2   │
        │   With Shadows     │
         ╲                  ╱
          ╲    🏢 MODEL   ╱
           ╲            ╱
            ═══════════
                │ │ │
           GROUND BOUNCE
         (Hemisphere Ground)

  💡 FILL LIGHT        💡 BACK LIGHT
  (Top-Left)           (Behind)
  Intensity: 0.5       Intensity: 0.3
  Softens shadows      Adds depth

           🌍 ENVIRONMENT MAP
           (City Preset)
           Reflections & IBL

Component Breakdown:

┌────────────────────────────────────────┐
│ ambientLight                           │
│ • Intensity: 0.4                       │
│ • Purpose: Base illumination           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ hemisphereLight                        │
│ • Sky Color: #87CEEB (Sky Blue)        │
│ • Ground Color: #8B7355 (Brown)        │
│ • Intensity: 0.5                       │
│ • Purpose: Natural bounce light        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ directionalLight (KEY)                 │
│ • Position: [10, 20, 10]               │
│ • Intensity: 1.2                       │
│ • Cast Shadow: true                    │
│ • Shadow Quality: 4096×4096            │
│ • Purpose: Main light & shadows        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ directionalLight (FILL)                │
│ • Position: [-10, 15, -10]             │
│ • Intensity: 0.5                       │
│ • Color: #b8d4ff (Cool blue)           │
│ • Purpose: Soften shadows              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ directionalLight (BACK)                │
│ • Position: [0, 10, -15]               │
│ • Intensity: 0.3                       │
│ • Color: #ffd4a3 (Warm orange)         │
│ • Purpose: Rim lighting & depth        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Environment (IBL)                      │
│ • Preset: "city"                       │
│ • Purpose: Reflections                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ContactShadows                         │
│ • Opacity: 0.4                         │
│ • Purpose: Ground contact              │
└────────────────────────────────────────┘
```

## 🎮 Camera Control System

```
┌─────────────────────────────────────────────────────────┐
│                ORBIT CONTROLS SETUP                     │
└─────────────────────────────────────────────────────────┘

        ↑ Zoom In (Scroll Up)
        │
        │   ↻ Rotate (Left-Click + Drag)
        │  ╱
        │ ╱
        │╱
    ────┼──── → Pan Right (Right-Click + Drag)
        │
        │ ← Pan Left
        │
        ↓ Zoom Out (Scroll Down)

Configuration:

┌────────────────────────────────────────┐
│ minDistance: 2                         │
│ • Closest zoom level                   │
│ • Prevents camera entering model       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ maxDistance: 100                       │
│ • Furthest zoom level                  │
│ • Keeps model visible                  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ maxPolarAngle: Math.PI / 2             │
│ • Prevents viewing from below          │
│ • Maintains realistic viewing angle    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ enableDamping: true                    │
│ • Smooth motion                        │
│ • Inertia effect                       │
│ • dampingFactor: 0.05                  │
└────────────────────────────────────────┘

Auto-Framing Algorithm:

┌─────────────────────────────────────────┐
│ 1. Calculate bounding box               │
│    • min: [x, y, z]                     │
│    • max: [x, y, z]                     │
│    • size: max - min                    │
│    • center: (max + min) / 2            │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 2. Calculate optimal distance           │
│    • maxDim = max(size.x, size.y, size.z)│
│    • fov = camera.fov (50°)             │
│    • distance = maxDim / (2 × tan(fov/2))│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 3. Position camera at angle             │
│    • x: center.x + distance × 0.8       │
│    • y: center.y + distance × 0.6       │
│    • z: center.z + distance × 0.8       │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 4. Set orbit target to center           │
│    • controls.target = center           │
│    • controls.update()                  │
└─────────────────────────────────────────┘
```

## 📦 Component Hierarchy

```
Interactive3DViewer
│
├─ State (React Hooks)
│  ├─ selectedMesh: SelectedMesh | null
│  ├─ meshColors: Map<uuid, color>
│  ├─ pickerPosition: { x, y }
│  └─ canvasRef: RefObject<HTMLCanvasElement>
│
├─ Canvas (R3F)
│  │
│  ├─ PerspectiveCamera
│  │  ├─ position: [10, 10, 10]
│  │  ├─ fov: 50
│  │  └─ makeDefault: true
│  │
│  ├─ SceneLighting (Component)
│  │  ├─ ambientLight
│  │  ├─ hemisphereLight
│  │  ├─ directionalLight × 3
│  │  └─ Environment
│  │
│  ├─ Suspense
│  │  └─ BuildingModel (Component)
│  │     ├─ useGLTF (hook)
│  │     ├─ Mesh Registry (state)
│  │     ├─ Material Normalization (effect)
│  │     ├─ Camera Framing (effect)
│  │     ├─ Color Application (effect)
│  │     ├─ primitive (GLTF scene)
│  │     │  └─ onClick: handleMeshClick
│  │     └─ SelectionHighlight
│  │        ├─ EdgesGeometry
│  │        ├─ LineBasicMaterial (yellow)
│  │        └─ LineSegments
│  │
│  ├─ ContactShadows
│  ├─ gridHelper
│  └─ OrbitControls
│
├─ UI Overlays (React DOM)
│  │
│  ├─ Info Panel (top-left)
│  │  ├─ Status Indicator
│  │  ├─ Instructions
│  │  └─ Stats Counter
│  │
│  ├─ Reset Button (top-right)
│  │  ├─ Conditional render
│  │  └─ onClick: reset colors
│  │
│  └─ ColorPickerUI (floating)
│     ├─ Header
│     │  ├─ Mesh Name
│     │  ├─ Mesh Type Badge
│     │  └─ Close Button
│     ├─ SketchPicker
│     │  ├─ Color Spectrum
│     │  ├─ Hue Slider
│     │  ├─ Preset Swatches
│     │  └─ Hex Input
│     └─ Footer
│        └─ Current Color Display
│
└─ Functions (Utilities)
   ├─ classifyMesh()
   ├─ getMeshColor()
   ├─ applyColorToMesh()
   ├─ handleMeshClick()
   ├─ handleColorChange()
   └─ handleCloseColorPicker()
```

## 🔄 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │  RAYCASTER CLICK │
         └────────┬─────────┘
                  │
         ┌────────▼─────────┐
         │ Extract Mesh Data│
         │ • UUID           │
         │ • Name           │
         │ • Position       │
         │ • Color          │
         └────────┬─────────┘
                  │
         ┌────────▼─────────┐
         │  Classify Mesh   │
         │  Type Detection  │
         └────────┬─────────┘
                  │
         ┌────────▼─────────┐
         │  Update State    │
         │  setSelectedMesh │
         └────────┬─────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌─────────────┐          ┌─────────────────┐
│ 3D SCENE    │          │  UI LAYER       │
│ Updates     │          │  Updates        │
├─────────────┤          ├─────────────────┤
│• Show       │          │• Position       │
│  Highlight  │          │  ColorPicker    │
│• Apply      │          │• Display Mesh   │
│  Transform  │          │  Info           │
└──────┬──────┘          │• Show Presets   │
       │                 └────────┬────────┘
       │                          │
       │                 ┌────────▼────────┐
       │                 │ USER SELECTS    │
       │                 │  COLOR          │
       │                 └────────┬────────┘
       │                          │
       │                 ┌────────▼────────┐
       │                 │ handleColorChange│
       │                 └────────┬────────┘
       │                          │
       │                 ┌────────▼────────┐
       │                 │ Update meshColors│
       │                 │ Map<uuid, color> │
       │                 └────────┬────────┘
       │                          │
       └──────────────────────────┘
                  │
         ┌────────▼─────────┐
         │ Apply Color to   │
         │ Material         │
         │ material.color   │
         │ .set(newColor)   │
         └────────┬─────────┘
                  │
         ┌────────▼─────────┐
         │ Visual Update    │
         │ (Immediate)      │
         └──────────────────┘
```

---

**These diagrams provide a comprehensive visual guide to understanding the Interactive 3D Viewer architecture!** 📊🎨
