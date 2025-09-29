"use client";
import { useState } from "react";
import PanoramicUpload from "@/components/PanoramicUpload";
import PanoramicViewer from "@/components/PanoramicViewer";

type PanoramicType = "images" | "photo-sphere" | "video";

export default function PanoramicViewPage() {
  const [panoramicType, setPanoramicType] = useState<PanoramicType>("images");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [viewerKey, setViewerKey] = useState(0);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
    setViewerKey(prev => prev + 1); // Force re-render of viewer
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Panoramic View</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Panoramic Type</h2>
        
        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">How to use:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Multiple Images:</strong> Upload several panoramic images and browse them in single or grid view</li>
            <li>• <strong>PhotoSphereViewer:</strong> Upload a single panoramic image for interactive 360° viewing</li>
            <li>• <strong>Video:</strong> Upload panoramic video files for playback</li>
          </ul>
        </div>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setPanoramicType("images")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              panoramicType === "images"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Multiple Images
          </button>
          <button
            onClick={() => setPanoramicType("photo-sphere")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              panoramicType === "photo-sphere"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Panoramic Viewer
          </button>
          <button
            onClick={() => setPanoramicType("video")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              panoramicType === "video"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Video
          </button>
        </div>

        <PanoramicUpload
          type={panoramicType}
          onFilesUploaded={handleFilesUploaded}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Panoramic Viewer</h2>
          <PanoramicViewer
            key={viewerKey}
            type={panoramicType}
            files={uploadedFiles}
          />
        </div>
      )}
    </div>
  );
}
