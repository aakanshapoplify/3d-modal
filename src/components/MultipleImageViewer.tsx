"use client";
import { useState } from "react";

interface MultipleImageViewerProps {
  imageUrls: string[];
}

export default function MultipleImageViewer({ imageUrls }: MultipleImageViewerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");

  if (imageUrls.length === 0) return null;

  const renderSingleView = () => (
    <div className="space-y-4">
      {/* Image Navigation Dots */}
      <div className="flex justify-center space-x-2">
        {imageUrls.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentImageIndex ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Current Image */}
      <div className="relative group">
        <img
          src={imageUrls[currentImageIndex]}
          alt={`Panoramic image ${currentImageIndex + 1}`}
          className="w-full h-96 object-cover rounded-lg shadow-lg transition-transform group-hover:scale-105"
        />
        
        {/* Image Counter */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
          {currentImageIndex + 1} / {imageUrls.length}
        </div>

        {/* Navigation Arrows */}
        {imageUrls.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex(prev => 
                prev === 0 ? imageUrls.length - 1 : prev - 1
              )}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentImageIndex(prev => 
                prev === imageUrls.length - 1 ? 0 : prev + 1
              )}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      {imageUrls.length > 1 && (
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentImageIndex(prev => 
              prev === 0 ? imageUrls.length - 1 : prev - 1
            )}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>
          <button
            onClick={() => setCurrentImageIndex(prev => 
              prev === imageUrls.length - 1 ? 0 : prev + 1
            )}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <span>Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  const renderGridView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {imageUrls.map((url, index) => (
          <div
            key={index}
            className="relative group cursor-pointer"
            onClick={() => {
              setCurrentImageIndex(index);
              setViewMode("single");
            }}
          >
            <img
              src={url}
              alt={`Panoramic image ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg shadow-md transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-90 px-2 py-1 rounded text-sm font-medium">
                View
              </div>
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => setViewMode("single")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === "single"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Single View
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === "grid"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Grid View
        </button>
      </div>

      {/* Render based on view mode */}
      {viewMode === "single" ? renderSingleView() : renderGridView()}
    </div>
  );
}
