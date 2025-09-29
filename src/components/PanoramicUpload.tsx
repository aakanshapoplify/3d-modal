"use client";
import { useState, useRef } from "react";

type PanoramicType = "images" | "photo-sphere" | "video";

interface PanoramicUploadProps {
  type: PanoramicType;
  onFilesUploaded: (files: File[]) => void;
}

export default function PanoramicUpload({ type, onFilesUploaded }: PanoramicUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptTypes = () => {
    switch (type) {
      case "images":
        return "image/*";
      case "photo-sphere":
        return "image/*";
      case "video":
        return "video/*";
      default:
        return "*/*";
    }
  };

  const getMultipleFiles = () => {
    return type === "images";
  };

  const getDescription = () => {
    switch (type) {
      case "images":
        return "Upload multiple panoramic images (JPG, PNG, etc.)";
      case "photo-sphere":
        return "Upload a single panoramic image for PhotoSphereViewer (JPG, PNG)";
      case "video":
        return "Upload a panoramic video file (MP4, WebM, etc.)";
      default:
        return "Upload files";
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    if (type === "photo-sphere" && fileArray.length > 1) {
      alert("PhotoSphereViewer only supports a single image file.");
      return;
    }
    
    if (type === "video" && fileArray.length > 1) {
      alert("Please select only one video file.");
      return;
    }

    setUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      onFilesUploaded(fileArray);
      setUploading(false);
    }, 1000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600">{getDescription()}</p>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          multiple={getMultipleFiles()}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-600">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              {getAcceptTypes()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
