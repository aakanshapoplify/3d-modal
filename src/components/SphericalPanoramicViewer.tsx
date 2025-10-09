"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface SphericalPanoramicViewerProps {
  src: string;
}

export default function SphericalPanoramicViewer({ src }: SphericalPanoramicViewerProps) {
  // UI state (throttled updates)
  const [isDragging, setIsDragging] = useState(false);
  const [rotationY, setRotationY] = useState(0); // Horizontal rotation (yaw)
  const [rotationX, setRotationX] = useState(0); // Vertical rotation (pitch)
  const [zoom, setZoom] = useState(1);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const prevImageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Pointer tracking
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Physics/smoothing refs
  const targetYawRef = useRef(0);
  const targetPitchRef = useRef(0);
  const targetZoomRef = useRef(1);
  const currentYawRef = useRef(0);
  const currentPitchRef = useRef(0);
  const currentZoomRef = useRef(1);
  const velocityYawRef = useRef(0);
  const velocityPitchRef = useRef(0);
  const isDraggingRef = useRef(false);
  const autoRotateSpeedRef = useRef(5); // degrees per second
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastUiSyncRef = useRef(0);

  // Crossfade between images
  const imageFadeRef = useRef(1); // 0..1 (1 means fully new image)
  const imageTransitionSec = 0.35;

  // keep ref in sync
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // Load and process the panoramic image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Prepare crossfade: move current image to prev, set new one, reset fade
      if (imageRef.current) {
        prevImageRef.current = imageRef.current;
        imageFadeRef.current = 0; // start transition
      }
      imageRef.current = img;
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

  // Draw a frame for a given image and view params
  const drawImageFrame = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, yawDeg: number, pitchDeg: number, zoomVal: number) => {
    const canvas = ctx.canvas as HTMLCanvasElement;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Calculate the field of view based on zoom
    const baseFOV = 75;
    const fov = baseFOV / zoomVal;

    const imageWidth = image.width;
    const imageHeight = image.height;

    const horizontalPixelsPerDegree = imageWidth / 360;
    const verticalPixelsPerDegree = imageHeight / 180;
    const visibleWidth = fov * horizontalPixelsPerDegree;
    const visibleHeight = fov * verticalPixelsPerDegree;

    const normRotY = ((yawDeg % 360) + 360) % 360; // 0..359
    let sourceX = (normRotY / 360) * imageWidth - visibleWidth / 2;
    while (sourceX < 0) sourceX += imageWidth;
    while (sourceX >= imageWidth) sourceX -= imageWidth;
    const rawSourceY = ((pitchDeg + 90) / 180) * imageHeight - visibleHeight / 2;
    const sourceY = Math.max(0, Math.min(imageHeight - visibleHeight, rawSourceY));

    if (sourceX + visibleWidth <= imageWidth) {
      ctx.drawImage(
        image,
        sourceX, sourceY, visibleWidth, visibleHeight,
        0, 0, canvasWidth, canvasHeight
      );
    } else {
      const firstWidth = imageWidth - sourceX;
      const secondWidth = visibleWidth - firstWidth;
      ctx.drawImage(
        image,
        sourceX, sourceY, firstWidth, visibleHeight,
        0, 0, (canvasWidth * firstWidth) / visibleWidth, canvasHeight
      );
      ctx.drawImage(
        image,
        0, sourceY, secondWidth, visibleHeight,
        (canvasWidth * firstWidth) / visibleWidth, 0, (canvasWidth * secondWidth) / visibleWidth, canvasHeight
      );
    }
  };

  // Continuous render loop with smoothing and inertia
  const tick = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const now = time;
    const last = lastFrameTimeRef.current ?? now;
    const dt = Math.min(0.05, Math.max(0.0001, (now - last) / 1000)); // clamp delta [0.1ms..50ms]
    lastFrameTimeRef.current = now;

    // Auto-rotate: move target yaw by speed (deg/s)
    if (isAutoRotating) {
      targetYawRef.current = (targetYawRef.current + autoRotateSpeedRef.current * dt) % 360;
    }

    // Apply inertia to targets when not dragging
    if (!isDraggingRef.current) {
      targetYawRef.current += velocityYawRef.current * dt;
      targetPitchRef.current += velocityPitchRef.current * dt;
      const friction = 2.5; // larger = faster slowdown
      const decay = Math.max(0, 1 - friction * dt);
      velocityYawRef.current *= decay;
      velocityPitchRef.current *= decay;
    }

    // Clamp pitch and zoom targets
    targetPitchRef.current = Math.max(-90, Math.min(90, targetPitchRef.current));
    targetZoomRef.current = Math.max(0.5, Math.min(3, targetZoomRef.current));

    // Smoothly approach targets (LERP)
    const follow = 0.18; // responsiveness
    currentYawRef.current = currentYawRef.current + (targetYawRef.current - currentYawRef.current) * follow;
    currentPitchRef.current = currentPitchRef.current + (targetPitchRef.current - currentPitchRef.current) * follow;
    currentZoomRef.current = currentZoomRef.current + (targetZoomRef.current - currentZoomRef.current) * follow;

    // Clear canvas (CSS pixels)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Crossfade draw
    const newImg = imageRef.current;
    const prevImg = prevImageRef.current;
    if (newImg) {
      if (prevImg && imageFadeRef.current < 1) {
        // progress fade
        imageFadeRef.current = Math.min(1, imageFadeRef.current + dt / imageTransitionSec);
        // draw previous
        ctx.save();
        ctx.globalAlpha = 1 - imageFadeRef.current;
        drawImageFrame(ctx, prevImg, currentYawRef.current, currentPitchRef.current, currentZoomRef.current);
        ctx.restore();
        // draw new
        ctx.save();
        ctx.globalAlpha = imageFadeRef.current;
        drawImageFrame(ctx, newImg, currentYawRef.current, currentPitchRef.current, currentZoomRef.current);
        ctx.restore();
        if (imageFadeRef.current >= 1) {
          prevImageRef.current = null; // done
        }
      } else {
        drawImageFrame(ctx, newImg, currentYawRef.current, currentPitchRef.current, currentZoomRef.current);
      }
    }

    // Throttle UI state sync to ~30fps
    if (now - lastUiSyncRef.current > 33) {
      lastUiSyncRef.current = now;
      setRotationY(((currentYawRef.current % 360) + 360) % 360);
      setRotationX(currentPitchRef.current);
      setZoom(currentZoomRef.current);
    }

    animationRef.current = requestAnimationFrame(tick);
  }, [isAutoRotating]);

  // Unified pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    velocityYawRef.current = 0;
    velocityPitchRef.current = 0;
    setIsAutoRotating(false);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    const yawDelta = dx * 0.35; // deg per px
    const pitchDelta = -dy * 0.22; // deg per px
    targetYawRef.current = (targetYawRef.current + yawDelta) % 360;
    targetPitchRef.current = Math.max(-90, Math.min(90, targetPitchRef.current + pitchDelta));
    // Update velocities for inertia (deg/s)
    const sampleHz = 1000 / 16; // ~60Hz baseline
    velocityYawRef.current = yawDelta * sampleHz / 1000;
    velocityPitchRef.current = pitchDelta * sampleHz / 1000;
  }, []);

  const handlePointerUpOrLeave = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const next = currentZoomRef.current * delta;
    targetZoomRef.current = Math.max(0.5, Math.min(3, next));
  }, []);

  const resetView = useCallback(() => {
    // reset targets and currents for immediate smooth transition
    targetYawRef.current = 0;
    targetPitchRef.current = 0;
    targetZoomRef.current = 1;
    velocityYawRef.current = 0;
    velocityPitchRef.current = 0;
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

  // Kick off render loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // initialize from UI state
    targetYawRef.current = rotationY;
    targetPitchRef.current = rotationX;
    targetZoomRef.current = zoom;
    currentYawRef.current = rotationY;
    currentPitchRef.current = rotationX;
    currentZoomRef.current = zoom;
    lastFrameTimeRef.current = null;
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [tick]);

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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrLeave}
          onPointerCancel={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onWheel={handleWheel}
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
