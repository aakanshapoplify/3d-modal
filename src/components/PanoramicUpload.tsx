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
        return "Upload multiple panoramic images";
      case "photo-sphere":
        return "Upload a single 360° panoramic image";
      case "video":
        return "Upload a panoramic video file";
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
      <div
        className={`group relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.02]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50"
        } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
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
          <div className="space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-16 h-16 border-4 border-blue-200 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-medium text-gray-700">Processing files...</p>
            <p className="text-sm text-gray-500">This will just take a moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300 ${
              isDragOver
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 scale-110 shadow-lg shadow-blue-500/50"
                : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100"
            }`}>
              <svg
                className={`w-10 h-10 transition-colors ${
                  isDragOver ? "text-white" : "text-gray-400 group-hover:text-blue-500"
                }`}
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
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragOver ? "Drop your files here" : "Drag & drop files here"}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                or click to browse from your device
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose Files
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">{getDescription()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
