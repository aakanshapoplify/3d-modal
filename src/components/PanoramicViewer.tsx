"use client";
import { useEffect, useRef, useState } from "react";
import PhotoSphereViewer from "./PhotoSphereViewer";
import MultipleImageViewer from "./MultipleImageViewer";
import SimplePanoramicViewer from "./SimplePanoramicViewer";
import AdvancedPanoramicViewer from "./AdvancedPanoramicViewer";
import TruePanoramicViewer from "./TruePanoramicViewer";
import SphericalPanoramicViewer from "./SphericalPanoramicViewer";

type PanoramicType = "images" | "photo-sphere" | "video";

interface PanoramicViewerProps {
  type: PanoramicType;
  files: File[];
}

export default function PanoramicViewer({ type, files }: PanoramicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Create object URLs for files
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setImageUrls(urls);

    // Cleanup function
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const renderMultipleImages = () => {
    if (imageUrls.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-green-800 mb-2">
            <strong>Multiple Images:</strong> Browse through your panoramic image collection
          </p>
          <p className="text-sm text-green-600">
            Switch between single view and grid view modes for different browsing experiences.
          </p>
        </div>
        
        <MultipleImageViewer imageUrls={imageUrls} />
      </div>
    );
  };

  const renderPhotoSphereViewer = () => {
    if (imageUrls.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-blue-800 mb-2">
            <strong>Spherical 360° Panoramic Viewer:</strong> Professional immersive experience
          </p>
          <p className="text-sm text-blue-600">
            True spherical projection with smooth 360° navigation. Drag to look around, scroll to zoom, just like professional panoramic viewers like RenderStuff.
          </p>
        </div>
        
        <SphericalPanoramicViewer src={imageUrls[0]} />
        
        <div className="bg-gray-100 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Professional Spherical Viewer:</strong> This viewer uses true spherical projection rendering, just like professional panoramic viewers. Drag to look around 360° horizontally and vertically, with smooth zoom and auto-rotation features. Perfect for immersive virtual tours and presentations.
          </p>
        </div>
      </div>
    );
  };

  const renderVideoViewer = () => {
    if (files.length === 0) return null;

    const videoUrl = URL.createObjectURL(files[0]);

    return (
      <div className="space-y-4">
        <div className="relative">
          <video
            src={videoUrl}
            controls
            className="w-full h-96 object-cover rounded-lg shadow-lg"
            onLoadStart={() => URL.revokeObjectURL(videoUrl)}
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
            Panoramic Video
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-gray-600">
            Video controls are available above. This supports panoramic video playback.
          </p>
        </div>
      </div>
    );
  };

  const renderViewer = () => {
    switch (type) {
      case "images":
        return renderMultipleImages();
      case "photo-sphere":
        return renderPhotoSphereViewer();
      case "video":
        return renderVideoViewer();
      default:
        return <p>Select a panoramic type to view content.</p>;
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      {files.length > 0 ? (
        renderViewer()
      ) : (
        <div className="text-center py-8 text-gray-500">
          No files uploaded yet. Please upload files to view the panoramic content.
        </div>
      )}
    </div>
  );
}
