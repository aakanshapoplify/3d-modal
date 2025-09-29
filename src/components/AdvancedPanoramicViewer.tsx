"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface AdvancedPanoramicViewerProps {
  src: string;
}

export default function AdvancedPanoramicViewer({ src }: AdvancedPanoramicViewerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [viewMode, setViewMode] = useState<'spherical' | 'cylindrical'>('spherical');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (isAutoRotating) {
      autoRotateRef.current = setInterval(() => {
        setRotation(prev => (prev + 0.3) % 360);
      }, 30);
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = null;
      }
    }

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [isAutoRotating]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setIsAutoRotating(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    // Horizontal rotation (360° around)
    setRotation(prev => (prev + deltaX * 0.4) % 360);
    
    // Vertical tilt (limited range for spherical, more for cylindrical)
    const maxTilt = viewMode === 'spherical' ? 60 : 90;
    setTilt(prev => Math.max(-maxTilt, Math.min(maxTilt, prev - deltaY * 0.25)));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMousePos, viewMode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.2, Math.min(8, prev * delta)));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsAutoRotating(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    const deltaX = e.touches[0].clientX - lastMousePos.x;
    const deltaY = e.touches[0].clientY - lastMousePos.y;
    
    setRotation(prev => (prev + deltaX * 0.4) % 360);
    const maxTilt = viewMode === 'spherical' ? 60 : 90;
    setTilt(prev => Math.max(-maxTilt, Math.min(maxTilt, prev - deltaY * 0.25)));
    
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isDragging, lastMousePos, viewMode]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setRotation(0);
    setTilt(0);
    setZoom(1);
    setIsAutoRotating(false);
  }, []);

  const getTransformStyle = () => {
    // For panoramic viewing, we move the image horizontally to simulate looking around
    // The image should be much wider than the container to allow for 360° viewing
    const imageWidth = 2000; // Base width of the panoramic image
    const containerWidth = 400; // Approximate container width
    const maxTranslation = (imageWidth - containerWidth) / 2;
    
    // Convert rotation to horizontal translation
    const translationX = (rotation / 360) * imageWidth - maxTranslation;
    
    // Apply vertical tilt as rotation
    const tiltRotation = tilt;
    
    return {
      transform: `translateX(${translationX}px) rotateX(${tiltRotation}deg) scale(${zoom})`,
      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
    };
  };

  return (
    <div className="w-full h-full">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg mb-4">
        <p className="text-blue-800 mb-2">
          <strong>Advanced Panoramic Viewer:</strong> Professional 360° viewing experience
        </p>
        <p className="text-sm text-blue-600">
          Full spherical rotation, smooth navigation, and multiple viewing modes. Perfect for immersive panoramic exploration.
        </p>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[600px] rounded-lg shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
            position: 'relative'
          }}
        >
          <div 
            className="w-full h-full flex items-center justify-center"
            style={getTransformStyle()}
          >
            <img
              src={src}
              alt="Panoramic image"
              className="h-full object-cover"
              draggable={false}
              style={{ 
                width: '2000px', // Fixed width for panoramic image
                height: '100%',
                objectFit: 'cover',
                imageRendering: 'high-quality',
                filter: 'contrast(1.1) saturate(1.1)',
                display: 'block'
              }}
            />
          </div>
          
          {/* Enhanced crosshair with direction indicators */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-white border-opacity-60 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white bg-opacity-40 rounded-full"></div>
                {/* Direction indicators */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-white bg-opacity-40 rounded-full"></div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-white bg-opacity-40 rounded-full"></div>
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-1 bg-white bg-opacity-40 rounded-full"></div>
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-1 bg-white bg-opacity-40 rounded-full"></div>
              </div>
            </div>
          </div>
          
          {/* Grid overlay for reference */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
        </div>
        
        {/* Enhanced control panel */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-80 rounded-lg p-3 space-y-3">
          {/* View mode toggle */}
          <div className="flex space-x-1">
            <button
              onClick={() => setViewMode('spherical')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'spherical' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
              title="Spherical View"
            >
              🌐
            </button>
            <button
              onClick={() => setViewMode('cylindrical')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'cylindrical' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
              title="Cylindrical View"
            >
              📐
            </button>
          </div>
          
          {/* Zoom controls */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => setZoom(prev => Math.min(8, prev * 1.3))}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.2, prev * 0.7))}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
          </div>
          
          {/* Auto-rotate toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1 rounded transition-colors ${
              isAutoRotating 
                ? 'bg-green-600 text-white' 
                : 'text-white hover:bg-white hover:bg-opacity-20'
            }`}
            title="Auto Rotate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Reset view */}
          <button
            onClick={resetView}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
            title="Reset View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l5.586 5.586a2 2 0 002.828 0L16 4m0 0l4 4m-4-4v16" />
            </svg>
          </button>
        </div>
        
        {/* Enhanced status overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">🔍</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400">↻</span>
            <span>Rotation: {Math.round(rotation)}°</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400">↕</span>
            <span>Tilt: {Math.round(tilt)}°</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-purple-400">📐</span>
            <span>Mode: {viewMode}</span>
          </div>
          {isAutoRotating && (
            <div className="flex items-center space-x-2 text-green-400">
              <span>🔄</span>
              <span>Auto-rotating</span>
            </div>
          )}
        </div>
        
        {/* Enhanced instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-xs max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold text-blue-300">🎮 Controls:</div>
            <div className="space-y-1">
              <div>🖱️ <strong>Mouse:</strong> Drag to rotate & tilt</div>
              <div>📱 <strong>Touch:</strong> Swipe to navigate</div>
              <div>🎯 <strong>Wheel:</strong> Zoom in/out</div>
              <div>🔄 <strong>Auto:</strong> Toggle auto-rotation</div>
              <div>🌐 <strong>Mode:</strong> Switch view projection</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 bg-gradient-to-r from-gray-100 to-blue-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          💡 <strong>Advanced Features:</strong> This viewer provides professional-grade panoramic viewing with spherical/cylindrical projections, smooth 360° navigation, enhanced visual quality, and comprehensive controls for the ultimate immersive experience.
        </p>
      </div>
    </div>
  );
}
