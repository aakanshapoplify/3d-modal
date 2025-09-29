"use client";
import { useEffect, useRef, useState } from "react";

interface PhotoSphereViewerProps {
  src: string;
  containerId?: string;
}

export default function PhotoSphereViewer({ src, containerId = "photo-sphere-container" }: PhotoSphereViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);

  // Check if PhotoSphereViewer library is loaded
  useEffect(() => {
    const checkLibrary = () => {
      if (typeof window !== 'undefined' && (window as any).PhotoSphereViewer) {
        setLibraryLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkLibrary()) {
      return;
    }

    // If not loaded, wait for it with polling
    const interval = setInterval(() => {
      if (checkLibrary()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!checkLibrary()) {
        console.warn('PhotoSphereViewer library failed to load from CDN');
        setHasError(true);
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!libraryLoaded || !src) return;

    const initViewer = async () => {
      try {
        if (containerRef.current) {
          setIsLoading(true);
          setHasError(false);

          // Destroy existing viewer if it exists
          if (viewerRef.current) {
            viewerRef.current.destroy();
            viewerRef.current = null;
          }

          // Wait a bit for the container to be ready
          await new Promise(resolve => setTimeout(resolve, 100));

          const PhotoSphereViewer = (window as any).PhotoSphereViewer;
          
          // Create new viewer with simplified configuration
          viewerRef.current = new PhotoSphereViewer.Viewer({
            container: containerRef.current,
            panorama: src,
            caption: 'Panoramic View',
            navbar: [
              'autorotate',
              'zoom',
              'fullscreen',
              'download'
            ],
            defaultZoomLvl: 0,
            maxZoomLvl: 3,
            mousewheel: true,
            mousemove: true,
            keyboard: true,
            moveSpeed: 1,
            zoomSpeed: 1
          });

          // Handle viewer events
          viewerRef.current.addEventListener('ready', () => {
            console.log('PhotoSphereViewer is ready');
            setIsLoading(false);
          });

          viewerRef.current.addEventListener('error', (error: any) => {
            console.error('PhotoSphereViewer error:', error);
            setHasError(true);
            setIsLoading(false);
          });
        }
      } catch (error) {
        console.error('Failed to initialize PhotoSphereViewer:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    initViewer();

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying PhotoSphereViewer:', error);
        }
        viewerRef.current = null;
      }
    };
  }, [src, containerId, libraryLoaded]);

  // Fallback viewer when PhotoSphereViewer is not available
  if (hasError || !libraryLoaded) {
    return (
      <div className="w-full h-full">
        <div className="w-full h-[600px] rounded-lg shadow-lg bg-gray-100 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasError ? 'Failed to load PhotoSphereViewer' : 'Loading PhotoSphereViewer...'}
            </h3>
            <p className="text-gray-600 mb-4">
              {hasError 
                ? 'The PhotoSphereViewer library failed to load. Showing fallback viewer.'
                : 'Please wait while the viewer loads...'
              }
            </p>
            <div className="relative">
              <img
                src={src}
                alt="Panoramic image (fallback viewer)"
                className="w-full h-96 object-cover rounded-lg shadow-md"
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="bg-white bg-opacity-90 px-4 py-2 rounded">
                  <span className="text-gray-700 font-medium">Fallback Image Viewer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div 
        ref={containerRef}
        id={containerId}
        className="w-full h-[600px] rounded-lg shadow-lg relative"
        style={{ minHeight: '400px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading panoramic viewer...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add PhotoSphereViewer types to global window object
declare global {
  interface Window {
    PhotoSphereViewer: any;
  }
}
