# 🏗️ CAD → 3D Walkthrough Application

A comprehensive web application that enables users to upload, view, and manipulate 3D models, panoramic images, and architecturally significant designs. Built with Next.js, React Three Fiber, and Autodesk Forge integration for professional 3D CAD model management and viewing.

## 🌟 Key Features

### 📐 **3D Model Management**
- **CAD File Upload**: Support for RVT, DWG, DXF, OBJ, and other CAD formats
- **Forge Integration**: Professional Autodesk Forge API integration for cloud processing
- **Real-time Conversion**: Automatic translation of CAD models to 3D viewable formats
- **Progress Tracking**: Real-time conversion status with error handling and retry mechanisms

### 🎮 **Interactive 3D Viewing**
- **Advanced 3D Viewer**: Powered by React Three Fiber for smooth 3D rendering
- **Multiple Formats**: Support for GLB, GLTF, and native CAD file viewing
- **Download Support**: Export converted models in various formats (GLTF/GLB)
- **Responsive Controls**: Intuitive mouse and touch navigation

### 🏠 **Floor Plan Editor**
- **Smart Detection**: Automatic architectural element recognition
- **Interactive Floor Plans**: Upload and edit 3D floor plans with material assignments
- **Furniture Placement**: Dynamic furniture library with interactive placement
- **Customization**: Wall colors, furniture positioning, and material adjustments
- **Transform Controls**: Precise position, rotation, and scale adjustments

### 📷 **Panoramic 360° Viewer**
- **Multiple Viewing Modes**: Image grid, interactive panorama, and video viewing
- **Professional Navigation**: Smooth 360° rotation with zoom and tilt controls
- **Multiple Viewing Types**:
  - **PhotoSphereViewer**: Interactive 360° spherical viewing
  - **Multiple Images**: Grid and gallery navigation
  - **Video Mode**: Panoramic video playback
- **Touch Controls**: Full mobile and tablet compatibility

### 🔄 **File Format Conversion**
- **OBJ to GLB**: Bi-directional conversion between OBJ and GLB formats
- **CAD Export**: Export CAD drawings as DWG/DXF formats
- **SVF Processing**: Advanced SVG processing and optimization
- **Batch Processing**: Multiple file conversion capabilities

## 🛠️ Technology Stack

### **Core Framework**
- **Next.js 15.5.2**: React framework with App Router
- **React 19.1.0**: Latest React with server components
- **TypeScript**: Full type safety and development experience

### **3D Rendering & Graphics**
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Helper components for React Three Fiber
- **Three.js**: 3D graphics library
- **PhotoSphereViewer**: Advanced 360° panoramic imagery viewer

### **CAD & File Processing**
- **Autodesk Forge API**: Professional CAD file processing and translation
- **SVF Utils**: Advanced SVF (Streaming Viewer Format) processing
- **JSZip**: ZIP file handling and processing
- **obj2gltf**: OBJ to GLTF conversion utilities

### **UI & Styling**
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Advanced form handling
- **Framer Motion**: Animation library (implicit via Three.js ecosystem)

### **State Management & Utilities**
- **Zustand**: Lightweight state management
- **Axios**: HTTP client for API communication
- **Next Auth**: Authentication framework (v4.x)

## 📦 Package Dependencies

### **Production Dependencies**
```json
{
  "@react-three/drei": "^10.7.4",
  "@react-three/fiber": "^9.3.0",
  "@types/jszip": "^3.4.0",
  "autoprefixer": "^10.4.21",
  "axios": "^1.11.0",
  "jszip": "^3.10.1",
  "next": "15.5.2",
  "next-auth": "^4.24.11",
  "obj2gltf": "^3.1.6",
  "photo-sphere-viewer": "^5.0.0",
  "postcss": "^8.5.6",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "svf-utils": "^7.0.1",
  "three": "^0.179.1",
  "zustand": "^5.0.8"
}
```

### **Development Dependencies**
```json
{
  "@eslint/eslintrc": "^3",
  "@tailwindcss/postcss": "^4",
  "@types/forge-viewer": "^7.99.1",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "15.5.2",
  "tailwindcss": "^4.1.12",
  "typescript": "^5"
}
```

## 🚀 Getting Started

### **Prerequisites**
- **Node.js** 18.0 or later
- **npm** 9.0 or later
- **Autodesk Forge Account** (for CAD file processing)
- Modern browser with WebGL support

### **Installation**

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd 3d-modal
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```bash
   # Autodesk Forge Configuration
   FORGE_CLIENT_ID=your_forge_client_id
   FORGE_CLIENT_SECRET=your_forge_client_secret
   
   # NextAuth Configuration (if using authentication)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Set up Autodesk Forge**
   - Sign up for [Autodesk Forge](https://forge.autodesk.com/en/docs/oauth/v2/tutorials/create-app/)
   - Create a new application
   - Copy your Client ID and Client Secret
   - Add them to your `.env.local` file

### **Running the Application**

#### **Development Mode**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

#### **Production Build**
```bash
npm run build
npm run start
# or
yarn build && yarn start
# or
pnpm build && pnpm start
```

#### **Code Linting**
```bash
npm run lint
# or
yarn lint
# or
pnpm lint
```

## 🎯 Usage Guide

### **Homepage - CAD Model Upload**
- Navigate to `/` for the main upload interface
- Upload CAD files (RVT, DWG, DXF, OBJ, etc.)
- Real-time conversion tracking with progress indicators
- Download converted models in GLTF/GLB formats

### **3D Viewer - Advanced Model Viewing**
- Navigate to `/r3f-viewer` for React Three Fiber-based 3D viewing
- Load models from localStorage or file upload
- Interactive 3D navigation with mouse/touch controls

### **Floor Editor - Interactive Floor Plans**
- Navigate to `/editor` for the floor plan editor
- Upload OBJ/GLB floor plan files
- Place furniture from the built-in library
- Customize wall colors and material assignments
- Save and load your custom layouts

### **Panoramic View - 360° Content Viewing**
- Navigate to `/panoramic-view` for panoramic image/video viewing
- Three viewing modes:
  - **Multiple Images**: Gallery and grid navigation
  - **Interactive Viewer**: 360° spherical viewing
  - **Video Mode**: Panoramic video playback
- Support for JPG, PNG, WebP, and video formats

### **OBJ Converter**
- Navigate to `/obj-to-glb` for file format conversion
- Convert OBJ files to GLB format and vice versa
- Batch conversion support

## 🔧 API Endpoints

### **Core Processing**
- `POST /api/convert` - Start CAD model conversion
- `GET /api/manifest` - Check conversion status
- `GET /api/forge-token` - Get Autodesk Forge access token

### **File Management**
- `POST /api/upload` - File upload endpoint
- `GET /api/download-gltf/[urn]` - Download converted models
- `POST /api/panoramic-upload` - Panoramic content upload

### **Formats Support**
- `POST /api/obj-to-glb` - OBJ to GLB conversion
- `GET /api/furniture` - Furniture models catalog

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── editor/            # Floor plan editor
│   ├── panoramic-view/    # Panoramic viewer
│   └── r3f-viewer/        # 3D model viewer
├── components/            # React components
│   ├── PanoramicViewer.tsx
│   ├── PhotoSphereViewer.tsx
│   └── ui/                # UI components
├── lib/                   # Utility libraries
├── utils/                 # Helper utilities
└── types/                 # TypeScript type definitions

public/
├── models/                # Static 3D models
└── uploads/               # Temporary file storage
```

## 🎮 Interactive Features

### **3D Model Viewer Controls**
- **Mouse Navigation**: Click and drag to rotate
- **Scroll Zoom**: Mouse wheel for zoom in/out
- **Touch Controls**: Touch and drag for mobile devices
- **Hotspot Indicators**: Clickable interaction points

### **Floor Editor Features**
- **Furniture Placement**: Click-and-place furniture on floor plans
- **Transform Controls**: Position, rotate, and scale adjustments
- **Material Library**: Predefined material assignments
- **Layout Persistence**: Save and load custom layouts

### **Panoramic Navigation**
- **360° Rotation**: Full spherical rotation controls
- **Vertical Tilt**: Look up and down within scenes
- **Zoom Control**: Variable field of view adjustments
- **Auto-rotation**: Animation mode for presentations

## 🔒 Security & Authentication

- **NextAuth Integration**: Secure authentication system
- **CORS Protection**: Cross-origin request security
- **File Upload Security**: Secure file handling and validation
- **API Rate Limiting**: Protection against API abuse

## 📱 Device Support

### **Desktop**
- **WebGL Required**: Full 3D graphics support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **High Performance**: Smooth 60fps 3D rendering

### **Mobile & Tablet**
- **Touch Controls**: Full touch navigation support
- **Responsive Design**: Adaptive mobile interfaces
- **Gesture Recognition**: Swipe and pinch gestures
- **Location Services**: Panoramic GPS integration

## 🔍 Browser Requirements

### **Minimum Requirements**
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

### **Required Features**
- **WebGL 2.0**: Hardware-accelerated 3D graphics
- **ES6 Support**: Modern JavaScript features
- **File API**: File upload and processing support

## 📈 Performance Optimization

### **3D Rendering**
- **LOD Systems**: Level-of-detail management for large models
- **Texture Compression**: Automated format optimization
- **Geometry Caching**: Intelligent model caching
- **Memory Management**: Efficient resource handling

### **File Processing**
- **Progressive Loading**: Incremental file processing
- **Background Workers**: Non-blocking operations
- **Compression**: Automated file size optimization
- **Caching**: Intelligent content caching

## 🐛 Troubleshooting

### **Common Issues**

#### **"Converting your file..." Error Messages**
- Check Autodesk Forge credentials
- Verify file format compatibility
- Ensure stable internet connection

#### **3D Viewer Not Loading**
- Verify WebGL support in browser
- Check for driver compatibility
- Clear browser cache and cookies

#### **Panoramic View Issues**
- Verify image format (equirectangular recommended)
- Check file size limits (max ~50MB recommended)
- Ensure proper CORS configuration

### **Debug Mode**
Enable debug logging by adding to your environment:
```bash
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
```

## 🚀 Deployment

### **Vercel Deployment (Recommended)**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Environment Variables for Production**
```bash
# Required
FORGE_CLIENT_ID=your_forge_client_id
FORGE_CLIENT_SECRET=your_forge_client_secret

# Optional
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=production_secret
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit changes: `git commit -m "Add feature-name"`
6. Push to branch: `git push origin feature-name`
7. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Autodesk Forge** - CAD file processing infrastructure
- **React Three Fiber** - 3D rendering capabilities
- **Three.js** - Core 3D graphics library
- **PhotoSphereViewer** - 360° panoramic viewing
- **Next.js** - Modern React framework

## 🔗 External Links

- [Autodesk Forge API Documentation](https://forge.autodesk.com/en/docs/)
- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber/)
- [PhotoSphereViewer Documentation](https://photo-sphere-viewer.dev/)
- [Three.js Documentation](https://threejs.org/docs/)

---

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the external documentation links

---

**Built with 🛠️ by developers for the construction and architecture industry.**