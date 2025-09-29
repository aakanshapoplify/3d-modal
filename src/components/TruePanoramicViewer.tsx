"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface TruePanoramicViewerProps {
  src: string;
}

export default function TruePanoramicViewer({ src }: TruePanoramicViewerProps) {
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
        setRotation(prev => (prev + 0.2) % 360);
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

  const rafGuard = useRef<number | null>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    if (rafGuard.current != null) return;
    rafGuard.current = requestAnimationFrame(() => {
      rafGuard.current = null;
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      setRotation(prev => (prev + deltaX * 0.3) % 360);
      setTilt(prev => Math.max(-45, Math.min(45, prev - deltaY * 0.2)));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    });
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
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
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
    
    setRotation(prev => (prev + deltaX * 0.3) % 360);
    setTilt(prev => Math.max(-45, Math.min(45, prev - deltaY * 0.2)));
    
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

  // Calculate the horizontal position of the panoramic image
  const getImageTransform = () => {
    const container = containerRef.current;
    const containerWidth = container?.clientWidth || 800;
    const imageWidth = Math.max(containerWidth * 3, 1600); // 3x container for smoother pan, min 1600
    const normRotation = ((rotation % 360) + 360) % 360;
    const translationX = (normRotation / 360) * imageWidth - (imageWidth - containerWidth) / 2;
    return {
      transform: `translateX(${translationX}px) translateY(${tilt * 2}px) scale(${zoom})`,
      transition: isDragging ? 'none' : 'transform 0.16s ease-out'
    };
  };

  return (
    <div className="w-full h-full">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded-lg mb-4">
        <p className="text-green-800 mb-2">
          <strong>True 360° Panoramic Tour:</strong> Authentic panoramic viewing experience
        </p>
        <p className="text-sm text-green-600">
          Look around the panoramic image as if you're inside it. Drag to look left/right/up/down, scroll to zoom.
        </p>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[600px] rounded-lg shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            position: 'relative'
          }}
        >
          {/* Panoramic Image Container */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={getImageTransform()}
          >
            <img
              src={src}
              alt="Panoramic image"
              className="h-full"
              draggable={false}
              style={{ 
                width: '1600px', // Wide panoramic image
                height: '100%',
                objectFit: 'cover',
                imageRendering: 'high-quality',
                filter: 'contrast(1.05) saturate(1.1)',
                display: 'block',
                minWidth: '1600px',
                willChange: 'transform'
              }}
            />
          </div>
          
          {/* Center crosshair for reference */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-white border-opacity-70 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white bg-opacity-50 rounded-full"></div>
                {/* Direction indicators */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-white bg-opacity-50 rounded-full"></div>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-white bg-opacity-50 rounded-full"></div>
                <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-1 bg-white bg-opacity-50 rounded-full"></div>
                <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-1 bg-white bg-opacity-50 rounded-full"></div>
              </div>
            </div>
          </div>
          
          {/* Subtle grid overlay for depth */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
        </div>
        
        {/* Control panel */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-80 rounded-lg p-3 space-y-2">
          {/* Zoom controls */}
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.3, prev * 0.8))}
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
        
        {/* Status overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">🔍</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400">👁️</span>
            <span>Looking: {Math.round(rotation)}°</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400">↕</span>
            <span>Tilt: {Math.round(tilt)}°</span>
          </div>
          {isAutoRotating && (
            <div className="flex items-center space-x-2 text-green-400">
              <span>🔄</span>
              <span>Auto-tour</span>
            </div>
          )}
        </div>
        
        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-xs max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold text-green-300">🎯 True 360° Tour:</div>
            <div className="space-y-1">
              <div>🖱️ <strong>Drag:</strong> Look around 360°</div>
              <div>📱 <strong>Swipe:</strong> Navigate on mobile</div>
              <div>🎯 <strong>Wheel:</strong> Zoom in/out</div>
              <div>🔄 <strong>Auto:</strong> Automatic tour</div>
              <div>↩️ <strong>Reset:</strong> Return to start</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg border border-green-200">
        <p className="text-sm text-green-700">
          🎯 <strong>True Panoramic Experience:</strong> This viewer simulates being inside the panoramic image. Drag to look around 360° as if you're standing in the center of the scene. Perfect for virtual tours and immersive viewing.
        </p>
      </div>
    </div>
  );
}
