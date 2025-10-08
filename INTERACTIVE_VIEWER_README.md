# Interactive 3D Building Viewer

A production-ready, feature-rich 3D building model viewer built with React Three Fiber, Three.js, and Next.js. This component allows users to interactively select and customize colors of individual building surfaces (walls and floors) with a simple click.

## 🌟 Features

### Core Functionality
- ✅ **Load 3D Models**: Supports OBJ, GLTF, and GLB formats
- ✅ **Smart Mesh Classification**: Automatically distinguishes between:
  - Inner walls
  - Outer walls
  - Floors
  - Other structural elements
- ✅ **Click-to-Select**: Use mouse to select any surface in the 3D model
- ✅ **Dynamic Color Customization**: Change colors of individual meshes in real-time
- ✅ **Visual Feedback**: Yellow outline highlights selected surfaces
- ✅ **Color Picker UI**: Professional color picker with preset palettes

### User Experience
- 🎯 **Intuitive Controls**:
  - Left-click + drag: Rotate (orbit)
  - Right-click + drag: Pan
  - Scroll: Zoom in/out
  - Click surface: Select and open color picker
- 📱 **Responsive Design**: Works on desktop and tablet devices
- ⚡ **Performance Optimized**: Efficient rendering with React Three Fiber
- 🎨 **Modern UI**: Clean, professional interface with Tailwind CSS

### Technical Features
- 🔆 **Realistic Lighting**:
  - Ambient light for base illumination
  - Directional lights with shadows
  - Hemisphere light for natural sky/ground bounce
  - Environment maps for reflections
- 📐 **Automatic Camera Framing**: Model is automatically centered and scaled
- 🔄 **State Management**: Efficient color state tracking per mesh
- 🎭 **Material Normalization**: Converts all materials to MeshStandardMaterial
- 🎯 **Raycasting**: Precise click detection on 3D surfaces

## 📁 File Structure

```
src/
├── components/
│   └── Interactive3DViewer.tsx       # Main component
├── app/
│   └── interactive-viewer/
│       └── page.tsx                   # Demo page
└── types/
    └── (TypeScript types if needed)
```

## 🚀 Installation

### Prerequisites
```bash
npm install react react-dom next three @react-three/fiber @react-three/drei
npm install react-color @types/react-color
npm install tailwindcss postcss autoprefixer
```

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "next": "^14.x",
    "three": "^0.160.x",
    "@react-three/fiber": "^8.15.x",
    "@react-three/drei": "^9.90.x",
    "react-color": "^2.19.3"
  },
  "devDependencies": {
    "@types/react-color": "^3.0.11",
    "@types/three": "^0.160.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x"
  }
}
```

## 💻 Usage

### Basic Usage

```tsx
import Interactive3DViewer from "@/components/Interactive3DViewer";

export default function MyPage() {
  return (
    <div className="w-full h-screen">
      <Interactive3DViewer modelUrl="/models/building.glb" />
    </div>
  );
}
```

### With Dynamic Import (Recommended for Next.js)

```tsx
"use client";

import dynamic from "next/dynamic";

const Interactive3DViewer = dynamic(
  () => import("@/components/Interactive3DViewer"),
  { 
    ssr: false,
    loading: () => <div>Loading 3D Viewer...</div>
  }
);

export default function MyPage() {
  return (
    <div className="w-full h-screen">
      <Interactive3DViewer modelUrl="/models/building.glb" />
    </div>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `modelUrl` | `string` | Yes | Path to 3D model file (OBJ, GLTF, or GLB) |
| `className` | `string` | No | Additional CSS classes for the container |

### Preloading Models

```tsx
import { preloadModel } from "@/components/Interactive3DViewer";

// Preload model for better performance
useEffect(() => {
  preloadModel("/models/building.glb");
}, []);
```

## 🎨 How It Works

### 1. Mesh Classification Algorithm

The component uses a multi-layered approach to classify meshes:

**Name-Based Detection** (Highest Priority)
```typescript
// Checks mesh names for keywords
if (name.includes("inner") && name.includes("wall")) return "inner-wall";
if (name.includes("outer") && name.includes("wall")) return "outer-wall";
if (name.includes("floor")) return "floor";
```

**Geometry-Based Detection**
```typescript
// Analyzes bounding box dimensions
const isHorizontal = height < width * 0.3;
const hasLargeArea = width * depth > 4.0;

if (isHorizontal && hasLargeArea) return "floor";
```

**Position-Based Detection**
```typescript
// Determines inner vs outer walls by distance from origin
const distanceFromOrigin = Math.sqrt(x² + z²);
return distanceFromOrigin > 5 ? "outer-wall" : "inner-wall";
```

### 2. Click Detection System

Uses React Three Fiber's built-in raycasting:

```tsx
<primitive 
  object={gltf.scene} 
  onClick={(event) => {
    const mesh = event.object as THREE.Mesh;
    onMeshClick(mesh, event.point);
  }}
/>
```

### 3. Color Management

Efficient state management with Maps:

```typescript
const [meshColors, setMeshColors] = useState<Map<string, string>>(new Map());

// Update color
const updateColor = (uuid: string, color: string) => {
  setMeshColors(prev => {
    const updated = new Map(prev);
    updated.set(uuid, color);
    return updated;
  });
};
```

### 4. Material Application

```typescript
function applyColorToMesh(mesh: THREE.Mesh, color: string) {
  const materials = Array.isArray(mesh.material) 
    ? mesh.material 
    : [mesh.material];
  
  materials.forEach((mat) => {
    if (mat && "color" in mat) {
      (mat as THREE.MeshStandardMaterial).color.set(color);
    }
  });
}
```

## 🎯 Component Architecture

```
Interactive3DViewer (Main Container)
│
├── Canvas (React Three Fiber)
│   │
│   ├── SceneLighting
│   │   ├── ambientLight
│   │   ├── hemisphereLight
│   │   ├── directionalLight (x3)
│   │   └── Environment
│   │
│   ├── BuildingModel
│   │   ├── primitive (GLTF scene)
│   │   └── SelectionHighlight
│   │       └── LineSegments (yellow edges)
│   │
│   ├── ContactShadows
│   ├── gridHelper
│   └── OrbitControls
│
└── ColorPickerUI (React DOM)
    ├── Header (mesh info)
    ├── SketchPicker (color selection)
    └── Footer (current color)
```

## 🎓 Code Examples

### Custom Mesh Classification

Override the default classification logic:

```typescript
function customClassifyMesh(mesh: THREE.Mesh): MeshType {
  const name = mesh.name.toLowerCase();
  
  // Your custom logic
  if (name.includes("ceiling")) return "ceiling";
  if (name.includes("window")) return "window";
  
  // Fallback to default
  return classifyMesh(mesh);
}
```

### Custom Color Presets

Modify the color picker presets:

```typescript
<SketchPicker
  color={color}
  onChange={handleColorChange}
  presetColors={[
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
  ]}
/>
```

### Export Color Configuration

Save user's color choices:

```typescript
function exportColorConfig() {
  const config = Array.from(meshColors.entries()).map(([uuid, color]) => ({
    meshId: uuid,
    color: color,
  }));
  
  const json = JSON.stringify(config, null, 2);
  // Download or send to backend
  console.log(json);
}
```

### Load Color Configuration

Restore saved colors:

```typescript
function loadColorConfig(config: Array<{meshId: string, color: string}>) {
  const colorMap = new Map(
    config.map(item => [item.meshId, item.color])
  );
  setMeshColors(colorMap);
}
```

## 🔧 Customization Guide

### Lighting Adjustments

Modify in `SceneLighting` component:

```typescript
// Brighter scene
<ambientLight intensity={0.6} /> // Was 0.4

// More dramatic shadows
<directionalLight intensity={1.8} /> // Was 1.2

// Warmer lighting
<hemisphereLight args={["#FFD700", "#8B4513", 0.6]} />
```

### Camera Settings

Adjust in `OrbitControls`:

```typescript
<OrbitControls
  minDistance={1}      // Closer zoom
  maxDistance={50}     // Further zoom
  maxPolarAngle={Math.PI / 2.2}  // Prevent below-ground view
/>
```

### Selection Highlight Color

Change in `SelectionHighlight` component:

```typescript
const edgesMaterial = new THREE.LineBasicMaterial({ 
  color: 0xFF00FF, // Purple instead of yellow
  linewidth: 3      // Thicker lines
});
```

## 📊 Performance Optimization

### Best Practices

1. **Model Optimization**
   - Keep polygon count reasonable (<100k triangles)
   - Use compressed GLTF/GLB formats
   - Combine meshes when possible
   - Use LOD (Level of Detail) for complex models

2. **Texture Optimization**
   - Use power-of-2 dimensions (512x512, 1024x1024)
   - Compress textures (JPEG for color, PNG for alpha)
   - Consider texture atlases

3. **Rendering Optimization**
   ```typescript
   <Canvas
     dpr={[1, 2]}  // Limit pixel ratio
     gl={{ 
       powerPreference: "high-performance",
       antialias: window.devicePixelRatio === 1 // Conditional AA
     }}
   />
   ```

## 🐛 Troubleshooting

### Model Not Loading

```typescript
// Check console for CORS errors
// Ensure model is in public folder
// Verify file path is correct
modelUrl="/models/building.glb" // ✅ Correct
modelUrl="models/building.glb"  // ❌ Missing leading slash
```

### Colors Not Applying

```typescript
// Check if mesh has material
if (!mesh.material) {
  mesh.material = new THREE.MeshStandardMaterial({ color: "#CCCCCC" });
}
```

### Click Not Detecting

```typescript
// Ensure mesh has geometry
if (!mesh.geometry) return;

// Check if mesh is in clickable layer
mesh.layers.enable(0);
```

### Performance Issues

```typescript
// Reduce shadow quality
shadow-mapSize-width={2048}  // Instead of 4096
shadow-mapSize-height={2048}

// Limit lights
// Remove or reduce light count

// Disable environment map if not needed
<Environment preset="city" background={false} intensity={0.5} />
```

## 🎯 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Mobile browsers (limited performance)

## 📝 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
interface MeshInfo {
  uuid: string;
  name: string;
  type: "inner-wall" | "outer-wall" | "floor" | "other";
  originalColor: string;
  currentColor: string;
}

interface SelectedMesh {
  uuid: string;
  name: string;
  type: string;
  position: THREE.Vector3;
  color: string;
}
```

## 🔐 Security Considerations

- Models are loaded client-side (no server processing)
- No data persistence by default (add as needed)
- CORS policy applies for external models
- XSS protection via React's built-in escaping

## 📜 License

This component is provided as-is for use in your projects.

## 🙏 Credits

Built with:
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [Three.js](https://threejs.org/) - 3D graphics library
- [Drei](https://github.com/pmndrs/drei) - Useful helpers for R3F
- [React Color](https://casesandberg.github.io/react-color/) - Color picker components
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

## 📞 Support

For issues, questions, or contributions, please refer to your project's issue tracker or documentation.

---

**Happy Building! 🏗️** 🎨
