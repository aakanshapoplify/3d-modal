# Interactive 3D Viewer - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Access the Viewer
Navigate to: `http://localhost:3000/interactive-viewer`

### Step 2: Interact with the Model
- **Rotate**: Left-click + drag
- **Zoom**: Mouse scroll
- **Pan**: Right-click + drag
- **Select Surface**: Click any wall or floor

### Step 3: Change Colors
1. Click on any surface (wall or floor)
2. Color picker appears automatically
3. Choose a color from presets or use custom picker
4. Color applies instantly!

## 📦 Component Import

```tsx
import Interactive3DViewer from "@/components/Interactive3DViewer";

<Interactive3DViewer modelUrl="/models/building.glb" />
```

## 🎯 Key Features at a Glance

| Feature | Description | Status |
|---------|-------------|--------|
| Model Loading | Supports OBJ, GLTF, GLB | ✅ |
| Click Selection | Select individual meshes | ✅ |
| Color Customization | Change colors per surface | ✅ |
| Auto Classification | Detects walls vs floors | ✅ |
| Visual Highlight | Yellow outline on selection | ✅ |
| Realistic Lighting | Shadows + reflections | ✅ |
| Camera Controls | Orbit, zoom, pan | ✅ |

## 🎨 How to Use the Color Picker

### Preset Colors
Click any preset color swatch for instant application.

### Custom Colors
1. Click the color spectrum
2. Adjust hue slider
3. Fine-tune with hex input
4. Color updates in real-time

### Reset Colors
Click "Reset All Colors" button in top-right corner.

## 🏗️ Model Requirements

### Supported Formats
- **GLB** (recommended) - Binary GLTF
- **GLTF** - JSON format with external assets
- **OBJ** - With MTL material file

### Naming Convention for Best Results
Structure your model with clear naming:
```
- inner-wall-1, inner-wall-2 (inner walls)
- outer-wall-1, outer-wall-2 (outer walls)  
- floor-1, floor-ground (floors)
```

### Model Guidelines
- ✅ Keep under 100k triangles
- ✅ Use descriptive mesh names
- ✅ Ensure normals face outward
- ✅ Place model at origin (0,0,0)
- ⚠️ Avoid overlapping meshes
- ⚠️ Minimize material count

## 🎓 Common Use Cases

### Architecture Visualization
```tsx
<Interactive3DViewer modelUrl="/models/apartment-plan.glb" />
```

### Interior Design
```tsx
<Interactive3DViewer modelUrl="/models/room-layout.glb" />
```

### Construction Planning
```tsx
<Interactive3DViewer modelUrl="/models/building-structure.glb" />
```

## 🔧 Quick Customization

### Change Light Intensity
Edit `SceneLighting` component:
```typescript
<ambientLight intensity={0.6} /> // Brighter (default: 0.4)
```

### Adjust Camera Distance
Edit `OrbitControls`:
```typescript
<OrbitControls
  minDistance={2}  // Closest zoom
  maxDistance={100} // Furthest zoom
/>
```

### Modify Selection Color
Edit `SelectionHighlight`:
```typescript
color: 0xFF00FF // Purple (default: 0xFFFF00 yellow)
```

## 📱 Controls Reference

### Mouse Controls
| Action | Control |
|--------|---------|
| Rotate | Left-click + drag |
| Pan | Right-click + drag |
| Zoom | Scroll wheel |
| Select | Click surface |

### Keyboard Shortcuts
Currently none (camera controls are mouse-only)

## 🐛 Quick Fixes

### Model Not Showing
1. Check browser console for errors
2. Verify model path: `/models/your-model.glb`
3. Ensure model is in `public/models/` folder
4. Check file permissions

### Colors Not Applying
1. Verify mesh has material
2. Check mesh is visible (not hidden layer)
3. Ensure mesh is classified correctly
4. Try clicking directly on mesh center

### Performance Issues
1. Reduce model complexity
2. Lower shadow quality (edit lighting)
3. Disable environment map
4. Check browser GPU acceleration

### Click Not Working
1. Ensure mesh has geometry
2. Check mesh is not transparent
3. Verify mesh is in scene
4. Try clicking mesh center

## 💡 Pro Tips

1. **Better Classification**: Name your meshes clearly
   - `outer-wall-north`, `inner-wall-kitchen`, `floor-main`

2. **Performance**: Combine similar meshes in 3D software before export

3. **Lighting**: Adjust lights for your specific model scale

4. **Colors**: Use the preset colors for consistency

5. **Export**: Save color configurations (add custom save feature)

## 📊 Performance Metrics

Expected performance on modern hardware:

| Model Size | FPS | Load Time |
|------------|-----|-----------|
| <10k triangles | 60 FPS | <1s |
| 10-50k triangles | 60 FPS | 1-2s |
| 50-100k triangles | 45-60 FPS | 2-5s |
| >100k triangles | 30-45 FPS | 5-10s |

## 🎯 Best Practices

### DO ✅
- Use GLB format for best compression
- Name meshes descriptively
- Keep polygon count reasonable
- Test on target devices
- Use power-of-2 textures

### DON'T ❌
- Don't use huge polygon counts
- Don't overlap meshes
- Don't forget to set normals
- Don't use non-standard coordinate systems
- Don't include unnecessary hidden objects

## 📞 Need Help?

### Common Questions

**Q: Can I use my own models?**
A: Yes! Place GLB files in `public/models/` folder.

**Q: How do I save color changes?**
A: Currently no persistence. Implement save feature with localStorage or backend.

**Q: Can I add more mesh types?**
A: Yes! Modify the `classifyMesh` function.

**Q: Mobile support?**
A: Basic support. Performance varies by device.

**Q: Can I export the colored model?**
A: Not built-in. Would require GLTF export with modified materials.

## 🔗 Related Files

- Component: `src/components/Interactive3DViewer.tsx`
- Demo Page: `src/app/interactive-viewer/page.tsx`
- Full Docs: `INTERACTIVE_VIEWER_README.md`

## 📝 Next Steps

1. Try the demo at `/interactive-viewer`
2. Add your own models to `public/models/`
3. Customize the styling and colors
4. Add save/load functionality
5. Integrate into your app

---

**Ready to build something amazing? Let's go! 🚀**
