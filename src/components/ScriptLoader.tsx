"use client";
import { useEffect } from "react";

export default function ScriptLoader() {
  useEffect(() => {
    // Check if PhotoSphereViewer is already loaded
    if (typeof window !== 'undefined' && (window as any).PhotoSphereViewer) {
      console.log('PhotoSphereViewer already loaded');
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/photo-sphere-viewer@5.0.0/dist/photo-sphere-viewer.js';
    script.async = true;
    
    script.onload = () => {
      console.log('PhotoSphereViewer script loaded successfully');
    };
    
    script.onerror = () => {
      console.error('Failed to load PhotoSphereViewer script');
    };

    // Add script to document head
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}
