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
          className="w-full aspect-[21/9] object-cover rounded-2xl shadow-2xl transition-transform group-hover:scale-[1.02] border-2 border-gray-800"
        />
        
        {/* Image Counter */}
        <div className="absolute bottom-6 left-6 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl text-white px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
          <span className="font-semibold">{currentImageIndex + 1}</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-gray-300">{imageUrls.length}</span>
        </div>

        {/* Navigation Arrows */}
        {imageUrls.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex(prev => 
                prev === 0 ? imageUrls.length - 1 : prev - 1
              )}
              className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl text-white p-3 rounded-xl hover:scale-110 transition-all border border-white/10 shadow-2xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentImageIndex(prev => 
                prev === imageUrls.length - 1 ? 0 : prev + 1
              )}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl text-white p-3 rounded-xl hover:scale-110 transition-all border border-white/10 shadow-2xl"
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
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Previous</span>
          </button>
          <button
            onClick={() => setCurrentImageIndex(prev => 
              prev === imageUrls.length - 1 ? 0 : prev + 1
            )}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span className="font-medium">Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className={`px-6 py-3 rounded-xl transition-all font-medium ${
            viewMode === "single"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
              : "bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 border border-gray-700"
          }`}
        >
          Single View
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`px-6 py-3 rounded-xl transition-all font-medium ${
            viewMode === "grid"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
              : "bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 border border-gray-700"
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
