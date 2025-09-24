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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">3D Model Editor</h1>
          <p className="text-gray-600">Upload an .obj file or use the default model to test editing features.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 items-center mb-4">
            <button
              onClick={() => setUseDefaultModel(true)}
              className={`px-4 py-2 rounded ${
                useDefaultModel 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Use Default Model (for testing)
            </button>
            <span className="text-gray-500">or</span>
            <input 
              type="file" 
              accept=".obj" 
              onChange={onUpload}
              className="px-4 py-2 border rounded"
            />
          </div>
          {isConverting && <p className="text-sm text-gray-600 mt-2">Converting to GLB...</p>}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {/* Edit Mode Controls */}
        {(glbUrl || useDefaultModel) && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Model Controls</h3>
                <p className="text-sm text-gray-600">Manage your 3D model and editing features</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    editMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                </button>
              </div>
            </div>
            {editMode && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Edit Mode Active:</strong> Use the sidebar to upload furniture, change colors, and transform objects.
                </p>
              </div>
            )}
          </div>
        )}

        {(glbUrl || useDefaultModel) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:h-[calc(100vh-140px)]">
            {editMode && editControls && (
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-lg h-fit">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Edit Controls</h2>
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-lg"
                    >
                      ×
                    </button>
                  </div>
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
              <div className="bg-white p-0 rounded-none shadow-none overflow-hidden h-full">
                <ClientOnly fallback={<div className="w-full h-full flex items-center justify-center text-gray-500">Loading 3D Viewer...</div>}>
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
        )}
      </div>
    </div>
  );
}


