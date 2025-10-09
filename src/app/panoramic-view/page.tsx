"use client";
import { useState } from "react";
import PanoramicUpload from "@/components/PanoramicUpload";
import PanoramicViewer from "@/components/PanoramicViewer";

type PanoramicType = "images" | "photo-sphere" | "video";

export default function PanoramicViewPage() {
  const [panoramicType, setPanoramicType] = useState<PanoramicType>("photo-sphere");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [viewerKey, setViewerKey] = useState(0);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
    setViewerKey(prev => prev + 1);
  };

  const types = [
    {
      id: "photo-sphere" as PanoramicType,
      label: "360° Viewer",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50",
      description: "Immersive 360° panorama"
    },
    {
      id: "images" as PanoramicType,
      label: "Image Gallery",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      description: "Browse multiple images"
    },
    {
      id: "video" as PanoramicType,
      label: "Video Player",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-rose-500 to-pink-600",
      bgGradient: "from-rose-50 to-pink-50",
      description: "Play panoramic videos"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
            Panoramic Experience
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload and explore immersive panoramic content with our advanced viewer technology
          </p>
        </div>

        {/* Viewer Section - Cinematic Theater Experience */}
        {uploadedFiles.length > 0 && (
          <div className="mb-12 animate-slide-up">
            {/* Theater Mode Container */}
            <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-900">
              {/* Ambient Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none z-10"></div>
              
              {/* Viewer Content */}
              <div className="relative z-20">
                <PanoramicViewer
                  key={viewerKey}
                  type={panoramicType}
                  files={uploadedFiles}
                />
              </div>

              {/* Theater Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none z-30">
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                {/* Bottom Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                {/* Left Bar */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                {/* Right Bar */}
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-purple-500/50 rounded-tl-lg z-30"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-purple-500/50 rounded-tr-lg z-30"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-500/50 rounded-bl-lg z-30"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-500/50 rounded-br-lg z-30"></div>
            </div>

            {/* Theater Info Bar */}
            <div className="mt-4 flex items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Now Playing</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Cinematic Mode</span>
              </div>
            </div>
          </div>
        )}

        {/* Type Selection */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 mb-8 transition-all hover:shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></span>
            Choose Your Experience
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => setPanoramicType(type.id)}
                className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                  panoramicType === type.id
                    ? `bg-gradient-to-br ${type.bgGradient} border-2 shadow-lg scale-105`
                    : "bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-all ${
                    panoramicType === type.id
                      ? `bg-gradient-to-br ${type.gradient} text-white shadow-lg`
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  }`}>
                    {type.icon}
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                    panoramicType === type.id ? "text-gray-900" : "text-gray-700"
                  }`}>
                    {type.label}
                  </h3>
                  <p className={`text-sm transition-colors ${
                    panoramicType === type.id ? "text-gray-700" : "text-gray-500"
                  }`}>
                    {type.description}
                  </p>
                </div>
                {panoramicType === type.id && (
                  <div className="absolute top-4 right-4">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-lg`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <PanoramicUpload
            type={panoramicType}
            onFilesUploaded={handleFilesUploaded}
          />
        </div>
      </div>
    </div>
  );
}
