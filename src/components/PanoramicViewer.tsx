"use client";
import { useEffect, useState } from "react";
import MultipleImageViewer from "./MultipleImageViewer";
import SphericalPanoramicViewer from "./SphericalPanoramicViewer";

type PanoramicType = "images" | "photo-sphere" | "video";

interface PanoramicViewerProps {
  type: PanoramicType;
  files: File[];
}

export default function PanoramicViewer({ type, files }: PanoramicViewerProps) {
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
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-emerald-900/10 border border-emerald-500/20 p-4 rounded-lg">
          <p className="text-gray-200 mb-2">
            <strong>Multiple Images Gallery:</strong> Cinematic browsing experience
          </p>
          <p className="text-sm text-gray-400">
            Browse your panoramic collection with smooth transitions in widescreen format.
          </p>
        </div>
        
        <MultipleImageViewer imageUrls={imageUrls} />
        
        <div className="bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-emerald-900/10 p-4 rounded-xl border border-emerald-500/20">
          <p className="text-sm text-gray-300">
            🖼️ <strong className="text-white">Image Gallery:</strong> Switch between single view and grid view for the perfect browsing experience.
          </p>
        </div>
      </div>
    );
  };

  const renderPhotoSphereViewer = () => {
    if (imageUrls.length === 0) return null;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Spherical 360° Panoramic Viewer
              </h3>
              <p className="text-sm text-purple-700 leading-relaxed">
                True spherical projection with smooth 360° navigation. Drag to look around, scroll to zoom—experience immersive panoramas like never before.
              </p>
            </div>
          </div>
        </div>
        
        <SphericalPanoramicViewer src={imageUrls[0]} />
      </div>
    );
  };

  const renderVideoViewer = () => {
    if (files.length === 0) return null;

    const videoUrl = URL.createObjectURL(files[0]);

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-rose-900/10 via-pink-900/10 to-rose-900/10 border border-rose-500/20 p-4 rounded-lg">
          <p className="text-gray-200 mb-2">
            <strong>Panoramic Video Player:</strong> Immersive cinematic experience
          </p>
          <p className="text-sm text-gray-400">
            Experience 360° video playback with full controls for a cinematic viewing experience.
          </p>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800">
          <video
            src={videoUrl}
            controls
            className="w-full aspect-[21/9] object-cover bg-black"
            onLoadStart={() => URL.revokeObjectURL(videoUrl)}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div className="bg-gradient-to-r from-rose-900/10 via-pink-900/10 to-rose-900/10 p-4 rounded-xl border border-rose-500/20">
          <p className="text-sm text-gray-300">
            🎬 <strong className="text-white">Cinematic Video:</strong> Enjoy panoramic video in widescreen format with smooth playback controls.
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
    <div className="w-full">
      {files.length > 0 ? (
        renderViewer()
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Files Uploaded</h3>
          <p className="text-gray-500">Upload panoramic content above to start viewing</p>
        </div>
      )}
    </div>
  );
}
