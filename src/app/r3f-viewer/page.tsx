"use client";
import { useState, useRef, useEffect } from "react";
import R3FViewer from "@/components/R3FViewer";
import EditControls from "@/components/EditControls";
import ClientOnly from "@/components/ClientOnly";

export default function R3FViewerPage() {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDefaultModel, setUseDefaultModel] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editControls, setEditControls] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".obj")) {
      setError("Please upload an .obj file; it will be converted to .glb");
      return;
    }
    setIsConverting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/obj-to-glb", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.details || data?.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setGlbUrl(url);
    } catch (err: any) {
      setError(err?.message || "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50">
      {/* Main Viewer */}
      {(glbUrl || useDefaultModel) && (
        <div className="relative h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-full">
            {editMode && editControls && (
              <div className="lg:col-span-1 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-6 sticky top-0 bg-white border-b border-gray-100 z-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Design Tools</h2>
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                      aria-label="Close edit panel"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Customize your architectural space</p>
                </div>
                <div className="p-6">
                  <EditControls
                    modelColor={editControls.modelColor}
                    setModelColor={editControls.setModelColor}
                    furnitureColor={editControls.furnitureColor}
                    setFurnitureColor={editControls.setFurnitureColor}
                    selectedFurniture={editControls.selectedFurniture}
                    setSelectedFurniture={editControls.setSelectedFurniture}
                    selectedFurnitureModel={editControls.selectedFurnitureModel}
                    setSelectedFurnitureModel={editControls.setSelectedFurnitureModel}
                    transformMode={editControls.transformMode}
                    setTransformMode={editControls.setTransformMode}
                    onDeleteSelectedFurniture={editControls.deleteSelectedFurniture}
                    onFurnitureUpload={editControls.handleFurnitureUpload}
                    onDeleteFurnitureModel={editControls.handleDeleteFurnitureModel}
                  />
                </div>
              </div>
            )}
            <div className={editMode ? "lg:col-span-3" : "lg:col-span-4"}>
              <div className="relative h-full bg-gradient-to-br from-gray-100 to-gray-50">
                <ClientOnly fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Loading 3D Viewer...</p>
                    </div>
                  </div>
                }>
                  <R3FViewer 
                    url={glbUrl || "/models/chair.glb"} 
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onEditControlsReady={setEditControls}
                  />
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header - Below Viewer */}
      {(glbUrl || useDefaultModel) && (
        <header className="relative overflow-hidden border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30" />
          <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-light tracking-tight text-gray-900">
                    Architectural <span className="font-semibold">Studio</span>
                  </h1>
                </div>
                <p className="text-gray-600 text-sm font-light max-w-2xl">
                  Immersive 3D visualization and spatial design platform for modern architecture
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setGlbUrl(null);
                    setUseDefaultModel(false);
                    setEditMode(false);
                    setError(null);
                  }}
                  className="group relative px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl bg-white text-gray-700 border-2 border-gray-200 hover:border-green-500 hover:text-green-600"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload New
                  </span>
                </button>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`group relative px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl ${
                    editMode 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Mode
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Mode
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Edit Mode Info */}
            {editMode && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">Edit Mode Active</h4>
                    <p className="text-gray-700 text-xs leading-relaxed">
                      Use the control panel to customize materials, place furniture, and transform objects in your 3D space.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Upload Section - Only shown when no model */}
      {!glbUrl && !useDefaultModel && (
        <header className="relative overflow-hidden border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30" />
          <div className="relative max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className="flex items-center gap-3 mb-3 justify-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-light tracking-tight text-gray-900">
                    Architectural <span className="font-semibold">Studio</span>
                  </h1>
                </div>
                <p className="text-gray-600 text-lg font-light max-w-2xl mx-auto">
                  Immersive 3D visualization and spatial design platform for modern architecture
                </p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <div 
                onClick={() => setUseDefaultModel(true)}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all duration-300 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Demo Model</h3>
                  <p className="text-gray-600 mb-4">Explore with our curated architectural showcase</p>
                  <div className="flex items-center text-blue-600 font-medium group-hover:gap-3 gap-2 transition-all">
                    Launch Demo
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 cursor-pointer border-2 border-dashed border-purple-300 hover:border-purple-500 transition-all duration-300 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Upload Model</h3>
                  <p className="text-gray-600 mb-4">Import your .OBJ file for instant visualization</p>
                  <div className="flex items-center text-purple-600 font-medium group-hover:gap-3 gap-2 transition-all">
                    Choose File
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".obj" 
                  onChange={onUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Status Messages */}
            {isConverting && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-blue-800 font-medium">Converting your model to GLB format...</p>
            </div>
          )}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          </div>
        </header>
      )}

      {/* Footer Info - Only shown when no model */}
      {!glbUrl && !useDefaultModel && (
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Immersive Views</h3>
              <p className="text-gray-600 text-sm">Navigate through spaces with orbit and first-person modes</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Design Tools</h3>
              <p className="text-gray-600 text-sm">Place furniture, adjust materials, and customize every detail</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Rendering</h3>
              <p className="text-gray-600 text-sm">Experience instant feedback with high-performance 3D graphics</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


