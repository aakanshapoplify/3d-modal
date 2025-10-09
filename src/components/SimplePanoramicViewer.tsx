"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface SimplePanoramicViewerProps {
  src: string;
}

export default function SimplePanoramicViewer({ src }: SimplePanoramicViewerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (isAutoRotating) {
      autoRotateRef.current = setInterval(() => {
        setRotation(prev => (prev + 0.5) % 360);
      }, 50);
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
    setRotation(prev => (prev + deltaX * 0.5) % 360);
    
    // Vertical tilt (limited range)
    setTilt(prev => Math.max(-30, Math.min(30, prev - deltaY * 0.3)));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(5, prev * delta)));
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
    
    setRotation(prev => (prev + deltaX * 0.5) % 360);
    setTilt(prev => Math.max(-30, Math.min(30, prev - deltaY * 0.3)));
    
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isDragging, lastMousePos]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setRotation(0);
    setTilt(0);
    setZoom(1);
    setIsAutoRotating(false);
  }, []);

  return (
    <div className="w-full h-full">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
        <p className="text-blue-800 mb-2">
          <strong>Enhanced Panoramic Viewer:</strong> Full 360° interactive viewer
        </p>
        <p className="text-sm text-blue-600">
          Drag to rotate 360° horizontally and tilt vertically. Scroll to zoom. Touch-friendly for mobile devices.
        </p>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)',
            perspective: '1000px'
          }}
        >
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ 
              transform: `perspective(1000px) rotateY(${rotation}deg) rotateX(${tilt}deg) scale(${zoom})`,
              transformStyle: 'preserve-3d',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <img
              src={src}
              alt="Panoramic image"
              className="h-full object-cover"
              draggable={false}
              style={{ 
                width: 'auto',
                minWidth: '200%',
                height: '100%',
                transform: 'translateZ(0)',
                imageRendering: 'auto'
              }}
            />
          </div>
          
          {/* Crosshair for center reference */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-white border-opacity-50 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Control panel */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 space-y-2">
          {/* Zoom controls */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.3, prev * 0.8))}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
              </svg>
            </button>
          </div>
          
          {/* Auto-rotate toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1 rounded transition-colors ${
              isAutoRotating 
                ? 'bg-blue-600 text-white' 
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
        
        {/* Status overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm space-y-1">
          <div>Zoom: {Math.round(zoom * 100)}%</div>
          <div>Rotation: {Math.round(rotation)}°</div>
          <div>Tilt: {Math.round(tilt)}°</div>
          {isAutoRotating && <div className="text-blue-400">🔄 Auto-rotating</div>}
        </div>
        
        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs max-w-xs">
          <div className="space-y-1">
            <div>🖱️ <strong>Mouse:</strong> Drag to rotate & tilt</div>
            <div>📱 <strong>Touch:</strong> Swipe to navigate</div>
            <div>🎯 <strong>Wheel:</strong> Zoom in/out</div>
            <div>🔄 <strong>Auto:</strong> Toggle auto-rotation</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 bg-gray-100 p-3 rounded-lg">
        <p className="text-sm text-gray-600">
          💡 <strong>Enhanced Viewer:</strong> This panoramic viewer now supports full 360° rotation, vertical tilting, smooth zooming, and auto-rotation for an immersive experience.
        </p>
      </div>
    </div>
  );
}
