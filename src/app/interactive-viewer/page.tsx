"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the 3D viewer to avoid SSR issues
const Interactive3DViewer = dynamic(
  () => import("@/components/Interactive3DViewer"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-gray-700">Loading Interactive 3D Viewer...</p>
        </div>
      </div>
    )
  }
);

/**
 * InteractiveViewerPage
 * 
 * Demo page showcasing the Interactive3DViewer component
 * with model selection and full-screen 3D experience
 */
export default function InteractiveViewerPage() {
  // Available models
  const models = [
    { 
      name: "Floor Plan", 
      url: "/models/floor.glb",
      description: "Architectural floor plan with walls and floors"
    },
    { 
      name: "Building Model", 
      url: "/models/table.glb",
      description: "Sample building structure"
    },
  ];
  
  const [selectedModel, setSelectedModel] = useState(models[0].url);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Interactive 3D Building Viewer</h1>
                <p className="text-xs text-blue-200">Click walls & floors to customize colors</p>
              </div>
            </div>
          </div>
          
          {/* Model Selector Button */}
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all border border-white/20 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="font-medium">Change Model</span>
          </button>
        </div>
      </header>
      
      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="absolute top-20 right-6 z-30 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-5 duration-300">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
            <h3 className="text-white font-semibold text-lg">Select Building Model</h3>
            <p className="text-blue-100 text-sm mt-1">Choose a model to explore and customize</p>
          </div>
          
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {models.map((model) => (
              <button
                key={model.url}
                onClick={() => {
                  setSelectedModel(model.url);
                  setShowModelSelector(false);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedModel === model.url
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedModel === model.url
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{model.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                  </div>
                  {selectedModel === model.url && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 3D Viewer */}
      <div className="w-full h-full">
        <Interactive3DViewer 
          modelUrl={selectedModel}
          key={selectedModel} // Force remount on model change
        />
      </div>
      
      {/* Feature Highlights */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-xl max-w-md">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Key Features
        </h3>
        <ul className="space-y-2 text-sm text-blue-100">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Click any wall or floor to select and customize color</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Automatic detection of inner walls, outer walls, and floors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Full camera controls: orbit, zoom, and pan</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Realistic lighting with shadows and reflections</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            <span>Visual highlighting of selected surfaces</span>
          </li>
        </ul>
      </div>
      
      {/* Close overlay on outside click */}
      {showModelSelector && (
        <div 
          className="fixed inset-0 z-25 bg-black/20" 
          onClick={() => setShowModelSelector(false)}
        />
      )}
    </div>
  );
}
