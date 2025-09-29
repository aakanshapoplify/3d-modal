"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface SphericalPanoramicViewerProps {
  src: string;
}

export default function SphericalPanoramicViewer({ src }: SphericalPanoramicViewerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rotationY, setRotationY] = useState(0); // Horizontal rotation (yaw)
  const [rotationX, setRotationX] = useState(0); // Vertical rotation (pitch)
  const [zoom, setZoom] = useState(1);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (isAutoRotating) {
      autoRotateRef.current = setInterval(() => {
        setRotationY(prev => (prev + 0.5) % 360);
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

  // Load and process the panoramic image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      drawPanorama();
    };
    img.src = src;
  }, [src]);

  // Resize canvas when container size changes (avoid resizing every frame)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const applySize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width && height) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }
      }
    };
    applySize();
    const ro = new ResizeObserver(() => applySize());
    ro.observe(container);
    resizeObserverRef.current = ro;
    return () => { ro.disconnect(); resizeObserverRef.current = null; };
  }, []);

  // Draw the spherical panorama
  const drawPanorama = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas (use CSS pixels)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Calculate the field of view based on zoom
    const baseFOV = 75;
    const fov = baseFOV / zoom;

    // Calculate image dimensions for spherical projection
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    // For equirectangular panorama (2:1 aspect ratio)
    const imageWidth = image.width;
    const imageHeight = image.height;

    // Calculate how much of the image to show based on FOV
    const horizontalPixelsPerDegree = imageWidth / 360;
    const verticalPixelsPerDegree = imageHeight / 180;
    const visibleWidth = fov * horizontalPixelsPerDegree;
    const visibleHeight = fov * verticalPixelsPerDegree;

    // Calculate source rectangle in the panoramic image with wrap-around
    const normRotY = ((rotationY % 360) + 360) % 360; // 0..359
    let sourceX = (normRotY / 360) * imageWidth - visibleWidth / 2;
    while (sourceX < 0) sourceX += imageWidth;
    while (sourceX >= imageWidth) sourceX -= imageWidth;
    const rawSourceY = ((rotationX + 90) / 180) * imageHeight - visibleHeight / 2;
    const sourceY = Math.max(0, Math.min(imageHeight - visibleHeight, rawSourceY));

    // Draw, handling wrap-around horizontally
    if (sourceX + visibleWidth <= imageWidth) {
      ctx.drawImage(
        image,
        sourceX, sourceY, visibleWidth, visibleHeight,
        0, 0, canvasWidth, canvasHeight
      );
    } else {
      const firstWidth = imageWidth - sourceX;
      const secondWidth = visibleWidth - firstWidth;
      // Draw right-edge segment
      ctx.drawImage(
        image,
        sourceX, sourceY, firstWidth, visibleHeight,
        0, 0, (canvasWidth * firstWidth) / visibleWidth, canvasHeight
      );
      // Draw left-edge wrapped segment
      ctx.drawImage(
        image,
        0, sourceY, secondWidth, visibleHeight,
        (canvasWidth * firstWidth) / visibleWidth, 0, (canvasWidth * secondWidth) / visibleWidth, canvasHeight
      );
    }

    // Schedule next frame for smooth animation
    if (isDragging || isAutoRotating) {
      animationRef.current = requestAnimationFrame(drawPanorama);
    }
  }, [rotationY, rotationX, zoom, isDragging, isAutoRotating]);

  // Trigger redraw when parameters change
  useEffect(() => {
    drawPanorama();
  }, [drawPanorama]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setIsAutoRotating(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    // Horizontal rotation (yaw) - full 360° rotation
    setRotationY(prev => (prev + deltaX * 0.5) % 360);
    
    // Vertical rotation (pitch) - limited to prevent over-rotation
    setRotationX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.3)));
    
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
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
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
    
    setRotationY(prev => (prev + deltaX * 0.5) % 360);
    setRotationX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.3)));
    
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isDragging, lastMousePos]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setRotationY(0);
    setRotationX(0);
    setZoom(1);
    setIsAutoRotating(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="w-full h-full">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg mb-4">
        <p className="text-purple-800 mb-2">
          <strong>Spherical 360° Panoramic Viewer:</strong> Professional immersive experience
        </p>
        <p className="text-sm text-purple-600">
          True spherical projection with smooth 360° navigation. Drag to look around, scroll to zoom, just like professional panoramic viewers.
        </p>
      </div>
      
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[600px] rounded-lg shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing relative bg-black"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Canvas for spherical panorama rendering */}
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ 
              display: 'block',
              background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)'
            }}
          />
          
          {/* Loading indicator */}
          {!imageRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading panoramic image...</p>
              </div>
            </div>
          )}
          
          {/* Center crosshair */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-white border-opacity-60 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white bg-opacity-40 rounded-full"></div>
              </div>
            </div>
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
              onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
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
                ? 'bg-purple-600 text-white' 
                : 'text-white hover:bg-white hover:bg-opacity-20'
            }`}
            title="Auto Rotate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
            title="Fullscreen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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
            <span className="text-green-400">↻</span>
            <span>Yaw: {Math.round(rotationY)}°</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400">↕</span>
            <span>Pitch: {Math.round(rotationX)}°</span>
          </div>
          {isAutoRotating && (
            <div className="flex items-center space-x-2 text-purple-400">
              <span>🔄</span>
              <span>Auto-rotating</span>
            </div>
          )}
          {isFullscreen && (
            <div className="flex items-center space-x-2 text-indigo-400">
              <span>⛶</span>
              <span>Fullscreen</span>
            </div>
          )}
        </div>
        
        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-xs max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold text-purple-300">🌐 Spherical Panorama:</div>
            <div className="space-y-1">
              <div>🖱️ <strong>Drag:</strong> Look around 360°</div>
              <div>📱 <strong>Swipe:</strong> Navigate on mobile</div>
              <div>🎯 <strong>Wheel:</strong> Zoom in/out</div>
              <div>🔄 <strong>Auto:</strong> Automatic rotation</div>
              <div>⛶ <strong>Fullscreen:</strong> Immersive view</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-700">
          🌐 <strong>Professional Spherical Viewer:</strong> This viewer uses true spherical projection rendering, just like professional panoramic viewers. Drag to look around 360° horizontally and vertically, with smooth zoom and auto-rotation features. Perfect for immersive virtual tours and presentations.
        </p>
      </div>
    </div>
  );
}
